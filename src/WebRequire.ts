/**
 * Веб версия require.js
 * @author Кудрявцев И.С.
 */
import RequireBase, {
    IRequire,
    NO_CACHE,
    TLoader,
    type availableLoaders,
    DEFINE_MODULE,
} from './main/BaseRequire';
import { IPatchedGlobal } from 'RequireJsLoader/wasaby';
import RequireError from './main/RequireError';

import type { RequireJsScriptElement } from './web/loaders/tagScript';
import injectModuleName from './main/injectModuleName';

import css, { startWatchLinks } from './web/loaders/css';
import wml from './web/loaders/wml';
import js from './web/loaders/js';
import tmpl from './web/loaders/tmpl';
import i18n from './web/loaders/i18n';
import json from './web/loaders/json';
import text from './web/loaders/text';
import html from './web/loaders/html';
import bundleLoader from './web/loaders/bundle';

// @ts-ignore
const globalEnv: IPatchedGlobal = globalThis;
const DEFAULT_TIMEOUT = 30_000;
const loaders: Record<availableLoaders, TLoader<Promise<unknown>, WebRequire>> = {
    wml,
    js,
    tmpl,
    css,
    i18n,
    json,
    text,
    html,
};

/**
 * Проверяет, что экспорт это объект
 * @param exports
 */
function isObject(exports: object): boolean {
    return Object.getPrototypeOf(exports) === Object.prototype;
}

class WebRequire extends RequireBase implements IRequire {
    loadableModules: Map<string, Promise<unknown>>;

    processableModules: Map<string, Promise<unknown>>;

    debugCookies: string;

    loadingTimeout: number;

    constructor() {
        super();

        this.loadableModules = new Map();
        this.processableModules = new Map();

        this.debugCookies = document.cookie.match(/(?:^|;)\s*s3debug\s*=\s*([^;]+)/)?.[1] || '';

        this.loadingTimeout = this.fixLoadingTimeoutForDebug(
            Object.keys(this.modules).length,
            globalEnv.wsConfig.moduleLoadingTimeout || DEFAULT_TIMEOUT
        );

        this.cache.set('require', this.require.bind(this));

        // TODO В старом биллинге сия штука true. Не понятно, действительно нужно ли оно там.
        this.compatibleMode =
            window.location.href.indexOf('withoutLayout') === -1 &&
            globalEnv.wsConfig.compatible !== false;
    }

    /**
     * Увеличивает базовый таймаует по количеству дебажных модулей.
     * @param modules Количество всех модулей
     */
    fixLoadingTimeoutForDebug(modules: number, timeout: number): number {
        if (!this.debugCookies) {
            return timeout;
        }

        if (this.debugCookies === 'true') {
            return timeout * 2;
        }

        const half = Math.floor(modules / 2);
        const debugModules = this.debugCookies.split(',');

        if (debugModules.length < half) {
            return timeout;
        }

        const oneModuleTime = timeout / half;
        const dbgModules = debugModules.length - half;

        return Math.floor(timeout + oneModuleTime * dbgModules);
    }

    getDebugCookie(): string {
        return this.debugCookies;
    }

    enableRtlDirection() {
        return document.body?.dir === 'rtl';
    }

    /**
     * Загрузить модули по имени дефайна
     * @param fileInfo Информация о модуле.
     */
    async loadModuleByDefineName(fullName: string, defineName: string): Promise<unknown> {
        const loaderName = this.getLoaderName(defineName);
        let exports: unknown = DEFINE_MODULE;

        if (!this.definedMap.has(defineName)) {
            try {
                const modulePath = this.getModulePath(defineName);

                exports = await this.loadModule(defineName, loaderName, modulePath);
            } catch (err) {
                this.processableModules.delete(defineName);
                this.definedMap.delete(defineName);

                return this.injectCache(defineName, err, this.ignoreLoadError(fullName));
            } finally {
                this.loadableModules.delete(defineName);
            }
        }

        try {
            if (exports === DEFINE_MODULE) {
                exports = await this.getExportsFromDefine(defineName);
            }

            if (loaderName === 'js' && exports) {
                injectModuleName(exports, defineName, isObject);
            }

            for (const callback of this.listenerOnLoad) {
                callback(defineName, exports);
            }

            this.cache.set(defineName, exports);

            return exports;
        } catch (err) {
            this.errorsCache.set(defineName, err as RequireError);

            throw err;
        } finally {
            this.processableModules.delete(defineName);
            this.definedMap.delete(defineName);
        }
    }

    /**
     * Обработать запрашиваемый модуль
     * @param fullName Полное имя запрашиваемого модуля
     * @param defineName
     */
    async loadModuleByFullName(fullName: string, defineName: string): Promise<unknown> {
        let getExports = this.processableModules.get(defineName);

        if (!getExports) {
            getExports = this.loadModuleByDefineName(fullName, defineName);

            this.processableModules.set(defineName, getExports);
        }

        try {
            const exports = await getExports;

            return this.extractChain(exports as Record<string, any>, fullName);
        } catch (err) {
            throw err;
        } finally {
            this.processableModules.delete(fullName);
        }
    }

    async loadModule(
        defineName: string,
        loaderName: availableLoaders,
        modulePath: string
    ): Promise<unknown> {
        let loadPromise = this.loadableModules.get(defineName);

        if (!loadPromise) {
            loadPromise = this._createDefinitionPromise(
                defineName,
                this._createDownLoadPromise(defineName, loaderName, modulePath)
            );

            this.loadableModules.set(defineName, loadPromise);
        }

        return loadPromise;
    }

    /**
     * Создаёт промис на загрузку
     * @param fileInfo
     */
    private _createDownLoadPromise(
        defineName: string,
        loaderName: availableLoaders,
        modulePath: string
    ): Promise<unknown> {
        const moduleInfo = this.modules[this.getRootDir(modulePath)];

        if (moduleInfo && moduleInfo.hasBundles) {
            return bundleLoader(defineName, modulePath, loaderName, this, loaders[loaderName]);
        } else {
            return loaders[loaderName](defineName, modulePath, this);
        }
    }

    private _createDefinitionPromise(
        defineName: string,
        targetPromise: Promise<unknown>
    ): Promise<unknown> {
        return new Promise(async (resolve, reject) => {
            const resetController = new AbortController();
            let signal: AbortSignal;
            let timeoutId: number;
            let clear;

            if (typeof AbortSignal.timeout === 'function') {
                signal = AbortSignal.timeout(this.loadingTimeout);

                clear = () => {
                    resetController.abort();
                };
            } else {
                const controller = new AbortController();

                signal = controller.signal;

                timeoutId = setTimeout(() => {
                    controller.abort();
                }, this.loadingTimeout);

                clear = () => {
                    clearTimeout(timeoutId);
                    resetController.abort();
                };
            }

            signal.addEventListener(
                'abort',
                () => {
                    reject(
                        new RequireError(
                            `Module "${defineName}" did not load within ${this.loadingTimeout} ms.`
                        )
                    );
                },
                { signal: resetController.signal }
            );

            try {
                const result = await targetPromise;

                resolve(result);
            } catch (error) {
                reject(error);
            } finally {
                clear();
            }
        });
    }

    /**
     * Получения экпорта модуля
     */
    async getExportsFromDefine(defineName: string): Promise<unknown> {
        try {
            //@ts-ignore
            const [deps, callback] = this.definedMap.get(defineName);

            if (deps.length === 0) {
                return this.executeCallback(defineName, callback);
            }

            // Необходма для того чтобы require смог разрещить относительные пути.
            this.currentModule = defineName;

            return this.executeCallback(
                defineName,
                callback,
                await this.require(deps as string[]),
                deps
            );
        } catch (err) {
            if (RequireError.isRequireError(err)) {
                throw err;
            }

            throw new RequireError(
                `Failed to execute  callback function for module "${defineName}".`,
                {
                    cause: err as Error,
                    type: 'Executing callback',
                }
            );
        }
    }

    load(fullName: string): Promise<unknown> | unknown {
        let promise = this.processableModules.get(fullName);

        if (promise) {
            return promise;
        }

        const defineName = this.getDefineName(fullName);

        promise =
            fullName === defineName
                ? this.loadModuleByDefineName(fullName, defineName)
                : this.loadModuleByFullName(fullName, defineName);

        this.processableModules.set(fullName, promise);

        return promise;
    }

    /**
     * Функция реализует API глоабной функции requirejs
     */
    require(moduleNames: string): unknown;
    require(moduleNames: string[]): Promise<unknown[]>;
    require(
        moduleNames: string[],
        successCallback: (...args: unknown[]) => void,
        errorCallback: (err: RequireError) => void
    ): void;
    require(
        moduleNames: string | string[],
        successCallback?: (...args: unknown[]) => void,
        errorCallback?: (err: RequireError) => void
    ): void | unknown {
        // Если передали только имя модуля, то пытемся извлечь, его из кеша, если не получиться выкидываем ошмбку.
        if (typeof moduleNames === 'string') {
            const normalizeName = this.normalizeName(moduleNames);
            const value = this.extractCache(normalizeName);

            if (value !== NO_CACHE) {
                return value;
            }

            const err = this.extractErrorCache(normalizeName);

            if (err) {
                throw err;
            }

            throw new RequireError(`Module ${normalizeName} has not been loaded. Use require([])`);
        }

        const promises = [];
        const errors: RequireError[] = [];
        let allGotFromCache = true;

        for (const moduleName of moduleNames || []) {
            // TODO Это полный дурдом, но оригинальый require умеет обрабатывать [''] и [undefined] и [function].
            //  Пока что такой кейс всплалыл moduleStub и в старых демках, но фиг знает где оно ещё всплывёт,
            //  поэтому придёться поддержать сия кейс. Но надо будет это спиливать.
            if (!(moduleName && typeof moduleName === 'string')) {
                promises.push(undefined);

                continue;
            }

            const normalizeName = this.normalizeName(moduleName);

            try {
                const value = this.extractCache(normalizeName);

                if (value !== NO_CACHE) {
                    promises.push(value);

                    continue;
                }
            } catch (cacheError) {
                errors.push(cacheError as RequireError);

                continue;
            }

            const err = this.extractErrorCache(normalizeName);

            if (err) {
                errors.push(err);

                continue;
            }

            allGotFromCache = false;

            promises.push(this.load(normalizeName));
        }

        // Если все запрашиваемые модули были извелечены из кеша,
        // вызываем синхроно колбеки, чтобы отдать модули, как можно быстрее.
        if (allGotFromCache) {
            if (typeof successCallback === 'function') {
                return this.fireCallbacks(promises, errors, successCallback, errorCallback);
            }

            return this.firePromise(promises, errors);
        }

        if (typeof successCallback === 'function') {
            this.processLoadingPromises(promises, errors)
                .then(([returnValues, returnErrors]) => {
                    this.fireCallbacks(returnValues, returnErrors, successCallback, errorCallback);
                })
                .catch((err) => {
                    errorCallback?.(err);
                });
        } else {
            return this.processLoadingPromises(promises, errors).then(
                ([returnValues, returnErrors]) => {
                    return this.firePromise(returnValues, returnErrors);
                }
            );
        }
    }

    /**
     * Обрабатывает промисы по загрузке модулей.
     * @param promises Список промисов
     * @param errors Список ошибок
     */
    async processLoadingPromises(
        promises: unknown[],
        errors: RequireError[]
    ): Promise<[unknown[], RequireError[]]> {
        const result = await Promise.allSettled(promises);
        const returnValues = [];
        const returnErrors = [...errors];

        for (const res of result) {
            if (res.status === 'fulfilled') {
                returnValues.push(res.value);
            } else {
                returnErrors.push(res.reason);
            }
        }

        return [returnValues, returnErrors];
    }

    detectAnonymousModule(): string {
        return (document.currentScript as RequireJsScriptElement).name;
    }
}

/**
 * Глоабльаня функция для иницилизации веб require в глобальном окружение.
 */
// @ts-ignore
globalEnv.initRequire = () => {
    const localRequire = new WebRequire();

    globalEnv.requirejs = globalEnv.require = localRequire.cache.get('require');
    // TODO совместимость со старым require. Используем этот флаг, чтобы отрубить патч define-а в config.ts.
    //  Удалить когда перепишем config.ts, а сделаем мы это, когда включим новый require и на сервере.
    globalEnv.requirejs.isNewRequire = true;
    // @ts-ignore
    globalEnv.requirejs.instance = localRequire;
    // @ts-ignore
    globalEnv.define = localRequire.define.bind(localRequire);
    globalEnv.define.amd = true;

    globalEnv.requirejs.defined = localRequire.defined.bind(localRequire);

    globalEnv.requirejs.undef = localRequire.undef.bind(localRequire);

    // TODO совместимость со старым require. Удалить когда переедм везде на новый.
    globalEnv.requirejs.toUrl = (name: string): string => {
        const splitName = name.split('.');
        const ext = splitName.pop() as string;
        const path = splitName.join('.');

        return localRequire.buildUrl(path, ext);
    };

    // TODO совместимость со старым require. Удалить когда переедм везде на новый.
    globalEnv.requirejs.config = (): any => {
        return globalEnv.requirejs;
    };

    // TODO совместимость со старым require. Удалить когда переедм везде на новый.
    globalEnv.requirejs.onError = (err: unknown): any => {
        throw err;
    };

    if (globalEnv.preDefineModules) {
        for (const defineArgs of globalEnv.preDefineModules) {
            localRequire.define(...defineArgs);
        }

        globalEnv.preDefineModules.clear();
    }

    startWatchLinks();

    if (globalEnv.preRequiredModules) {
        for (const argsRequire of globalEnv.preRequiredModules) {
            localRequire.require(...argsRequire);
        }

        globalEnv.preRequiredModules.clear();
    }
};

export default WebRequire;
