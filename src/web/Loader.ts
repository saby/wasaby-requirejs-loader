import getAllStaticDomains from '../main/getStaticsDomain';
import { IContents, IPatchedGlobal } from 'RequireJsLoader/wasaby';

type loadedCallback = (link: HTMLLinkElement) => void;
type TLoader<ReturnResult> = (
    url: string,
    timeout: number,
    customAttr?: Record<string, string>
) => Promise<ReturnResult>;

interface ITimeoutAbortSignalInfo {
    signal: AbortSignal;
    timeoutId?: number;
}

const NOT_FOUND_CODE = 404;
const ERROR_THRESHOLD = 10;
const ERROR_WINDOW_MS = 12000;
const LIFETIME_FALLBACK_COOKIE = 3600;
const TIME_OF_RELEVANCE_OF_CONTENTS = 86_400_000;

// @ts-ignore
const globalEnv: IPatchedGlobal = globalThis;
const loadingUrls: Map<string, Promise<void | string>> = new Map();
const loadedUrls: Set<string> = new Set();
const errorUrls: Map<string, unknown> = new Map();
const staticDomains = getAllStaticDomains();
const rootDomain = `//${location.host}`;
let lastCheckContents = Date.now();
let actualContents: IContents;

const errorState: Map<string, Set<number>> = new Map();

for (const domain of staticDomains) {
    errorState.set(domain, new Set());
}

const callbacksForResourcesBlock: Map<number, () => Promise<unknown>> = new Map();
let nextResourcesBlock = 0;
let isProcessingResourcesBlock = false;

function processNextResourcesBlock() {
    const callback = callbacksForResourcesBlock.get(nextResourcesBlock);

    if (!callback) {
        isProcessingResourcesBlock = false;

        return;
    }

    callbacksForResourcesBlock.delete(nextResourcesBlock);

    setTimeout(async function () {
        await callback();
        nextResourcesBlock++;
        processNextResourcesBlock();
    }, 0);
}

function registryResourceInBlock(blockId: number) {
    const resourcesBlock = globalEnv.resourcesBlock?.get(blockId);

    if (!resourcesBlock) {
        return;
    }

    resourcesBlock.count = resourcesBlock.count - 1;

    if (resourcesBlock.count > 0) {
        return;
    }

    globalEnv.resourcesBlock?.delete(blockId);

    const requireListFn = () => {
        return new Promise((resolve, reject) => {
            require(resourcesBlock.rootModules, function () {
                resolve(true);
            }, function (err: Error) {
                /* eslint-disable-next-line no-console */
                console.error(err);
                reject(err);
            });
        });
    };

    callbacksForResourcesBlock.set(blockId, requireListFn);

    if (isProcessingResourcesBlock) {
        return;
    }

    isProcessingResourcesBlock = true;

    processNextResourcesBlock();
}

function showModalForcedPageReload(message: string) {
    const modal = document.getElementById('stale-reload-modal');

    if (modal) {
        modal.style.display = 'flex';
        return;
    }

    // 1. Создаём главный блок (один элемент, который будем вставлять)
    const overlay = document.createElement('div');
    overlay.id = 'stale-reload-modal';
    overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2147483647;
    padding: 20px;
    box-sizing: border-box;
  `;

    // 2. Контейнер по центру
    const box = document.createElement('div');
    box.style.cssText = `
    background: #fff;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    max-width: 400px;
    width: 100%;
    text-align: center;
  `;

    // 3. Текст (безопасно: textContent экранирует всё)
    const text = document.createElement('p');
    text.textContent = message; // если в message есть <script>, он не выполнится
    text.style.margin = '0 0 20px 0';
    text.style.color = '#333';

    // 4. Кнопка
    const btn = document.createElement('button');
    btn.textContent = 'Перезагрузить';
    btn.style.cssText = `
    padding: 12px 24px;
    border: none;
    background: #0d6efd;
    color: #fff;
    border-radius: 6px;
    cursor: pointer;
  `;
    btn.addEventListener(
        'click',
        () => {
            overlay.remove();
            location.reload();
        },
        { once: true }
    );

    // Собираем
    box.appendChild(text);
    box.appendChild(btn);
    overlay.appendChild(box);

    // Вставляем ровно один элемент в body
    document.body.appendChild(overlay);
}

function checkFallbackCondition(domain: string): boolean {
    const now = Date.now();
    const timestamps = errorState.get(domain);

    if (!timestamps) {
        return false;
    }

    // Удаляем старые отметки (старше 12 сек)
    for (const time of timestamps) {
        if (now - time < ERROR_WINDOW_MS) {
            timestamps.delete(time);
        }
    }

    timestamps.add(now);

    return timestamps.size > ERROR_THRESHOLD;
}

function isCrossOriginUrl(url: string) {
    return !url.includes(rootDomain);
}

function createTimeoutAbortSignal(timeout: number): ITimeoutAbortSignalInfo {
    if (typeof AbortSignal.timeout === 'function') {
        return { signal: AbortSignal.timeout(timeout) };
    } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeout);

        return { signal: controller.signal, timeoutId };
    }
}

function createTimeoutAbortPromise(timeout: number, targetPromise: Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
        const { signal, timeoutId } = createTimeoutAbortSignal(timeout);
        const onAbort = () => {
            reject(new Error(`The process timed out ${timeout} ms.`));
        };
        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            signal.removeEventListener('abort', onAbort);
        };

        signal.addEventListener('abort', onAbort, { once: true });

        targetPromise.then(resolve).catch(reject).finally(cleanup);
    });
}

async function getActualContentsVersion(): Promise<string> {
    const response = await fetch('/?psversion');

    if (response.ok) {
        return response.text();
    }

    return '';
}

async function loadActualContents(): Promise<IContents> {
    const url = globalEnv.requirejs.instance.buildUrl('contents', 'json').replace('.min.', '.');

    const response = await fetch(url);

    if (response.ok) {
        return response.json();
    }

    return globalEnv.contents as IContents;
}

async function contentsIsActual() {
    if (Date.now() - lastCheckContents > TIME_OF_RELEVANCE_OF_CONTENTS) {
        const actualVersion = await getActualContentsVersion();

        lastCheckContents = Date.now();

        if (globalEnv.contents?.buildnumber !== actualVersion) {
            actualContents = await loadActualContents();

            return false;
        }

        return true;
    }

    return globalEnv.contents?.buildnumber === actualContents.buildnumber;
}

async function pingFileWithActualVersion(moduleUrl: string, timeout: number): Promise<void> {
    const url = new URL(moduleUrl, location.href);
    const req = globalEnv.requirejs.instance;
    const rootDir = req.getRootDir(req.getModulePathFromUrl(url));
    const actualBuildnumber = actualContents.modules?.[rootDir]?.buildnumber;

    if (!actualBuildnumber || actualBuildnumber === url.searchParams.get('x_module')) {
        return;
    }

    url.searchParams.set('x_module', actualBuildnumber);

    return pingUrl(url.toString(), timeout);
}

async function pingUrl(url: string, timeout: number): Promise<void> {
    const { signal } = createTimeoutAbortSignal(timeout);
    const mode = isCrossOriginUrl(url) ? 'cors' : 'no-cors';
    let response: Response;

    try {
        response = await fetch(url, {
            method: 'HEAD',
            mode,
            signal,
        });
    } catch (err) {
        throw new FetchError(undefined, err as Error);
    }

    if (!response.ok) {
        throw new FetchError(response);
    }
}

async function convertToFetchError(
    error: unknown,
    url: string,
    timeout: number
): Promise<FetchError> {
    if (FetchError.isFetchError(error)) {
        return error;
    }

    try {
        await pingUrl(url, timeout);
    } catch (err) {
        return err as FetchError;
    }

    return new FetchError();
}

async function loadWithFallback<ReturnType = void>(
    link: string,
    timeout: number,
    loader: TLoader<ReturnType>,
    error: Error | ErrorEvent
): Promise<ReturnType> {
    const url = new URL(link, location.href);
    const currentNumber = staticDomains.indexOf(url.host);

    if (currentNumber === -1 || location.host === url.host) {
        const err = await convertToFetchError(error, url.toString(), timeout);

        if (err.code === NOT_FOUND_CODE) {
            if (await contentsIsActual()) {
                throw err;
            }

            try {
                await pingFileWithActualVersion(link, timeout);
            } catch (_err) {
                throw err;
            }

            globalEnv.requirejs.instance.downloadBlocked =
                'Due to an outdated contents.js, requests for static content with 404 response codes were recorded.';

            showModalForcedPageReload(
                'Из‑за устаревания страницы возникла проблема. Перезагрузите страницу для корректной работы.'
            );
        }

        throw err;
    }

    const numCdnDomain = currentNumber + 1;

    if (checkFallbackCondition(url.host)) {
        document.cookie = `res_loader_cdn_idx=${numCdnDomain}; max-age=${LIFETIME_FALLBACK_COOKIE}; path=/`;

        globalEnv.requirejs.instance.currentNumberDomain = numCdnDomain;
    }

    url.host = staticDomains[numCdnDomain] || location.host;

    //@ts-ignore
    const dataset: Record<string, string> | undefined = error.target?.dataset;

    return loader(url.href, timeout, dataset);
}

function subscribeDownload(url: string, node: HTMLLinkElement, callback?: loadedCallback) {
    return new Promise<void>((resolve, reject) => {
        const fullUrl = new URL(url, location.href).href;

        node.addEventListener('load', () => {
            loadedUrls.add(fullUrl);

            if (callback) {
                callback(node);
            }

            resolve();
        });
        node.addEventListener('error', (err) => {
            errorUrls.set(fullUrl, err);

            reject(err);
        });
    });
}

function processLinks(links: HTMLLinkElement[], callback: loadedCallback) {
    for (const link of links) {
        if (link.tagName !== 'LINK') {
            continue;
        }

        const url = link.href;

        if (!url) {
            continue;
        }

        if (link.sheet) {
            loadedUrls.add(url);
            callback(link);

            continue;
        }

        if (!loadingUrls.has(url)) {
            loadingUrls.set(url, subscribeDownload(url, link, callback));
        }
    }
}

function tagLink(url: string, timeout: number): Promise<void> {
    const fullUrl = new URL(url, location.href).href;

    if (loadedUrls.has(fullUrl)) {
        return Promise.resolve();
    }

    if (errorUrls.has(fullUrl)) {
        return Promise.reject(errorUrls.get(fullUrl));
    }

    const cachePromise = loadingUrls.get(fullUrl);

    if (cachePromise) {
        return cachePromise as Promise<void>;
    }

    const node = document.createElement('link');

    node.rel = 'stylesheet';
    node.href = url;

    if (isCrossOriginUrl(url)) {
        node.crossOrigin = 'anonymous';
    }

    const promise = createTimeoutAbortPromise(timeout, subscribeDownload(url, node));
    const fallbackPromise = promise
        .catch((err) => {
            return loadWithFallback(url, timeout, tagLink, err);
        })
        .finally(() => {
            loadingUrls.delete(fullUrl);
        });

    document.head.appendChild(node);

    return fallbackPromise;
}

function tagScript(
    url: string,
    timeout: number,
    customAttr?: Record<string, string>
): Promise<void> {
    const fullUrl = new URL(url, location.href).href;
    const cachePromise = loadingUrls.get(fullUrl);

    if (cachePromise) {
        return cachePromise as Promise<void>;
    }

    const loadPromise = new Promise<void>((resolve, reject) => {
        const node = document.createElement('script');

        node.type = 'text/javascript';
        node.async = true;
        node.src = url;

        if (customAttr) {
            for (const [name, value] of Object.entries(customAttr)) {
                node.dataset[name] = value;
            }
        }

        if (isCrossOriginUrl(url)) {
            node.crossOrigin = 'anonymous';
        }

        node.addEventListener('load', () => {
            if (node.dataset.rid !== undefined) {
                registryResourceInBlock(Number(node.dataset.rid));
            }

            node.remove();
            resolve();
        });
        node.addEventListener('error', (err) => {
            node.remove();
            reject(err);
        });

        document.head.appendChild(node);
    });
    return createTimeoutAbortPromise(timeout, loadPromise)
        .catch((err) => {
            return loadWithFallback(url, timeout, tagScript, err);
        })
        .then(() => {
            const error = errorUrls.get(fullUrl) as Error;

            if (error) {
                errorUrls.delete(url);

                throw error;
            }
        })
        .finally(() => {
            loadingUrls.delete(fullUrl);
        });
}

async function fetchLoader(url: string, timeout: number): Promise<string> {
    const mode = isCrossOriginUrl(url) ? 'cors' : 'no-cors';
    const { signal } = createTimeoutAbortSignal(timeout);
    let response: Response;

    try {
        response = await fetch(url, {
            mode,
            signal,
        });
    } catch (err) {
        return loadWithFallback<string>(
            url,
            timeout,
            fetchLoader,
            new FetchError(undefined, err as Error)
        );
    }

    if (!response.ok) {
        return loadWithFallback<string>(url, timeout, fetchLoader, new FetchError(response));
    }

    return response.text();
}

class FetchError extends Error {
    code: number | undefined;
    status: string | undefined;
    type: string;

    constructor(response?: Response, error?: Error) {
        super(error?.message);

        if (response && !error) {
            this.type = 'HTTP ERROR';
        } else if (!response || error) {
            if (error?.name === 'TypeError') {
                this.type = 'Network/CORS/browser';
            }
            if (error?.name === 'AbortError') {
                this.type = 'Timeout';
            }
        } else {
            this.type = 'Unexpected error';
        }

        this.name = 'FetchError';
        this.code = response?.status;
        this.status = response?.statusText;
        this.message = this.buildMessage();
    }

    static isFetchError(err: unknown): err is FetchError {
        return err instanceof FetchError;
    }

    buildMessage() {
        if (this.code === NOT_FOUND_CODE) {
            return `File not found. HTTP code: ${this.code}`;
        }

        if (this.type === 'Unexpected error') {
            return `Unexpected error: All attempts to load the file failed, but the HEAD request was successful. Possibly blocked by the browser.`;
        }

        const code = this.code ? `HTTP code: ${this.code}\n` : '';
        const status = this.status ? `statusText: ${this.status}\n` : '';

        return `${this.type}\n${code}${status}`;
    }
}

export default class Loader {
    timeout: number;

    constructor(timeout: number) {
        this.timeout = timeout;

        actualContents = globalEnv.contents as IContents;

        window.addEventListener('error', this.processError.bind(this));

        window.removeEventListener('error', globalEnv.onErrorRequireRegistry, true);
        window.removeEventListener('error', globalEnv.onErrorHandler, true);

        if (globalEnv.loadedScriptsFromBlock) {
            globalEnv.ols = (script: HTMLScriptElement) => {
                if (script.dataset.rid) {
                    registryResourceInBlock(Number(script.dataset.rid));
                }
            };

            for (const blocId of globalEnv.loadedScriptsFromBlock) {
                registryResourceInBlock(blocId);
            }

            globalEnv.loadedScriptsFromBlock = undefined;
        }

        if (globalEnv.preRegistryErrors) {
            for (const error of globalEnv.preRegistryErrors) {
                this.processError(error);
            }

            globalEnv.preRegistryErrors.clear();
        }
    }

    processError(event: ErrorEvent) {
        if (event.target instanceof HTMLLinkElement) {
            const url = event.target.href;

            if (!loadingUrls.has(url)) {
                loadingUrls.set(url, loadWithFallback(url, this.timeout, tagLink, event));
            }
        }

        if (event.target instanceof HTMLScriptElement) {
            const { message, filename, lineno, colno, error } = event;

            if (filename && error) {
                if (message?.includes('SyntaxError')) {
                    error.message = `SyntaxError: ${message};  LINE: ${lineno}: COLUM: ${colno}}`;
                }

                errorUrls.set(filename, error);
            } else {
                const url = event.target.src;

                if (!loadingUrls.has(url)) {
                    const loadPromise = loadWithFallback(url, this.timeout, tagScript, event);

                    if (event.target.onload) {
                        loadPromise.then(() => {
                            globalEnv.onloadScript?.(event.target as HTMLScriptElement);
                        });
                    }

                    loadingUrls.set(url, loadPromise);
                }
            }
        }
    }

    detectLinks(callback: loadedCallback) {
        processLinks(Array.from(document.head.children) as HTMLLinkElement[], callback);

        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                processLinks(Array.from(mutation.addedNodes) as HTMLLinkElement[], callback);
            }
        });

        observer.observe(document.head, { childList: true });
    }

    script(url: string): Promise<void> {
        return tagScript(url, this.timeout);
    }

    link(url: string): Promise<void> {
        return tagLink(url, this.timeout);
    }

    fetch(url: string): Promise<string> {
        return fetchLoader(url, this.timeout);
    }
}
