import getAllStaticDomains from '../main/getStaticsDomain';
import { IContents, IPatchedGlobal } from 'RequireJsLoader/wasaby';
import showErrorDialog from './showErrorDialog';

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
const ERROR_WINDOW_MS = 5000;
export const LIFETIME_FALLBACK_COOKIE = 3600;
globalEnv.TIME_OF_RELEVANCE_OF_CONTENTS = 86_400_000;

const loadingUrls: Map<string, Promise<void | string>> = new Map();
const loadedUrls: Set<string> = new Set();
const errorUrls: Map<string, unknown> = new Map();
const staticDomains = getAllStaticDomains();
const rootDomain = `//${location.host}`;
let lastCheckContents = Date.now();
let actualContents: IContents;
const scriptsWithHandlers = new WeakSet<HTMLScriptElement | HTMLLinkElement>();
const registryRidUrl = new Set();

const errorState: Map<string, Set<number>> = new Map();

for (const domain of staticDomains) {
    errorState.set(domain, new Set());
}

let nextResourcesBlock = 1;
let isProcessingResourcesBlock = false;

function isOwnRequireResource(script: HTMLScriptElement): boolean {
    const id = script.id;

    return id === 'WebRequire' || id === 'contents';
}

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

async function prepareError(
    error: Error | ErrorEvent,
    url: string,
    timeout: number
): Promise<FetchError> {
    const err = await convertToFetchError(error, url, timeout);

    if (err.code === NOT_FOUND_CODE) {
        if (await contentsIsActual()) {
            throw err;
        }

        try {
            await pingFileWithActualVersion(url, timeout, err);
        } catch (_err) {
            throw err;
        }

        globalEnv.requirejs.instance.downloadBlocked =
            'Download is blocked. Due to an outdated contents.js, requests for static content with 404 response codes were recorded.';

        showErrorDialog('Страницу необходимо перезагрузить', 'Перезагрузить', () =>
            location.reload()
        );
    }

    return err;
}

async function loadWithFallback<ReturnType = void>(
    link: string,
    timeout: number,
    loader: TLoader<ReturnType>,
    error: Error | ErrorEvent,
    target?: HTMLElement
): Promise<ReturnType> {
    const url = new URL(link, location.href);
    const currentNumber = staticDomains.indexOf(url.host);

    if (currentNumber === -1 || location.host === url.host) {
        throw await prepareError(error, url.toString(), timeout);
    }

    const numCdnDomain = currentNumber + 1;
    const isCdnActual = globalEnv.requirejs.instance.currentNumberDomain === currentNumber;

    if (isCdnActual && checkFallbackCondition(url.host)) {
        if (staticDomains.length === numCdnDomain) {
            throw await prepareError(error, url.toString(), timeout);
        }

        const domains = staticDomains.join('&');
        document.cookie = `res_loader_cdn_idx=${numCdnDomain}:::${domains}; max-age=${LIFETIME_FALLBACK_COOKIE}; path=/`;

        globalEnv.requirejs.instance.currentNumberDomain = numCdnDomain;
    }

    url.host = staticDomains[numCdnDomain] || location.host;

    //@ts-ignore
    const dataset: Record<string, string> | undefined = target?.dataset;

    target?.remove();

    return loader(url.href, timeout, dataset);
}

async function subscribeDownloadLink(
    url: string,
    node: HTMLLinkElement,
    timeout: number,
    callback?: loadedCallback
): Promise<void> {
    const loadPromise = new Promise<void>((resolve, reject) => {
        node.addEventListener('load', () => {
            loadedUrls.add(url);

            if (callback) {
                callback(node);
            }

            resolve();
        });
        node.addEventListener('error', (err) => {
            errorUrls.set(url, err);

            reject(err);
        });

        scriptsWithHandlers.add(node);
    });

    try {
        try {
            await createTimeoutAbortPromise(timeout, loadPromise);
        } catch (err: any) {
            await loadWithFallback(url, timeout, tagLink, err, node);
        }
    } finally {
        loadingUrls.delete(url);
    }
}

async function subscribeDownloadScript(
    url: string,
    node: HTMLScriptElement,
    timeout: number
): Promise<void> {
    const loadPromise = new Promise<void>((resolve, reject) => {
        node.addEventListener('load', () => {
            if (node.dataset.rid !== undefined && !registryRidUrl.has(url)) {
                registryResourceInBlock(Number(node.dataset.rid));
                registryRidUrl.add(url);
            }

            loadedUrls.add(url);
            resolve();
        });
        node.addEventListener('error', (err) => {
            reject(err);
        });

        scriptsWithHandlers.add(node);
    });

    try {
        try {
            await createTimeoutAbortPromise(timeout, loadPromise);
        } catch (err) {
            await loadWithFallback(url, timeout, tagScript, err as Error, node);
        }

        const error = errorUrls.get(url) as Error;

        if (error) {
            errorUrls.delete(url);

            throw error;
        }
    } finally {
        loadingUrls.delete(url);
    }
}

function startTrackingLink(link: HTMLLinkElement, timeout: number, callback: loadedCallback): void {
    const url = link.href;

    if (!url) {
        return;
    }

    // Следим только за css, шрифты и картинки,
    // если они упали и так перезапросяться от файла, который их запросил.
    if (link.rel !== 'stylesheet') {
        return;
    }

    if (link.sheet) {
        loadedUrls.add(url);
        callback(link);

        return;
    }

    if (!loadingUrls.has(url)) {
        loadingUrls.set(url, subscribeDownloadLink(url, link, timeout, callback));
    }
}

function startTrackingScript(script: HTMLScriptElement, timeout: number): void {
    const url = script.src;

    if (!url) {
        return;
    }

    if (loadedUrls.has(url) || isOwnRequireResource(script)) {
        return;
    }

    if (!loadingUrls.has(url)) {
        loadingUrls.set(url, subscribeDownloadScript(url, script, timeout));
    }
}

function startTrackingResource(
    links: (HTMLLinkElement | HTMLScriptElement)[],
    timeout: number,
    callback: loadedCallback
): void {
    for (const link of links) {
        if (link.tagName === 'LINK') {
            startTrackingLink(link as HTMLLinkElement, timeout, callback);
        }

        if (link.tagName === 'SCRIPT') {
            startTrackingScript(link as HTMLScriptElement, timeout);
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

    const loadPromise = subscribeDownloadLink(fullUrl, node, timeout);

    loadingUrls.set(fullUrl, loadPromise);
    document.head.appendChild(node);

    return loadPromise;
}

function tagScript(
    url: string,
    timeout: number,
    customAttr?: Record<string, string>
): Promise<void> {
    const fullUrl = new URL(url, location.href).href;
    const cachePromise = loadingUrls.get(fullUrl);

    if (loadedUrls.has(fullUrl)) {
        return Promise.resolve();
    }

    if (cachePromise) {
        return cachePromise as Promise<void>;
    }

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

    const loadPromise = subscribeDownloadScript(fullUrl, node, timeout);

    loadingUrls.set(fullUrl, loadPromise);
    document.head.appendChild(node);

    return loadPromise;
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
            globalEnv.ols = (script: HTMLScriptElement) => {
                if (script.dataset.rid && !registryRidUrl.has(script.src)) {
                    registryResourceInBlock(Number(script.dataset.rid));
                    registryRidUrl.add(script.src);
                }

                loadedUrls.add(script.src);
            };

            for (const script of globalEnv.loadedScriptsFromBlock) {
                if (script.dataset.rid && !registryRidUrl.has(script.src)) {
                    registryResourceInBlock(Number(script.dataset.rid));
                    registryRidUrl.add(script.src);
                }

                loadedUrls.add(script.src);
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
            if (scriptsWithHandlers.has(event.target)) {
                return;
            }

            const url = event.target.href;

            if (!loadingUrls.has(url)) {
                loadingUrls.set(
                    url,
                    loadWithFallback(url, this.timeout, tagLink, event, event.target)
                );
            }

            return;
        }

        if (event.target instanceof HTMLScriptElement) {
            const script = event.target;

            // У require свой обработчик ошибки и своя логика fallback,
            // если мы дошли до того кода, значит она сработало и не надо обрабатывать его.
            if (scriptsWithHandlers.has(script) || isOwnRequireResource(script)) {
                return;
            }

            const url = script.src;

            if (!loadingUrls.has(url)) {
                const loadPromise = loadWithFallback(url, this.timeout, tagScript, event, script);

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
        startTrackingResource(
            Array.from(document.head.children) as HTMLLinkElement[],
            this.timeout,
            callback
        );

        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                startTrackingResource(
                    Array.from(mutation.addedNodes) as HTMLLinkElement[],
                    this.timeout,
                    callback
                );
            }
        });

        observer.observe(document.head, { childList: true });

        const bodyObserver = new MutationObserver(() => {
            const deps = document.querySelector('body > .wasabyJSDeps');

            if (deps) {
                startTrackingResource(
                    Array.from(deps.children) as HTMLLinkElement[],
                    this.timeout,
                    callback
                );

                observer.observe(deps, { childList: true });
                bodyObserver.disconnect();
            }

            if (document.body) {
                bodyObserver.observe(document.body, { childList: true });
            }
        });

        const deps = document.querySelector('body > .wasabyJSDeps');
        if (deps) {
            startTrackingResource(
                Array.from(deps.children) as HTMLLinkElement[],
                this.timeout,
                callback
            );

            observer.observe(deps, { childList: true });
        } else if (document.body) {
            bodyObserver.observe(document.body, { childList: true });
        } else {
            bodyObserver.observe(document.documentElement, { childList: true });
        }
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
