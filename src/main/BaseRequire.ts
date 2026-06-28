/**
 * Базовые функционал require.js.
 * @author Кудрявцев И.С.
 */
import { IModule, IContents, BuildMode } from 'RequireJsLoader/wasaby';
import RequireError from './RequireError';
import Module from './Module';
import FileInfo, { type availableLoaders } from './FileInfo';
import type ModuleInfo from './ModuleInfo';

export const NO_CACHE = Symbol('NO_CACHE');

type extractCache = unknown | RequireError;
type cacheResult = extractCache | typeof NO_CACHE;

const RETRIEVABLE_TYPES: string[] = ['object', 'function'];
const IS_BROWSER = typeof window !== 'undefined';

function isRetrievableObject(obj: unknown): obj is object {
    return !!obj && RETRIEVABLE_TYPES.includes(typeof obj);
}

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
    defined(name: string): boolean;

    loaded(name: string): boolean;

    modulesInfo: Map<string, ModuleInfo>;

    modules: Map<string, ModuleType>;

    modulesResolution: Map<string, string[]>;

    debugModules: Set<string>;

    context: ModuleType | null;

    createModule: (name: string) => ModuleType;

    getModule: (name: string, context: IRequire<ModuleType>) => ModuleType;

    buildMode: BuildMode;

    enablePagexPackage: boolean;
}

export type callbackOnLoad = (name: string, exports: unknown) => void;

export interface IConfigRequire {
    modules: Record<string, IModule>;
    rootDomain?: string;
    root?: string;
    resourcesRoot?: string;
    staticsRoot?: string;
    cdnPath?: string;
    metaRoot?: string;
    cdnRoot?: string;
    loadingTimeout: number;
    pagexPackages?: boolean;
    buildMode?: BuildMode;
    contents?: IContents;
    modulesResolution?: Map<string, string[]>;
    isDebugReact?: boolean;
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

/**
 * Базовый класс require-а
 */
export default class BaseRequire<ModuleType extends Module> {
    modulesInfo: Map<string, ModuleInfo>;

    loadingTimeout: number;

    cache: Map<string, any>;

    errorsCache: Map<string, RequireError>;

    modules: Map<string, ModuleType>;

    modulesResolution: Map<string, string[]>;

    loadableModules: Map<string, Promise<unknown>>;

    debugModules: Set<string>;

    buildMode: BuildMode;

    compatibleMode: boolean;

    listenerOnLoad: Set<callbackOnLoad>;

    parseNameCache: Map<string, FileInfo>;

    context: ModuleType | null;

    enablePagexPackage: boolean;

    constructor(config: IConfigRequire) {
        this.buildMode = config.buildMode || 'debug';
        this.loadingTimeout = config.loadingTimeout;
        this.modulesResolution = config.modulesResolution || new Map();
        this.modulesInfo = new Map();
        this.modules = new Map();
        this.loadableModules = new Map();
        this.cache = new Map();
        this.errorsCache = new Map();
        this.parseNameCache = new Map();
        this.listenerOnLoad = new Set();
        this.debugModules = new Set();
        this.compatibleMode = false;
        this.context = null;
        this.enablePagexPackage = false;
    }

    /**
     * Добавялет обрабтчик на события загрузки модуля
     * @param callback Функция обработчик
     */
    onLoadModule(callback: callbackOnLoad) {
        this.listenerOnLoad.add(callback);
    }

    /**
     * Удаляет обрабтчик на события загрузки модуля
     * @param callback Функция обработчик
     */
    offLoadModule(callback: callbackOnLoad) {
        this.listenerOnLoad.delete(callback);
    }

    /**
     * Возвращает модуль из хранилища, если его ещё нет, создаёт.
     * @param name Имя модуля
     * @param context Require в контексте которого получаем модуль.
     */
    getModule(name: string, context: IRequire<ModuleType>): ModuleType {
        const module = this.modules.get(name) as ModuleType;

        if (module) {
            return module;
        }

        const newModule = context.createModule(name);

        this.modules.set(name, newModule);

        return newModule;
    }

    defined(name: string): boolean {
        if (name && typeof name === 'string') {
            try {
                return this.extractCache(name) !== NO_CACHE;
            } catch (err) {
                return false;
            }
        }

        return false;
    }

    loaded(name: string): boolean {
        if (name && typeof name === 'string') {
            const fileInfo = this.parseName(name);

            if (this.cache.has(fileInfo.defineName)) {
                return true;
            }

            const module = this.modules.get(fileInfo.defineName);

            if (module) {
                return module.defined;
            }
        }

        return false;
    }

    undef(name: string): void {
        const { defineName } = this.parseName(name);

        for (const nameModule of this.cache.keys()) {
            if (!nameModule.includes(nameModule)) {
                continue;
            }

            const fileInfo = this.parseName(nameModule);

            if (fileInfo.defineName === defineName) {
                this.cache.delete(fileInfo.defineName);
            }
        }
    }

    /**
     * Приводит имя к нормальному виду.
     * @param name Имя модуля
     */
    normalizeName(name: string): string {
        if (name[0] === '.' && this.context) {
            return this.context.getRelName(name);
        }

        return name;
    }

    /**
     * Функция парсит имя модуля, преобразуя его в обект с информацией о модуле.
     * @param moduleName Имя модуля
     */
    parseName(moduleName: string): FileInfo {
        const normalizeName = this.normalizeName(moduleName);
        const cache = this.parseNameCache.get(normalizeName);

        if (cache) {
            return cache;
        }

        const result = new FileInfo();

        const defineName: string[] = [];
        const filePath: string[] = [];
        let parts: string[] = [];
        let isRootDir = true;
        let isChain = false;
        let hasOptional = false;
        let hasIs = false;

        for (const symbol of normalizeName) {
            if (symbol === '/' && isRootDir) {
                const rootDir = parts.join('');

                // Откидываем лидирующий слеш для пути, но нужно оставить для имени define-а.
                if (rootDir === '') {
                    defineName.push(symbol);

                    continue;
                }

                const normalizeRoot = ALIAS_MAP.get(rootDir);

                defineName.push(rootDir);

                if (normalizeRoot) {
                    result.rootDir = normalizeRoot[0];
                    filePath.push(normalizeRoot[1]);
                } else {
                    result.rootDir = rootDir;
                    filePath.push(rootDir);
                }

                if (hasOptional) {
                    result.needLoad = this.modulesInfo.has(result.rootDir);
                }

                // Убираем root из обрабатываемой строки и добаялем слеш.
                parts = [symbol];

                isRootDir = false;

                continue;
            }

            if (symbol === '!') {
                const pluginName = parts.join('');

                if (pluginName === 'optional') {
                    hasOptional = true;
                    result.ignoreError = true;
                } else if (pluginName === 'is') {
                    hasIs = true;
                } else if (pluginName === 'browser') {
                    result.needLoad = IS_BROWSER;
                } else {
                    result.extension = pluginName as availableLoaders;

                    defineName.push(pluginName);
                    defineName.push(symbol);
                }

                parts = [];

                continue;
            }

            if (symbol === '?') {
                if (hasIs) {
                    const paramName = parts.join('');

                    if (paramName === 'compatibleLayer') {
                        result.needLoad = this.compatibleMode;
                    }

                    if (paramName === 'browser') {
                        result.needLoad = IS_BROWSER;
                    }
                }

                parts = [];

                continue;
            }

            if (symbol === ':') {
                const fileName = parts.join('');

                filePath.push(fileName);
                defineName.push(fileName);

                parts = [];

                isChain = true;

                continue;
            }

            if (symbol === '.' && isChain) {
                result.chain.push(parts.join(''));

                parts = [];

                continue;
            }

            parts.push(symbol);
        }

        const finishPart = parts.join('');

        if (isChain) {
            result.chain.push(finishPart);
        } else {
            filePath.push(finishPart);
            defineName.push(finishPart);
        }

        result.defineName = defineName.join('');
        result.filePath = filePath.join('');

        if (isRootDir) {
            result.rootDir = result.filePath;
        }

        const resolvedName = this.modulesResolution.get(result.defineName);

        if (resolvedName) {
            result.rootDir = resolvedName[0];
            result.filePath = resolvedName[1];
        }

        this.parseNameCache.set(normalizeName, result);

        return result;
    }

    /**
     * Резоливит промисс на require-инг модулей. Если есть ошибки, то режектит только первую.
     * @param results Список модулей.
     * @param errors Список ошибок.
     */
    firePromise(results: unknown[], errors: RequireError[]): Promise<unknown[]> {
        if (errors.length === 0) {
            return Promise.resolve(results);
        }

        return Promise.reject(errors[0]);
    }

    /**
     * Вызывает обрбаотчики require-инг модулей.
     * @param results Список модулей.
     * @param errors Список ошибок.
     * @param successCallback Обработчик на успех.
     * @param errorCallback Обрабочик на ошибку.
     */
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

    /**
     * Извлекает модуль из кеша, либо отдаёт сигнал что его нет в кеше.
     * @param fullName Полное имя, как его зарейкварили
     * @param defineName Имя с котормы его должны дефайнить
     * @param needLoad Необходимо ли грузить модуль, если его нет.
     * @param chain Цепочка для получения результата.
     * @param ignoreError Игнорировать ли ошибку.
     */
    extractCache(fullName: string): cacheResult {
        // Обработка для служебного зависимости exports, отдаём объект,
        // который будет наполнен експортируемыми сущностями.
        if (fullName === 'exports') {
            return {};
        }

        // TODO Сомвестимсоть со старым.
        //  В архи старых модулях юзат зависимость "module", которая возвращает в объект с полем export,
        //  в него и склыдвают, что должен возрвращать модуль.
        //  Поэтому придёться обработь сия кейс и забирать от туда результат.
        //  Чтобы откатазать от этого кейса надо все переписать на простой return
        if (fullName === 'module') {
            return {
                exports: {},
            };
        }

        // Проверим сначал кеш по имени, которое передали в require
        if (this.cache.has(fullName)) {
            return this.cache.get(fullName);
        }

        const fileInfo = this.parseName(fullName);

        // Если запросили модуль с условиям, например, только для браузера и оно не прошло,
        // то можно отдать сразу null и не пытаться ничего грузить.
        if (!fileInfo.needLoad) {
            this.cache.set(fullName, null);

            return null;
        }

        // Проверяем нет ли в кеши модуля по имене, которое указано у него в define.
        if (this.cache.has(fileInfo.defineName)) {
            const res = this.extractChain(this.cache.get(fileInfo.defineName), fileInfo);

            // Относительные пути нельзя кешировать.
            if (fullName[0] === '.') {
                return res;
            }

            this.cache.set(fullName, res);

            return res;
        }

        return NO_CACHE;
    }

    extractErrorCache(name: string): RequireError | undefined {
        const err = this.errorsCache.get(name);

        if (err) {
            return err;
        }

        const fileInfo = this.parseName(name);
        const defineErr = this.errorsCache.get(fileInfo.defineName);

        if (defineErr) {
            return defineErr;
        }
    }

    injectCache(name: string, module: unknown, ignoreError?: boolean): extractCache {
        if (RequireError.isRequireError(module)) {
            if (ignoreError && module.type === 'load') {
                this.cache.set(name, null);

                return null;
            }

            this.errorsCache.set(name, module);

            throw module;
        }

        this.cache.set(name, module);

        return module;
    }

    extractChain(module: unknown, fileInfo: FileInfo): unknown {
        const chain = fileInfo.chain;

        if (chain && chain.length !== 0) {
            let result = module;

            for (const nameProp of chain) {
                if (isRetrievableObject(result) && nameProp in result) {
                    result = (result as Record<string, unknown>)[nameProp];

                    continue;
                }

                if (chain.length === 1 && nameProp === 'default') {
                    return result;
                }

                throw new RequireError(
                    `Chain access failed at '${nameProp}' for module ${
                        fileInfo.defineName
                    }:${chain.join('.')};`,
                    {
                        type: 'ChainError',
                    }
                );
            }

            return result;
        }

        return module;
    }
}
