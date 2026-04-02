/**
 * Веб версия require.js
 * @author Кудрявцев И.С.
 */
import RequireBase, { IConfigRequire, IFileInfo, IRequire, IModuleInfo } from './main/BaseRequire';
import { IContents, IModule, IPatchedGlobal } from 'RequireJsLoader/wasaby';
import RequireError from './main/RequireError';
import Module from './web/Module';
import type { RequireJsScriptElement } from './web/loaders/tagScript';
import getModuleResolution from './main/getModuleResolution';
import getStaticsDomain from './main/getStaticsDomain';
import getShardDomain from './main/getShardDomain';

// @ts-ignore
const globalEnv: IPatchedGlobal = globalThis;
const DEFAULT_TIMEOUT = 30_000;
//TODO надо это вывернут ьв обратну сторону, списко тог очто надо минифицировать куда меньше,
// плюс убрать в констаны, чтобын не дублировать между web и server
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

function getDebugModules(
    modules: Record<string, IModule>,
    buildMode?: string,
    isDebugReact?: boolean
): Set<string> {
    if (buildMode === 'debug') {
        return new Set(Object.keys(modules));
    }

    const debug = document.cookie.match(/(?:^|;)\s*s3debug\s*=\s*([^;]+)/)?.[1];

    if (debug) {
        if (debug === 'true') {
            return new Set(Object.keys(modules));
        }

        return new Set([...debug.split(','), 'React']);
    }

    if (isDebugReact) {
        return new Set([]);
    }

    return new Set();
}

class WebRequire extends RequireBase<Module> implements IRequire<Module> {
    constructor(config: IConfigRequire) {
        super(config);

        this.enablePagexPackage = !!config.pagexPackages;

        this.debugModules = getDebugModules(config.modules, this.buildMode, config.isDebugReact);

        this.fixLoadingTimeoutForDebug(Object.keys(config.modules).length);

        this.buildConfig(config);

        this.cache.set('require', this.require.bind(this));

        this.compatibleMode =
            window.location.href.indexOf('withoutLayout') === -1 &&
            globalEnv.wsConfig.compatible !== false;
    }

    /**
     * Увеличивает базовый таймаует по количеству дебажных модулей.
     * @param modules Список всех модулей
     */
    fixLoadingTimeoutForDebug(modules: number): number {
        const half = Math.floor(modules / 2);

        if (this.debugModules.size < half) {
            return this.loadingTimeout;
        }

        const oneModuleTime = this.loadingTimeout / half;
        const debugModules = this.debugModules.size - half;

        return Math.floor(this.loadingTimeout + oneModuleTime * debugModules);
    }

    /**
     * Собирает кофиги для UI-модулей, заранее вычисляя всё, что статично.
     * @param modules Список UI модулей
     * @param pagexPackages Включена ли паковка по pagex на странице.
     * @param rootDomain Корневой домейн
     * @param staticsRoot URL путь до UI модулей
     * @param metaRoot URL путь до метафайлов(Сервис представления)
     * @param cdnRoot URL путь до CDN модулей
     * @param contents Оглавление, которое доставляеться через contents.js
     */
    // 1) мы не можем использовать cdn-домены для svg. Svg <use> элементы имеют ограничения на кросс-доменные
    // запросы, допускается только same-origin
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/use#usage_notes
    // есть решение данной проблемы через тег <feImage>
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/use#usage_notes
    // но внедрить его пока не можем из-за того, что данная технология работает только начиная с
    // Chrome 118, Safari 17.2 и тд, данный костыль и переход сможем сделать после поднятия в Тензоре
    // минимально поддерживаемых версий браузеров
    // 2) we can't use domains for contents/router meta requests, cdn domain may contain contents/router
    // meta from another application.
    // 3) we can't use domains for manifest.json requests because manifest uses relative urls
    // and with cdn-domain there will be cross domain request for this manifest, but cross domain
    buildConfig({
        modules,
        rootDomain,
        staticsRoot = '/resources/',
        metaRoot = '',
        cdnRoot = '/cdn/',
        contents,
    }: IConfigRequire): void {
        const shardDomain = getShardDomain();
        const domainForStatics = getStaticsDomain();
        const crossOrigin = !!(domainForStatics && domainForStatics !== rootDomain);
        const {
            extensionForTemplate: templateExtension,
            buildnumber: defaultVersion = '99.9999-1',
            ESVersion: defaultESVersions,
        } = contents as IContents;

        for (const [name, moduleConfig] of Object.entries(modules)) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { hasBundles, from_ps, buildnumber, path, hasTailwind, ESVersion } = moduleConfig;
            const domain = from_ps === 'true' ? '' : domainForStatics;
            const enableDebug = this.debugModules.has(name);
            const root = path ? path.slice(0, path.lastIndexOf('/') + 1) : staticsRoot;
            const postfixForMinVersion = enableDebug ? '' : '.min';
            const queryParams = `?x_module=${buildnumber || defaultVersion}`;

            const info: IModuleInfo = {
                buildUrl(filePath: string, extension: string): string {
                    if (extension === 'svg') {
                        return `${root}${filePath}.${extension}${queryParams}`;
                    }

                    if (EXTENSION_WITHOUT_MIN.has(extension)) {
                        return `${domain}${root}${filePath}.${extension}${queryParams}`;
                    }

                    if (
                        extension === 'css' &&
                        document.body?.dir === 'rtl' &&
                        !filePath.endsWith('.rtl')
                    ) {
                        return `${domain}${root}${filePath}.rtl${postfixForMinVersion}.${extension}${queryParams}`;
                    }

                    return `${domain}${root}${filePath}${postfixForMinVersion}.${extension}${queryParams}`;
                },
                buildPath(filePath: string, extension: string) {
                    return this.buildUrl(filePath, extension);
                },
                crossOrigin,
                hasTailwind,
                templateExtension,
                ESVersion: ESVersion || defaultESVersions,
            };

            if (hasBundles && !enableDebug) {
                info.packagesInfo = {
                    mapPath: `${name}/packageMap.json`,
                };
            }

            this.modulesInfo.set(name, info);
        }

        this.modulesInfo.set('cdn', {
            buildUrl: (moduleName: string, extension: string) => {
                const cdnFilePath = moduleName.replace('cdn/', '');
                let staticDomain = domainForStatics;

                if (extension === 'svg' || moduleName.endsWith('manifest.json')) {
                    staticDomain = '';
                }

                if (cdnFilePath.endsWith(extension)) {
                    return `${staticDomain}${cdnRoot}${cdnFilePath}`;
                }

                return `${staticDomain}${cdnRoot}${cdnFilePath}.${extension}`;
            },
            buildPath(moduleName: string, extension: string) {
                return this.buildUrl(moduleName, extension);
            },
            ESVersion: defaultESVersions,
            crossOrigin,
        });

        const postfixForMinVersion = this.debugModules.size === 0 ? '.min' : '';
        const crossOriginMeta = !!(shardDomain && shardDomain !== rootDomain);

        this.modulesInfo.set('$default$', {
            buildUrl(filePath: string, extension: string): string {
                return `${shardDomain}${metaRoot}${filePath}${postfixForMinVersion}.${extension}?x_module=${defaultVersion}`;
            },
            buildPath(filePath: string, extension: string) {
                return this.buildUrl(filePath, extension);
            },
            crossOrigin: crossOriginMeta,
        });
    }

    /**
     * Создаёт веб модуль
     * @param name имя модуля
     */
    createModule(name: string): Module {
        return new Module(name, this);
    }

    /**
     * Загрузить модули по имени дефайна
     * @param fileInfo Информация о модуле.
     */
    async loadModuleByDefineName(fileInfo: IFileInfo) {
        const { defineName, ignoreError, filePath, rootDir, extension } = fileInfo;
        const module = this.getModule(defineName, this);

        module.path = filePath;
        module.rootDir = rootDir;
        module.extension = extension;

        if (!module.defined) {
            try {
                await module.load(this.loadingTimeout);
            } catch (err) {
                this.cache.set(defineName, err);
                this.loadableModules.delete(defineName);

                const [typeCache, value] = this.extractResult(err, ignoreError);

                if (typeCache === 'hit') {
                    return value;
                }

                throw value;
            }
        }

        try {
            const exports = await module.getExports();

            for (const callback of this.listenerOnLoad) {
                callback(defineName, exports);
            }

            this.cache.set(defineName, exports);

            return exports;
        } catch (err) {
            this.cache.set(defineName, err);

            throw err;
        } finally {
            this.loadableModules.delete(defineName);
        }
    }

    /**
     * Обработать запрашиваемый модуль
     * @param fullName Полное имя запрашиваемого модуля
     * @param fileInfo Информация о модуле
     */
    async processModule(fullName: string, fileInfo: IFileInfo): Promise<unknown> {
        const { defineName, chain } = fileInfo;
        let getExports = this.loadableModules.get(defineName);

        if (!getExports) {
            getExports = this.loadModuleByDefineName(fileInfo);

            this.loadableModules.set(defineName, getExports);
        }

        try {
            const exports = await getExports;

            const [typeCache, value] = this.extractResult(
                exports as Record<string, any>,
                false,
                chain
            );

            if (typeCache === 'hit') {
                return value;
            } else {
                throw value;
            }
        } catch (err) {
            throw err;
        } finally {
            this.loadableModules.delete(fullName);
        }
    }

    loadModule(fullName: string, fileInfo: IFileInfo): Promise<unknown> | unknown {
        let promise = this.loadableModules.get(fullName);

        if (promise) {
            return promise;
        }

        promise =
            fullName === fileInfo.defineName
                ? this.loadModuleByDefineName(fileInfo)
                : this.processModule(fullName, fileInfo);

        this.loadableModules.set(fullName, promise);

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
            const info = this.parseName(moduleNames);

            const [cacheType, value] = this.extractCache(moduleNames, info);

            if (cacheType === 'hit') {
                return value;
            }

            if (cacheType === 'error') {
                throw value;
            }

            throw new RequireError(`Module ${moduleNames} has not been loaded. Use require([])`);
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

            const info = this.parseName(moduleName);
            const [cacheType, value] = this.extractCache(moduleName, info);

            if (cacheType === 'hit') {
                promises.push(value);

                continue;
            }

            if (cacheType === 'error') {
                errors.push(value as RequireError);

                continue;
            }

            if (cacheType === 'miss') {
                allGotFromCache = false;

                promises.push(this.loadModule(moduleName, info));
            }
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

    /**
     * Функция реализует API глоабной функции define
     */
    define(callback: () => unknown): void;
    define(deps: string | string[], callback: () => unknown): void;
    define(name: string, deps: string[], callback: () => unknown): void;
    define(
        name: string | string[] | (() => unknown),
        deps?: string[] | (() => unknown),
        callback?: () => unknown
    ): void {
        let defineName = name;
        let dependencies = deps;
        let callbackFn = callback;

        // Если модуль анонимный будем искать его по url.
        if (typeof name !== 'string') {
            defineName = (document.currentScript as RequireJsScriptElement).name;
            dependencies = name;
            callbackFn = deps as () => unknown;
        }

        const module = this.getModule(defineName as string, this);

        //@ts-ignore
        module.define(dependencies, callbackFn);
    }
}

/**
 * Глоабльаня функция для иницилизации веб require в глобальном окружение.
 */
// @ts-ignore
globalEnv.initRequire = () => {
    const modules = globalEnv.contents?.modules || {};
    const reactVersion = globalEnv.contents?.modules?.React?.version || 17;

    const localRequire = new WebRequire({
        modules,
        buildMode: globalEnv.contents?.buildMode,
        rootDomain: location.host,
        staticsRoot: globalEnv.wsConfig.resourceRoot,
        metaRoot: globalEnv.wsConfig.metaRoot || globalEnv.metaRoot,
        cdnRoot: globalEnv.wsConfig.cdnRoot,
        loadingTimeout: globalEnv.wsConfig.moduleLoadingTimeout || DEFAULT_TIMEOUT,
        pagexPackages: globalEnv.wsConfig.pagexPackages,
        contents: globalEnv.contents,
        modulesResolution: getModuleResolution(reactVersion),
        isDebugReact: globalEnv.wsConfig.isDebugReact,
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

    globalEnv.requirejs.defined = localRequire.defined.bind(localRequire);

    globalEnv.requirejs.undef = (name: string): void => {
        const { defineName } = localRequire.parseName(name);
        const module = localRequire.modules.get(defineName);

        if (!module) {
            return;
        }

        const scripts = Array.from(
            document.getElementsByTagName('script')
        ) as RequireJsScriptElement[];

        for (const script of scripts) {
            const url = script.getAttribute('src') || script.getAttribute('href');

            if (script.name === module.name || url === module.url) {
                script.remove();
            }
        }

        localRequire.modules.delete(defineName);
        localRequire.cache.delete(defineName);
    };

    // TODO совместимость со старым require. Удалить когда переедм везде на новый.
    globalEnv.requirejs.toUrl = (name: string): string => {
        const splitName = name.split('.');
        const ext = splitName.pop() as string;
        const path = splitName.join('.');
        const moduleName = path.split('/')[0];
        const moduleInfo =
            localRequire.modulesInfo.get(moduleName) ||
            (localRequire.modulesInfo.get('$default$') as IModuleInfo);

        return moduleInfo.buildUrl(path, ext);
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
        for (const [name, deps, callback] of globalEnv.preDefineModules) {
            const module = new Module(name, localRequire);

            module.define(deps, callback);

            localRequire.modules.set(name, module);
        }

        globalEnv.preDefineModules.clear();
    }

    if (globalEnv.preRequiredModules) {
        for (const argsRequire of globalEnv.preRequiredModules) {
            localRequire.require(...argsRequire);
        }

        globalEnv.preRequiredModules.clear();
    }
};
