/**
 * Базовые функционал require.js.
 * @author Кудрявцев И.С.
 */
import { IModule, BuildMode } from 'RequireJsLoader/wasaby';
import RequireError from './RequireError';
import getShardDomain from './getShardDomain';
import getAllStaticDomains from './getStaticsDomain';
import getModuleResolution from './getModuleResolution';

type extractCache = unknown | RequireError;
type cacheResult = extractCache | typeof NO_CACHE;

const EMPTY_ARRAY: string[] = [];
const RETRIEVABLE_TYPES: string[] = ['object', 'function'];
const IS_BROWSER = typeof window !== 'undefined';
const EMPTY_FUNC: requireCallback = () => null;
const MODIFICATOR_IS: string = 'is!';
const MODIFICATOR_IS_BROWSER: string = '!browser?';
const MODIFICATOR_IS_COMPATIBLE: string = '!compatibleLayer?';
const MODIFICATOR_BROWSER: string = 'browser!';
const MODIFICATOR_OPTIONAL: string = 'optional!';
const PLUGIN_SEPARATOR = '!';
const CHAIN_SEPARATOR = ':';
const SLASH = '/';
const REG_EXP_EXT = /(.min)?(.css|.js)$/;

const DEFAULT_REACT_VERSION = 19;
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
const EXTENSION_WITHOUT_MIN = new Set([
    'txt',
    'woff2',
    'webp',
    'jpg',
    'jpeg',
    'png',
    'svg',
    'xsl',
    'gif',
    'ico',
]);

// @ts-ignore
const globalEnv: IPatchedGlobal = globalThis;

function isRetrievableObject(obj: unknown): obj is object {
    return !!obj && RETRIEVABLE_TYPES.includes(typeof obj);
}

export const NO_CACHE = Symbol('NO_CACHE');

export const DEFINE_MODULE = Symbol('DEFINE_MODULE');

export type TLoader<ReturnValue, RequireType extends IRequire> = (
    defineName: string,
    filePath: string,
    context: RequireType,
    ...addParams: any[]
) => ReturnValue;

export type requireCallback = (...exports: unknown[]) => unknown;
export type defineInfo = [string[], requireCallback];

export type availableLoaders = 'wml' | 'js' | 'tmpl' | 'css' | 'i18n' | 'json' | 'text' | 'html';

export interface IRequire {
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

    getRootDir(modulePath: string): string;

    getLoaderName(defineName: string): availableLoaders;

    buildUrl(filePath: string, extension: string): string;

    modules: Record<string, IModule>;

    modulesResolution: Map<string, string[]>;

    templateExtension: string;

    defaultESVersion: number;

    buildMode: BuildMode;

    definedMap: Map<string, defineInfo>;

    cache: Map<string, unknown>;
}

export type callbackOnLoad = (name: string, exports: unknown) => void;

/**
 * Базовый класс require-а
 */
export default class BaseRequire {
    cache: Map<string, any>;

    definedMap: Map<string, defineInfo>;

    errorsCache: Map<string, RequireError>;

    modulesResolution: Map<string, string[]>;

    buildMode: BuildMode;

    compatibleMode: boolean;

    listenerOnLoad: Set<callbackOnLoad>;

    currentModule: string;

    modules: Record<string, IModule>;

    staticsRoot: string;

    metaRoot: string;

    cdnRoot: string;

    defaultVersion: string;

    defaultESVersion: number;

    templateExtension: string;

    constructor() {
        const contents = globalEnv.contents || {};
        const wsConfig = globalEnv.wsConfig || {};

        this.modules = contents.modules || {};
        this.modulesResolution = getModuleResolution(
            this.modules.React?.version || DEFAULT_REACT_VERSION
        );

        this.buildMode = contents.buildMode || 'debug';
        this.templateExtension = 'js';

        this.cache = new Map();
        this.errorsCache = new Map();
        this.definedMap = new Map();
        this.listenerOnLoad = new Set();
        this.compatibleMode = false;
        this.currentModule = '';

        this.staticsRoot = wsConfig.resourceRoot || '/resources/';
        this.metaRoot = wsConfig.metaRoot || globalEnv.metaRoot || '';
        this.cdnRoot = wsConfig.cdnRoot || '/cdn/';

        this.defaultVersion = contents.buildnumber || '99.9999-1';
        this.defaultESVersion = contents.ESVersion || 0;
    }

    getNumberStaticDomain(): number {
        return 0;
    }

    getCurrentStaticsDomain(): string {
        const domain = getAllStaticDomains()[this.getNumberStaticDomain()];

        return domain ? `//${domain}` : '';
    }

    buildDebugModules(debugCookie: string): Set<string> {
        if (this.buildMode === 'debug' || debugCookie === 'true') {
            return new Set(Object.keys(this.modules));
        }

        if (debugCookie && debugCookie !== 'false') {
            return new Set(debugCookie.split(',')).add('React');
        }

        return new Set();
    }

    getDebugModules(): Set<string> {
        return new Set();
    }

    isDebugModule(moduleName: string): boolean {
        if (this.buildMode === 'debug') {
            return true;
        }

        const debugModules = this.getDebugModules();

        return debugModules.has(moduleName);
    }

    enableRtlDirection() {
        return false;
    }

    // 1) мы не можем использовать cdn-домены для svg. Svg <use> элементы имеют ограничения на кросс-доменные
    // запросы, допускается только same-origin
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/use#usage_notes
    // есть решение данной проблемы через тег <feImage>
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/use#usage_notes
    // но внедрить его пока не можем из-за того, что данная технология работает только начиная с
    // Chrome 118, Safari 17.2 и тд, данный костыль и переход сможем сделать после поднятия в Тензоре
    // минимально поддерживаемых версий браузеров
    // 3) we can't use domains for manifest.json requests because manifest uses relative urls
    // and with cdn-domain there will be cross domain request for this manifest, but cross domain
    buildUrl(filePath: string, extension: string): string {
        const moduleName = this.getRootDir(filePath);

        if (moduleName === 'cdn') {
            const cdnFilePath = filePath.replace('cdn/', '');
            let staticDomain = '';

            if (extension !== 'svg' && !moduleName.endsWith('/manifest')) {
                staticDomain = this.getCurrentStaticsDomain();
            }

            if (cdnFilePath.endsWith(extension)) {
                return `${staticDomain}${this.cdnRoot}${cdnFilePath}`;
            }

            return `${staticDomain}${this.cdnRoot}${cdnFilePath}.${extension}`;
        }

        const moduleInfo = this.modules[moduleName];

        if (!moduleInfo) {
            const shardDomain = getShardDomain();

            if (this.buildMode === 'debug') {
                return `${shardDomain}${this.metaRoot}${filePath}.${extension}?x_module=${this.defaultVersion}`;
            }

            return `${shardDomain}${this.metaRoot}${filePath}.min.${extension}?x_module=${this.defaultVersion}`;
        }

        const postfixForMinVersion = this.isDebugModule(moduleName) ? '' : '.min';
        const domain = moduleInfo.from_ps === 'true' ? '' : this.getCurrentStaticsDomain();
        const queryParams = `?x_module=${moduleInfo.buildnumber || this.defaultVersion}`;
        const root = moduleInfo.path
            ? moduleInfo.path.slice(0, moduleInfo.path.lastIndexOf('/') + 1)
            : this.staticsRoot;

        if (extension === 'svg') {
            return `${root}${filePath}.${extension}${queryParams}`;
        }

        if (EXTENSION_WITHOUT_MIN.has(extension)) {
            return `${domain}${root}${filePath}.${extension}${queryParams}`;
        }

        if (extension === 'css' && !filePath.endsWith('.rtl') && this.enableRtlDirection()) {
            return `${domain}${root}${filePath}.rtl${postfixForMinVersion}.${extension}${queryParams}`;
        }

        return `${domain}${root}${filePath}${postfixForMinVersion}.${extension}${queryParams}`;
    }

    /**
     * Функция реализует API глоабной функции define
     */
    define(callback: () => unknown): void;
    define(deps: string | string[], callback: (...args: unknown[]) => unknown): void;
    define(name: string, deps: string[], callback: (...args: unknown[]) => unknown): void;
    define(
        name: string | string[] | ((...args: unknown[]) => unknown),
        deps?: string[] | ((...args: unknown[]) => unknown),
        callback?: (...args: unknown[]) => unknown
    ): void {
        let defineName = name;
        let dependencies = deps;
        let callbackFn = callback;

        // Если модуль анонимный будем искать его по url.
        if (typeof name !== 'string') {
            defineName = this.detectAnonymousModule();
            dependencies = name;
            callbackFn = deps as () => unknown;
        }

        if (this.cache.has(defineName as string) || this.definedMap.has(defineName as string)) {
            return;
        }

        if (typeof dependencies === 'function') {
            //@ts-ignore
            this.definedMap.set(defineName, [EMPTY_ARRAY, dependencies]);
        } else {
            //@ts-ignore
            this.definedMap.set(defineName, [dependencies, callbackFn || EMPTY_FUNC]);
        }
    }

    defineFeature(name: string, defaultDeps: string[], defaultCallback: () => unknown): void {
        const moduleName = this.getRootDir(name);
        const moduleInfo = this.modules[moduleName];

        if (!moduleInfo) {
            return this.define(name, defaultDeps, defaultCallback);
        }

        const featureName = moduleInfo.features?.[name];

        if (!featureName) {
            return this.define(name, defaultDeps, defaultCallback);
        }

        if (featureName.includes(SLASH)) {
            return this.define(name, [featureName], (result: unknown) => result);
        }

        if (featureName === moduleName) {
            return this.define(name, defaultDeps, defaultCallback);
        }

        const featureFullName = name.replace(moduleName, featureName);

        return this.define(name, [featureFullName], (result: unknown) => result);
    }

    detectAnonymousModule(): string {
        return '';
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

    defined(name: string): boolean {
        if (name && typeof name === 'string') {
            // Проверим сначал кеш по имени, которое передали в require
            if (this.cache.has(name)) {
                return true;
            }

            // Если запросили модуль с условиям, например, только для браузера и оно не прошло,
            // то можно отдать сразу null и не пытаться ничего грузить.
            if (!this.moduleNeedsLoaded(name)) {
                this.cache.set(name, null);

                return true;
            }

            // Проверяем нет ли в кеши модуля по имене, которое указано у него в define.
            if (this.cache.has(this.getDefineName(name))) {
                return true;
            }
        }

        return false;
    }

    loaded(name: string): boolean {
        if (name && typeof name === 'string') {
            const defineName = this.getDefineName(name);

            if (this.cache.has(defineName)) {
                return true;
            }

            if (this.definedMap.has(defineName)) {
                return true;
            }
        }

        return false;
    }

    undef(name: string): void {
        const defineName = this.getDefineName(name);

        this.definedMap.delete(defineName);

        for (const nameModule of this.cache.keys()) {
            if (!nameModule.includes(defineName)) {
                continue;
            }

            const defineNameCache = this.getDefineName(nameModule);

            if (defineNameCache === defineName) {
                this.cache.delete(defineNameCache);
            }
        }
    }

    /**
     * Резолвит относительную зависимость до полноценного имени модуля.
     * @param relName
     */
    getRelName(relName: string) {
        const result = this.currentModule.split(SLASH);
        const splitRelName = relName.split(SLASH);

        result.pop();

        for (const dirName of splitRelName) {
            if (dirName === '.') {
                continue;
            }

            if (dirName === '..') {
                result.pop();

                continue;
            }

            result.push(dirName);
        }

        return result.join(SLASH);
    }

    /**
     * Приводит имя к нормальному виду.
     * @param name Имя модуля
     */
    normalizeName(name: string): string {
        if (name[0] === '.' && this.currentModule) {
            return this.getRelName(name);
        }

        return name;
    }

    /**
     * Нужно ли грузить модуль
     * @param defineName Имя модуля
     */
    moduleNeedsLoaded(moduleName: string): boolean {
        let result = true;

        if (moduleName.includes(MODIFICATOR_OPTIONAL)) {
            const defineName = this.getDefineName(moduleName);
            const rootDir = this.getRootDir(this.getModulePath(defineName));

            if (rootDir !== 'cdn') {
                result = this.modules.hasOwnProperty(rootDir);

                if (!result) {
                    return false;
                }
            }
        }

        if (moduleName.includes(MODIFICATOR_BROWSER)) {
            return IS_BROWSER;
        }

        const start = moduleName.indexOf(MODIFICATOR_IS);

        if (start !== -1) {
            if (moduleName.includes(MODIFICATOR_IS_BROWSER, start)) {
                return IS_BROWSER;
            }

            if (moduleName.includes(MODIFICATOR_IS_COMPATIBLE, start)) {
                return this.compatibleMode;
            }
        }

        return true;
    }

    /**
     *
     * @param moduleName
     * @constructor
     */
    ignoreLoadError(moduleName: string): boolean {
        return moduleName.includes(MODIFICATOR_OPTIONAL);
    }

    sliceByIndexes(moduleName: string, start: number, end: number): string {
        if (end === -1) {
            if (start === 0) {
                return moduleName;
            }

            return moduleName.slice(start);
        }

        return moduleName.slice(start, end);
    }

    /**
     *
     * @param moduleName
     */
    getDefineName(moduleName: string): string {
        const start = this._getStartDefineName(moduleName);

        return this.sliceByIndexes(moduleName, start, moduleName.indexOf(CHAIN_SEPARATOR, start));
    }

    /**
     *
     * @param defineName
     */
    getModulePath(defineName: string): string {
        const resolvedName = this.modulesResolution.get(defineName);

        if (resolvedName) {
            return resolvedName[1];
        }

        let start = defineName.indexOf(PLUGIN_SEPARATOR);

        start = start === -1 ? 0 : start + 1;

        if (defineName[start] === SLASH) {
            start++;
        }

        const path = this.sliceByIndexes(
            defineName,
            start,
            defineName.indexOf(CHAIN_SEPARATOR, start)
        );
        const rootDir = this.getRootDir(path);
        const alias = ALIAS_MAP.get(rootDir);

        if (alias) {
            return path.replace(rootDir, alias[1]);
        }

        return path;
    }

    getRootDir(modulePath: string): string {
        const rootIndex = modulePath.indexOf(SLASH);

        if (rootIndex === -1) {
            return modulePath;
        }

        return modulePath.slice(0, rootIndex);
    }

    getLoaderName(defineName: string): availableLoaders {
        const indexLoader = defineName.indexOf(PLUGIN_SEPARATOR);

        if (indexLoader === -1) {
            return 'js';
        }

        return defineName.slice(0, indexLoader) as availableLoaders;
    }

    getModulePathFromUrl(url: URL): string {
        const path = url.pathname;

        if (path.startsWith(this.cdnRoot)) {
            // в приложениях облака работает локальный cdn:
            // анонимный ресурс запрашивается через require(['/cdn/CodeMirror/...'])
            // а путь резолвится в /auth/localcdn/Codemirror/...
            // и чтобы в definedMap положить результат по запрашиваемому имени, нам нужно
            // поменять cdnRoot на дефолтный cdn
            if (this.cdnRoot !== '/cdn/') {
                return path.replace(this.cdnRoot, '/cdn/');
            }

            return path;
        }

        return `${path.replace(this.staticsRoot, '').replace(REG_EXP_EXT, '')}`;
    }

    _getStartDefineName(moduleName: string): number {
        const optionalIndex = moduleName.indexOf(MODIFICATOR_OPTIONAL);
        const isIndex = moduleName.indexOf(MODIFICATOR_IS);
        const browserIndex = moduleName.indexOf(MODIFICATOR_BROWSER);

        if (optionalIndex === -1 && isIndex === -1 && browserIndex === -1) {
            return 0;
        }

        if (optionalIndex > isIndex && optionalIndex > browserIndex) {
            return optionalIndex + MODIFICATOR_OPTIONAL.length;
        }

        if (browserIndex > isIndex) {
            return browserIndex + MODIFICATOR_BROWSER.length;
        }

        const isBrowserIndex = moduleName.indexOf(MODIFICATOR_IS_BROWSER, isIndex);

        if (isBrowserIndex !== -1) {
            return isBrowserIndex + MODIFICATOR_IS_BROWSER.length;
        }

        const isCompatibleIndex = moduleName.indexOf(MODIFICATOR_IS_BROWSER, isIndex);
        if (isCompatibleIndex !== -1) {
            return isCompatibleIndex + MODIFICATOR_IS_COMPATIBLE.length;
        }

        return 0;
    }

    /**
     * Извлекает экспортируюмую сущность из модуля.
     * @param depsName Имена зависимостей.
     * @param depsValue Экспорты зависимостей
     */
    extractExports(depsName: string[], depsValue: unknown[]): unknown {
        const module = depsValue[depsName.indexOf('module')];
        const exports = depsValue[depsName.indexOf('exports')];

        if (exports) {
            if (module && Object.keys(exports).length === 0) {
                // @ts-ignore
                return module.exports;
            }

            return exports;
        }

        // TODO Сомвестимсоть со старым.
        //  В архи старых модулях юзат зависимость "module", которая возвращает в объект с полем export,
        //  в него и склыдвают, что должен возрвращать модуль.
        //  Поэтому придёться обработь сия кейс и забирать от туда результат.
        //  Чтобы откатазать от этого кейса надо все переписать на просто return
        if (module) {
            // @ts-ignore
            return module.exports;
        }
    }

    /**
     * Выполяем обработчик из define, чтобы получит жкспорт модуля.
     * @param modulePath
     * @param callback
     * @param depsExports
     * @param depsName
     */
    executeCallback(defineName: string, callback: requireCallback): unknown;
    executeCallback(
        defineName: string,
        callback: requireCallback,
        depsExports: unknown[],
        depsName: string[]
    ): unknown;
    executeCallback(
        defineName: string,
        callback: requireCallback,
        depsExports?: unknown[],
        depsName?: string[]
    ): unknown {
        let exports;

        // В этой точке конетекст может быть перебить зависимостями, поэтому выставялем его снова.
        // Внутри колбека могут вызывать синхроный require с относительным именем.
        this.currentModule = defineName;

        if (depsExports && depsName) {
            const innerExports = depsExports[depsName.indexOf('exports')];

            if (innerExports) {
                exports = callback.apply(innerExports, depsExports);
            } else {
                exports = callback(...depsExports);
            }

            if (!exports) {
                exports = this.extractExports(depsName, depsExports);
            }
        } else {
            exports = callback();
        }

        // В этой точке конетекст может быть перебить зависимостями, поэтому выставялем его снова.
        // Внутри колбека могут вызывать синхроный require с относительным именем.
        this.currentModule = '';

        return exports;
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

        // Если запросили модуль с условиям, например, только для браузера и оно не прошло,
        // то можно отдать сразу null и не пытаться ничего грузить.
        if (!this.moduleNeedsLoaded(fullName)) {
            this.cache.set(fullName, null);

            return null;
        }

        const defineName = this.getDefineName(fullName);

        // Проверяем нет ли в кеши модуля по имене, которое указано у него в define.
        if (this.cache.has(defineName)) {
            const res = this.extractChain(this.cache.get(defineName), fullName);

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

        const defineErr = this.errorsCache.get(this.getDefineName(name));

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

    extractChain(module: unknown, fullName: string): unknown {
        const chainIndex = fullName.indexOf(CHAIN_SEPARATOR);

        if (chainIndex === -1) {
            return module;
        }

        const chain = fullName.slice(chainIndex + 1).split('.');

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
                `Chain access failed at '${nameProp}' for module ${fullName}:${chain.join('.')};`,
                {
                    type: 'ChainError',
                }
            );
        }

        return result;
    }
}
