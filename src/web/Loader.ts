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

// @ts-ignore
const globalEnv: IPatchedGlobal = globalThis;

const NOT_FOUND_CODE = 404;
const ERROR_THRESHOLD = 10;
const ERROR_WINDOW_MS = 12000;
export const LIFETIME_FALLBACK_COOKIE = 3600;
globalEnv.TIME_OF_RELEVANCE_OF_CONTENTS = 86_400_000;
const REQUIRE_PATH = 'RequireJsLoader/third-party/WebRequire';

const loadingUrls: Map<string, Promise<void | string>> = new Map();
const loadedUrls: Set<string> = new Set();
const errorUrls: Map<string, unknown> = new Map();
const staticDomains = getAllStaticDomains();
const rootDomain = `//${location.host}`;
let lastCheckContents = Date.now();
let actualContents: IContents;
const scriptsWithHandlers = new WeakSet<HTMLScriptElement | HTMLLinkElement>();

const errorState: Map<string, Set<number>> = new Map();

for (const domain of staticDomains) {
    errorState.set(domain, new Set());
}

let nextResourcesBlock = 1;
let isProcessingResourcesBlock = false;

function processNextResourcesBlock() {
    if (isProcessingResourcesBlock) {
        return;
    }

    const callback = globalEnv.callbacksForResourcesBlock.get(nextResourcesBlock);

    if (!callback) {
        isProcessingResourcesBlock = false;

        return;
    }

    isProcessingResourcesBlock = true;

    globalEnv.callbacksForResourcesBlock.delete(nextResourcesBlock);

    setTimeout(async function () {
        await callback();
        isProcessingResourcesBlock = false;
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

    globalEnv.callbacksForResourcesBlock.set(blockId, requireListFn);

    processNextResourcesBlock();
}

function showErrorDialog(message: string, buttonText: string = 'ОК', onConfirm: () => void) {
    // Удаляем старые экземпляры, если они ещё висят
    const existingDialog = document.getElementById('custom-alert-dialog');
    const existingOverlay = document.getElementById('custom-alert-overlay');
    if (existingDialog) existingDialog.remove();
    if (existingOverlay) existingOverlay.remove();

    // 1. Затемняющий overlay — блокирует взаимодействие со страницей
    const overlay = document.createElement('div');
    overlay.id = 'custom-alert-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1999;
  `;

    // 2. Сам диалог (контейнер вместо нативного <dialog>)
    const dialog = document.createElement('div');
    dialog.id = 'custom-alert-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-labelledby', 'confirmation-message');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2000;
      box-sizing: border-box;
      width: 350px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 32px);
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 8px;
      overflow: auto;
      background: #fff;
      box-shadow: 0 0 46px rgba(0, 0, 0, 0.12), 0 0 15px rgba(0, 0, 0, 0.12);
      color: #000;
      font-family: "Inter", "Twemoji Mozilla", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", sans-serif;
      font-size: 14px;
      line-height: normal;
      letter-spacing: -0.1974px;
      text-align: left;
  `;

    // 3. Внутренний контейнер с градиентным фоном
    const inner = document.createElement('div');
    inner.style.cssText = `
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      border-radius: 8px;
      background-color: rgba(220, 34, 25, 0.08);
      background-image: radial-gradient(210% 260% at 25% -15%, rgb(255, 255, 255) 0, rgba(255, 255, 255, 0) 100%);
  `;

    // 4. Красный индикатор-полоска сверху
    const indicatorWrap = document.createElement('div');
    indicatorWrap.style.cssText = 'display: flex; flex-shrink: 0;';

    const indicator = document.createElement('div');
    indicator.setAttribute('aria-hidden', 'true');
    indicator.style.cssText = `
      width: 40px;
      height: 3px;
      min-height: 3px;
      margin: 20px auto;
      border-radius: 24px;
      background: #dc2219;
  `;
    indicatorWrap.appendChild(indicator);
    inner.appendChild(indicatorWrap);

    // 5. Заголовок «Сайт был обновлён»
    const titleEl = document.createElement('div');
    titleEl.textContent = 'Сайт был обновлен';
    titleEl.style.cssText = `
      box-sizing: border-box;
      margin-bottom: 8px;
      color: #000;
      font-size: 18px;
      line-height: 24px;
      letter-spacing: -0.1974px;
      text-align: center;
  `;
    inner.appendChild(titleEl);

    // 6. Текст ошибки (основной блок)
    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'box-sizing: border-box; padding: 0 24px 24px;';

    const textEl = document.createElement('div');
    textEl.id = 'confirmation-message';
    textEl.textContent = message;
    textEl.style.cssText = `
      margin: 0;
      padding: 0;
      color: #656C87;
      font-size: 15px;
      line-height: 20px;
      letter-spacing: -0.1974px;
      text-align: center;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
  `;
    textWrap.appendChild(textEl);
    inner.appendChild(textWrap);

    // 7. Кнопка
    const formWrap = document.createElement('div');
    formWrap.style.cssText = `
      display: flex;
      flex-shrink: 0;
      align-items: baseline;
      justify-content: center;
      margin: 0;
      padding: 0 24px 24px;
      border: 0;
  `;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = buttonText;
    btn.style.cssText = `
      appearance: none;
      display: inline-block;
      box-sizing: border-box;
      min-width: 86px;
      height: 24px;
      width: 126.05px;
      margin: 0;
      padding: 0 12px;
      border: 0.8px solid #F88F62;
      border-radius: 100px;
      background: #fff;
      box-shadow: none;
      color: #000;
      font-family: "Inter", "Twemoji Mozilla", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", sans-serif;
      font-size: 14px;
      font-weight: 400;
      line-height: 22.4px;
      letter-spacing: -0.1974px;
      text-align: center;
      white-space: nowrap;
      cursor: pointer;
  `;

    btn.addEventListener(
        'click',
        () => {
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
            overlay.remove();
            dialog.remove();
        },
        { once: true }
    );

    formWrap.appendChild(btn);
    inner.appendChild(formWrap);

    // Сборка
    dialog.appendChild(inner);
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    btn.focus();
}

function checkFallbackCondition(domain: string): boolean {
    const now = Date.now();
    const timestamps = errorState.get(domain);

    if (!timestamps) {
        return false;
    }

    // Удаляем старые отметки (старше 12 сек)
    for (const time of timestamps) {
        if (now - time > ERROR_WINDOW_MS) {
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
    if (Date.now() - lastCheckContents > globalEnv.TIME_OF_RELEVANCE_OF_CONTENTS) {
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

async function pingFileWithActualVersion(
    moduleUrl: string,
    timeout: number,
    err: FetchError
): Promise<void> {
    const url = new URL(moduleUrl, location.href);
    const req = globalEnv.requirejs.instance;
    const rootDir = req.getRootDir(req.getModulePathFromUrl(url));
    const actualBuildnumber = actualContents.modules?.[rootDir]?.buildnumber;

    if (!actualBuildnumber || actualBuildnumber === url.searchParams.get('x_module')) {
        throw err;
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
                await pingFileWithActualVersion(link, timeout, err);
            } catch (_err) {
                throw err;
            }

            globalEnv.requirejs.instance.downloadBlocked =
                'Download is blocked. Due to an outdated contents.js, requests for static content with 404 response codes were recorded.';

            showErrorDialog('Страницу необходимо перезагрузить', 'Перезагрузить', () =>
                location.reload()
            );
        }

        throw err;
    }

    const numCdnDomain = currentNumber + 1;
    const isCdnActual = globalEnv.requirejs.instance.currentNumberDomain === currentNumber;

    if (isCdnActual && checkFallbackCondition(url.host)) {
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

    scriptsWithHandlers.add(node);
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

        scriptsWithHandlers.add(node);
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

        window.removeEventListener('error', globalEnv.onErrorRequireRegistry, true);
        window.addEventListener('error', (event) => this.processError(event), true);

        const callbacksForResourcesBlock = globalEnv.callbacksForResourcesBlock || new Map();

        // Такой способо нужен, чтобы точно обспечить все кейсы.
        // Когда регистрация нового обрабочика происходит после того как прошла обработка очереди,
        // она зависает навсегда, потому не кому её толкнуть.
        //@ts-ignore
        globalEnv.callbacksForResourcesBlock = {
            set(key, value) {
                callbacksForResourcesBlock.set(key, value);
                //Толкаем орередь, если зарегали новый обработчик
                processNextResourcesBlock();

                return callbacksForResourcesBlock;
            },
            get(key) {
                return callbacksForResourcesBlock.get(key);
            },
            delete(key) {
                return callbacksForResourcesBlock.delete(key);
            },
        };

        if (globalEnv.loadedScriptsFromBlock) {
            // TODO Я сам вещаю обработчик onscript на тег, я могу передать сюда сразу вместо script, номер пачки, тогда можно будет вообще спилить атрибут data-rid.
            //  Единственое, если это понадобиться и для обработчика ошибок, тогда убрать не получится и как его прокинуть, если пойдёт запрос на резервный cdn?
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
                // У require свой обработчик ошибки и своя логика fallback,
                // если мы дошли до того кода, значит она сработало и не надо обрабатывать его.
                if (
                    error.target instanceof HTMLScriptElement &&
                    error.target.src.includes(REQUIRE_PATH)
                ) {
                    continue;
                }

                this.processError(error);
            }

            globalEnv.preRegistryErrors.clear();
        }
    }

    processError(event: ErrorEvent) {
        if (event.target instanceof HTMLLinkElement) {
            if (scriptsWithHandlers.has(event.target)) {
                return;
            }

            const url = event.target.href;

            if (!loadingUrls.has(url)) {
                loadingUrls.set(url, loadWithFallback(url, this.timeout, tagLink, event));
            }

            return;
        }

        if (event.target instanceof HTMLScriptElement) {
            if (scriptsWithHandlers.has(event.target)) {
                return;
            }

            const url = event.target.src;

            if (!loadingUrls.has(url)) {
                const loadPromise = loadWithFallback(url, this.timeout, tagScript, event);

                loadingUrls.set(url, loadPromise);
            }

            return;
        }

        const { message, filename, lineno, colno, error } = event;

        if (filename && error) {
            if (message?.includes('SyntaxError')) {
                error.message = `SyntaxError: ${message};  LINE: ${lineno}: COLUM: ${colno}`;
            }

            errorUrls.set(filename, error);
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
