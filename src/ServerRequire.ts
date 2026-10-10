/**
 * Серверная версия require.js. Испольуется в сервисе представления, демо-стенде wasaby-cli
 * @author Кудрявцев И.С.
 */
import RequireBase, { NO_CACHE, DEFINE_MODULE } from './main/BaseRequire';
import type { TLoader, IRequire, availableLoaders } from './main/BaseRequire';
import RequireError from './main/RequireError';
import { IPatchedGlobal } from 'RequireJsLoader/wasaby';

import injectModuleName from './main/injectModuleName';
import injectToJson from './server/injectToJson';

import wml from './server/loaders/wml';
import js from './server/loaders/js';
import tmpl from './server/loaders/tmpl';
import css from './server/loaders/css';
import i18n from './server/loaders/i18n';
import json from './server/loaders/json';
import text from './server/loaders/text';
import html from './server/loaders/html';

const loaders: Record<availableLoaders, TLoader<unknown, ServerRequire>> = {
    wml,
    js,
    tmpl,
    css,
    i18n,
    json,
    text,
    html,
};
const nodeJSExportProto =
    // @ts-ignore убрать когда придумаю кк подцепить Node.js типы
    typeof module !== 'undefined' ? Object.getPrototypeOf(module.exports) : null;

let loadingModule: string;

/**
 * Проверяет, что экспорт это объект
 * @param exports
 */
function isObject(exports: object): boolean {
    if (Object.getPrototypeOf(exports) === Object.prototype) {
        return true;
    }

    return nodeJSExportProto && nodeJSExportProto === Object.getPrototypeOf(exports);
}

interface IConfigServerRequire {
    root?: string;
    resourcesPath?: string;
    cdnPath?: string;
}

/**
 * Класс реальзует Require.js с сервой логикой. Полностью синхроный.
 */
class ServerRequire extends RequireBase implements IRequire {
    root: string;

    resourcesPath: string;

    cdnPath: string;

    reactReleaseMode: boolean;

    constructor(config: IConfigServerRequire) {
        super();

        this.root = config.root || '';
        this.resourcesPath = config.resourcesPath || '/';
        this.cdnPath = config.cdnPath || '/cdn';

        const reactMode = this.modules?.React?.mode;

        if (typeof reactMode === 'string') {
            this.reactReleaseMode = reactMode === 'release';
        } else {
            this.reactReleaseMode = true;
        }

        this.cache.set('require', this.require.bind(this));
    }

    getDebugCookie(): string {
        // @ts-ignore
        return process?.domain?.req?.cookies?.s3debug || '';
    }

    enableRtlDirection() {
        //@ts-ignore
        return this.require('I18n/i18n:controller').currentLocaleConfig.directionality === 'rtl';
    }

    buildPath(filePath: string, extension: string) {
        const moduleName = this.getRootDir(filePath);

        if (moduleName === 'cdn') {
            const cdnFilePath = filePath.replace('cdn/', '');

            if (filePath.endsWith(extension)) {
                return `${this.cdnPath}/${cdnFilePath}`;
            }

            return `${this.cdnPath}/${cdnFilePath}.${extension}`;
        }

        const moduleInfo = this.modules[moduleName];

        if (!moduleInfo) {
            if (filePath.startsWith('resources/')) {
                return `${this.root}${this.resourcesPath}${filePath.replace(
                    'resources/',
                    ''
                )}.${extension}`;
            }

            return `${this.root}${this.resourcesPath}${filePath}.${extension}`;
        }

        if (moduleInfo.path) {
            const path = moduleInfo.path;
            const rootPath = path.slice(0, path.lastIndexOf('/') + 1);
            const queryParams = `?x_module=${moduleInfo.buildnumber || this.defaultVersion}`;

            return `${rootPath}${filePath}.${extension}${queryParams}`;
        }

        // На серваке мы должны использовать релизный(продакшен) React, потому что дебажный работает в разы медленее.
        if (moduleName === 'React' && this.reactReleaseMode) {
            return `${this.root}${this.resourcesPath}${filePath}.min.${extension}`;
        }

        return `${this.root}${this.resourcesPath}${filePath}.${extension}`;
    }

    load(name: string): unknown {
        const defineName = this.getDefineName(name);
        const loaderName = this.getLoaderName(defineName);

        loadingModule = defineName;

        let exports: unknown = DEFINE_MODULE;

        if (!this.definedMap.has(name)) {
            try {
                const modulePath = this.getModulePath(defineName);

                exports = this.loadModule(defineName, loaderName, modulePath);
            } catch (err) {
                return this.injectCache(defineName, err, this.ignoreLoadError(name));
            }
        }

        try {
            if (exports === DEFINE_MODULE) {
                exports = this.getExportsFromDefine(defineName);
            }

            if (loaderName === 'js' && exports) {
                injectModuleName(exports, defineName, isObject);
                injectToJson(exports, defineName);
            }

            for (const listener of this.listenerOnLoad) {
                listener(defineName, exports);
            }

            this.cache.set(defineName, exports);

            return this.extractChain(exports as Record<string, any>, name);
        } catch (err) {
            this.errorsCache.set(defineName, err as RequireError);

            throw err;
        } finally {
            this.definedMap.delete(defineName);
        }
    }

    /**
     * Грузит модуль.
     * @param defineName
     * @param loaderName
     * @param modulePath
     */
    loadModule(defineName: string, loaderName: availableLoaders, modulePath: string): unknown {
        return loaders[loaderName](defineName, modulePath, this);
    }

    /**
     * Получить экспорт модуля
     */
    getExportsFromDefine(defineName: string): unknown {
        try {
            //@ts-ignore
            const [deps, callback] = this.definedMap.get(defineName);

            if (deps.length === 0) {
                return this.executeCallback(defineName, callback);
            }

            return this.executeCallback(
                defineName,
                callback,
                this.getDepsExports(defineName, deps),
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

    /**
     * Получить экспорты для зависимостей
     */
    getDepsExports(defineName: string, deps: string[]): unknown[] {
        const result = [];

        for (const dep of deps) {
            // Необходма для того чтобы require смог разрещить относительные пути.
            this.currentModule = defineName;

            result.push(this.require(dep));
        }

        return result;
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

            return this.load(moduleNames);
        }

        const results = [];
        const errors: RequireError[] = [];

        for (const moduleName of moduleNames || []) {
            // TODO Это полный дурдом, но оригинальый require умеет обрабатывать [''] и [undefined] и [function].
            //  Пока что такой кейс всплалыл moduleStub и в старых демках, но фиг знает где оно ещё всплывёт,
            //  поэтому придёться поддержать сия кейс. Но надо будет это спиливать.
            if (!(moduleName && typeof moduleName === 'string')) {
                results.push(undefined);

                continue;
            }

            const normalizeName = this.normalizeName(moduleName);

            try {
                const value = this.extractCache(normalizeName);

                if (value !== NO_CACHE) {
                    results.push(value);

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

            results.push(this.load(normalizeName));
        }

        if (typeof successCallback === 'function') {
            return this.fireCallbacks(results, errors, successCallback, errorCallback);
        }

        return this.firePromise(results, errors);
    }

    detectAnonymousModule(): string {
        return loadingModule;
    }
}

// @ts-ignore
const globalEnv: IPatchedGlobal = globalThis;

/**
 * Глоабльаня функция для иницилизации сервеного require в глобальном окружение.
 * @param root Папка для всех ресурсов
 * @param resourcesPath Папка где лежат UI модули
 * @param cdnPath Папка где лежат cdn модули
 */
// @ts-ignore
globalEnv.initRequire = (root?: string, resourcesPath?: string, cdnPath?: string) => {
    const localRequire = new ServerRequire({
        root,
        resourcesPath,
        cdnPath,
    });

    globalEnv.requirejs = globalEnv.require = localRequire.cache.get('require');
    // TODO совместимость со старым require. Используем этот флаг, чтобы отрубить патч define-а в config.ts.
    //  Удалить когда перепишем config.ts, а сделаем мы это, когда включим новый require и на сервере.
    globalEnv.requirejs.isNewRequire = true;
    // @ts-ignore
    globalEnv.requirejs.instance = localRequire;
    // @ts-ignore
    globalEnv.define = localRequire.define.bind(localRequire);
    globalEnv.define.amd = true;

    // @ts-ignore
    globalEnv.defineFeature = localRequire.defineFeature.bind(localRequire);

    globalEnv.requirejs.defined = localRequire.defined.bind(localRequire);

    globalEnv.requirejs.undef = localRequire.undef.bind(localRequire);

    // TODO совместимость со старым require. Удалить когда переедм везде на новый.
    globalEnv.requirejs.toUrl = (url: string): string => {
        const resourceRoot = globalEnv.wsConfig.resourceRoot || '/resources/';
        const name = url.startsWith(resourceRoot) ? url.replace(resourceRoot, '') : url;
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
};

export default ServerRequire;
