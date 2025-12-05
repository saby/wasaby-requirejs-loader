import { IModule, IContents, BuildMode } from 'RequireJsLoader/wasaby';
import RequireError from './RequireError';
import Module from '../main/Module';

export type availableLoaders = 'wml' | 'js' | 'tmpl' | 'css' | 'i18n' | 'json' | 'text' | 'html';

type cacheType = 'hit' | 'miss' | 'error';
type cacheValue = RequireError | unknown;
type cacheResult = [cacheType, cacheValue];

const IS_BROWSER = typeof window !== 'undefined';

export interface IRequire<ModuleType extends Module> {
    require(moduleNames: string): unknown;
    require(moduleNames: string[]): Promise<unknown[]>;
    require(
        moduleNames: string[],
        successCallback: (...args: unknown[]) => void,
        errorCallback: (err: RequireError) => void
    ): void;

    define(name: string, callback: () => unknown): void;
    define(name: string, deps: string[], callback: () => unknown): void;

    modulesInfo: Map<string, IModuleInfo>;

    modules: Map<string, ModuleType>;

    modulesResolution: Map<string, string[]>;

    debugModules: Set<string>;

    context: ModuleType | null;

    createModule: (name: string) => ModuleType;

    buildMode: BuildMode;
}

export type callbackOnLoad = (name: string, exports: unknown) => void;

export interface IFileInfo {
    defineName: string;
    filePath: string;
    needLoad: boolean;
    extension: availableLoaders;
    rootDir: string;
    ignoreError?: boolean;
    chain: string[];
}

export interface IModuleInfo {
    packageMap?: string;
    crossOrigin?: boolean;
    templateExtension?: string;
    ESVersion?: number;
    hasTailwind?: boolean;
    buildUrl: (name: string, extension: string) => string;
    buildPath: (name: string, extension: string) => string;
}

export interface IConfigRequire {
    modules: Record<string, IModule>;
    rootDomain: string;
    root?: string;
    staticsRoot?: string;
    metaRoot?: string;
    staticsDomain?: string;
    sharedDomain?: string;
    cdnRoot?: string;
    loadingTimeout: number;
    pagexPackages?: boolean;
    buildMode?: BuildMode;
    contents?: IContents;
    modulesResolution?: Map<string, string[]>;
}

const ALIAS_MAP = new Map(
    Object.entries({
        WS: ['WS.Core', 'WS.Core'],
        Core: ['WS.Core', 'WS.Core/core'],
        Lib: ['WS.Core', 'WS.Core/lib'],
        Ext: ['WS.Core', 'WS.Core/lib/Ext'],
        Helpers: ['WS.Core', 'WS.Core/core/helpers'],
        Transport: ['WS.Core', 'WS.Core/transport'],
        Deprecated: ['WS.Deprecated', 'WS.Deprecated'],
    })
);

export default class BaseRequire<ModuleType extends Module> {
    modulesInfo: Map<string, IModuleInfo>;

    loadingTimeout: number;

    cache: Map<string, any>;

    modules: Map<string, ModuleType>;

    modulesResolution: Map<string, string[]>;

    loadableModules: Map<string, Promise<unknown>>;

    debugModules: Set<string>;

    buildMode: BuildMode;

    compatibleMode: boolean;

    listenerOnLoad: Set<callbackOnLoad>;

    parseNameCache: Map<string, IFileInfo>;

    context: ModuleType | null;

    constructor(config: IConfigRequire) {
        this.buildMode = config.buildMode || 'debug';
        this.loadingTimeout = config.loadingTimeout;
        this.modulesResolution = config.modulesResolution || new Map();
        this.modulesInfo = new Map();
        this.modules = new Map();
        this.loadableModules = new Map();
        this.cache = new Map();
        this.parseNameCache = new Map();
        this.listenerOnLoad = new Set();
        this.compatibleMode = false;
        this.context = null;
    }

    onLoadModule(callback: callbackOnLoad) {
        this.listenerOnLoad.add(callback);
    }

    offLoadModule(callback: callbackOnLoad) {
        this.listenerOnLoad.delete(callback);
    }

    getModule(name: string, context: IRequire<ModuleType>): ModuleType {
        if (this.modules.has(name)) {
            return this.modules.get(name) as ModuleType;
        }

        const module = context.createModule(name);

        this.modules.set(name, module);

        return module;
    }

    normalizeName(name: string): string {
        if (name[0] === '.' && this.context) {
            return this.context.getRelName(name);
        }

        return name;
    }

    parseName(moduleName: string): IFileInfo {
        const cache = this.parseNameCache.get(moduleName);

        if (cache) {
            return cache;
        }

        const result: IFileInfo = {
            defineName: '',
            filePath: '',
            extension: 'js',
            rootDir: '',
            needLoad: true,
            ignoreError: false,
            chain: [],
        };
        const normalizeName = this.normalizeName(moduleName);

        let isRootDir = true;
        let isChain = false;
        let hasOptional = false;
        let hasIs = false;
        let part = '';

        for (const symbol of normalizeName) {
            if (symbol === '/' && isRootDir) {
                // Откидываем лидирующий слеш для пути, но нужно оставить для имени define-а.
                if (part === '') {
                    result.defineName += symbol;

                    continue;
                }

                const normalizeRoot = ALIAS_MAP.get(part);

                result.defineName += part;

                if (normalizeRoot) {
                    result.rootDir = normalizeRoot[0];
                    result.filePath = normalizeRoot[1];
                } else {
                    result.rootDir = part;
                    result.filePath = part;
                }

                if (hasOptional) {
                    result.needLoad = this.modulesInfo.has(result.rootDir);
                }

                // Убираем root из обрабатываемой строки и добаялем слеш.
                part = symbol;

                isRootDir = false;

                continue;
            }

            if (symbol === '!') {
                if (part === 'optional') {
                    hasOptional = true;
                    result.ignoreError = true;
                } else if (part === 'is') {
                    hasIs = true;
                } else if (part === 'browser') {
                    result.needLoad = IS_BROWSER;
                } else {
                    result.extension = part as availableLoaders;

                    part += symbol;

                    result.defineName += part;
                }

                part = '';

                continue;
            }

            if (symbol === '?') {
                if (hasIs) {
                    if (part === 'compatibleLayer') {
                        result.needLoad = this.compatibleMode;
                    }

                    if (part === 'browser') {
                        result.needLoad = IS_BROWSER;
                    }
                }

                part = '';

                continue;
            }

            if (symbol === ':') {
                result.filePath += part;

                part = '';
                isChain = true;

                continue;
            }

            if (symbol === '.' && isChain) {
                result.chain.push(part);

                part = '';

                continue;
            }

            part += symbol;
        }

        if (isChain) {
            result.chain.push(part);
        } else {
            result.filePath += part;
            result.defineName += part;
        }

        if (isRootDir) {
            result.rootDir = result.filePath;
        }

        const resolvedName = this.modulesResolution.get(result.defineName);

        if (resolvedName) {
            result.rootDir = resolvedName[0];
            result.filePath = resolvedName[1];
        }

        this.parseNameCache.set(moduleName, result);

        return result;
    }

    firePromise(results: unknown[], errors: RequireError[]): Promise<unknown[]> {
        if (errors.length === 0) {
            return Promise.resolve(results);
        }

        return Promise.reject(errors[0]);
    }

    fireCallbacks(
        results: unknown[],
        errors: RequireError[],
        successCallback: (...args: unknown[]) => void,
        errorCallback?: (err: RequireError) => void
    ): void {
        if (errors.length === 0) {
            successCallback(...results);

            return;
        }

        if (errorCallback) {
            for (const err of errors) {
                errorCallback(err);
            }
        }
    }

    extractCache(
        fullName: string,
        { defineName, needLoad, chain, ignoreError }: IFileInfo
    ): cacheResult {
        // Обработка для служебного зависимости exports, отдаём объект,
        // который будет наполнен експортируемыми сущностями.
        if (fullName === 'exports') {
            return ['hit', {}];
        }

        // TODO Сомвестимсоть со старым.
        //  В архи старых модулях юзат зависимость "module", которая возвращает в объект с полем export,
        //  в него и склыдвают, что должен возрвращать модуль.
        //  Поэтому придёться обработь сия кейс и забирать от туда результат.
        //  Чтобы откатазать от этого кейса надо все переписать на простой return
        if (fullName === 'module') {
            return [
                'hit',
                {
                    exports: {},
                },
            ];
        }

        // Проверим сначал кеш по имени, которое передали в require
        if (this.cache.has(fullName)) {
            return this.extractResult(this.cache.get(fullName));
        }

        // Если запросили модуль с условиям, например, только для браузера и оно не прошло,
        // то можно отдать сразу null и не пытаться ничего грузить.
        if (!needLoad) {
            this.cache.set(fullName, null);

            return ['hit', null];
        }

        // Проверяем нет ли в кеши модуля по имене, которое указано у него в define.
        if (this.cache.has(defineName)) {
            const result = this.cache.get(defineName);

            this.cache.set(fullName, result);

            return this.extractResult(result, ignoreError, chain);
        }

        return ['miss', undefined];
    }

    extractResult(module: unknown, ignoreError?: boolean, chain?: string[]): cacheResult {
        if (RequireError.isReqiureError(module)) {
            if (ignoreError && module.type === 'load') {
                return ['hit', null];
            }

            return ['error', module];
        }

        if (chain && chain.length !== 0) {
            let result = module;

            for (const nameProp of chain) {
                const typeResult = typeof result;

                if (typeResult && (typeResult === 'object' || typeResult === 'function')) {
                    result = (result as Record<string, unknown>)[nameProp];

                    continue;
                }

                return [
                    'error',
                    new RequireError(`Chain access failed at '${nameProp}' for module ${module}.`, {
                        type: 'ChainError',
                    }),
                ];
            }

            return ['hit', result];
        }

        return ['hit', module];
    }
}
