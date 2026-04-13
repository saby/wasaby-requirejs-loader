import RequireBase, { IFileInfo, IRequire, IModuleInfo } from './main/BaseRequire';
import type { IConfigRequire } from './main/BaseRequire';
import RequireError from './main/RequireError';
import Module from './server/Module';
import getModuleResolution from './main/getModuleResolution';
import getStaticsDomain from './main/getStaticsDomain';
import getShardDomain from './main/getShardDomain';
import { IContents } from 'RequireJsLoader/wasaby';

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

let loadingModule: string;

class ServerRequire extends RequireBase<Module> implements IRequire<Module> {
    constructor(config: IConfigRequire) {
        super(config);

        if (config.buildMode === 'debug') {
            this.debugModules = new Set(Object.keys(config.modules));
        }

        if (config.isDebugReact) {
            //this.debugModules.add('React');
        }

        this.buildConfig(config);

        this.cache.set('require', this.require.bind(this));
    }

    currentDebugModule() {
        if (this.debugModules.size !== 0) {
            return this.debugModules;
        }

        // @ts-ignore
        const debug = process?.domain?.req?.cookies?.s3debug || null;

        if (debug) {
            if (debug === 'true') {
                return new Set(this.modulesInfo.keys());
            }

            return new Set([...debug.split(','), 'React']);
        }

        return new Set();
    }

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
        root = '',
        resourcesRoot = '/',
        modules,
        staticsRoot = '/resources/',
        metaRoot = '',
        cdnPath = '/cdn',
        cdnRoot = '/cdn/',
        contents,
    }: IConfigRequire): void {
        const {
            extensionForTemplate: templateExtension,
            buildnumber: defaultVersion = '99.9999-1',
            ESVersion: defaultESVersions,
        } = contents as IContents;

        for (const [name, moduleConfig] of Object.entries(modules)) {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { from_ps, buildnumber, path, hasTailwind, ESVersion } = moduleConfig;
            const rootUrl = path ? path.slice(0, path.lastIndexOf('/') + 1) : staticsRoot;
            const rootPath = path
                ? path.slice(0, path.lastIndexOf('/') + 1)
                : `${root}${resourcesRoot}`;
            const queryParams = `?x_module=${buildnumber || defaultVersion}`;
            const serverQueryParams = path ? queryParams : '';

            const enableDebug = () => {
                return this.currentDebugModule().has(name);
            };

            const getDirection = () => {
                //@ts-ignore
                return this.require('I18n/i18n:controller').currentLocaleConfig.directionality;
            };

            const info: IModuleInfo = {
                buildUrl(filePath: string, extension: string): string {
                    const postfixForMinVersion = enableDebug() ? '' : '.min';
                    const domain = from_ps === 'true' ? '' : getStaticsDomain();

                    if (extension === 'svg') {
                        return `${rootUrl}${filePath}.${extension}${queryParams}`;
                    }

                    if (EXTENSION_WITHOUT_MIN.has(extension)) {
                        return `${domain}${rootUrl}${filePath}.${extension}${queryParams}`;
                    }

                    if (extension === 'css' && !filePath.endsWith('.rtl')) {
                        const rtl = getDirection() === 'rtl' ? '.rtl' : '';

                        return `${domain}${rootUrl}${filePath}${rtl}${postfixForMinVersion}.${extension}${queryParams}`;
                    }

                    return `${domain}${rootUrl}${filePath}${postfixForMinVersion}.${extension}${queryParams}`;
                },
                buildPath(filePath: string, extension: string) {
                    return `${rootPath}${filePath}.${extension}${serverQueryParams}`;
                },
                hasTailwind,
                templateExtension,
                ESVersion: ESVersion || defaultESVersions,
            };

            this.modulesInfo.set(name, info);
        }

        const CDNDirPath = cdnPath || '/cdn';

        this.modulesInfo.set('cdn', {
            buildUrl: (moduleName: string, extension: string) => {
                const cdnFilePath = moduleName.replace('cdn/', '');
                let domainForStatics = '';

                if (extension !== 'svg' && !moduleName.endsWith('manifest.json')) {
                    domainForStatics = getStaticsDomain();
                }

                if (cdnFilePath.endsWith(extension)) {
                    return `${domainForStatics}${cdnRoot}${cdnFilePath}`;
                }

                return `${domainForStatics}${cdnRoot}${cdnFilePath}.${extension}`;
            },
            buildPath(filePath: string, extension: string) {
                const cdnFilePath = filePath.replace('cdn/', '');

                if (filePath.endsWith(extension)) {
                    return `${CDNDirPath}/${cdnFilePath}`;
                }

                return `${CDNDirPath}/${cdnFilePath}.${extension}`;
            },
            ESVersion: defaultESVersions,
        });

        const postfixForMinVersion = this.debugModules.size === 0 ? '.min' : '';

        this.modulesInfo.set('$default$', {
            buildUrl(filePath: string, extension: string): string {
                return `${getShardDomain()}${metaRoot}${filePath}${postfixForMinVersion}.${extension}?x_module=${defaultVersion}`;
            },
            buildPath(filePath: string, extension: string) {
                if (filePath.startsWith('resources/')) {
                    return `${root}${resourcesRoot}${filePath.replace(
                        'resources/',
                        ''
                    )}.${extension}`;
                }

                return `${root}${resourcesRoot}${filePath}.${extension}`;
            },
        });
    }

    createModule(name: string): Module {
        return new Module(name, this);
    }

    loadModule(fileInfo: IFileInfo): unknown {
        const { defineName, ignoreError, chain, extension, filePath, rootDir } = fileInfo;

        loadingModule = defineName;

        const module = this.getModule(defineName, this);

        module.path = filePath;
        module.rootDir = rootDir;
        module.extension = extension;

        if (!module.defined) {
            try {
                module.load();
            } catch (err) {
                this.cache.set(defineName, err);
                this.loadableModules.delete(defineName);

                const [typeCache, value] = this.extractResult(err, ignoreError);

                if (typeCache === 'hit') {
                    return value;
                } else {
                    throw value;
                }
            }
        }

        try {
            const exports = module.getExports();

            for (const callback of this.listenerOnLoad) {
                callback(defineName, exports);
            }

            const [typeCache, value] = this.extractResult(
                exports as Record<string, any>,
                ignoreError,
                chain
            );

            if (typeCache === 'hit') {
                this.cache.set(defineName, exports);
                this.loadableModules.delete(defineName);

                return value;
            } else {
                throw value;
            }
        } catch (err) {
            this.cache.set(defineName, err);
            this.loadableModules.delete(defineName);

            throw err;
        }
    }

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

            return this.loadModule(info);
        }

        const results = [];
        const errors = [];

        for (const moduleName of moduleNames || []) {
            // TODO Это полный дурдом, но оригинальый require умеет обрабатывать [''] и [undefined] и [function].
            //  Пока что такой кейс всплалыл moduleStub и в старых демках, но фиг знает где оно ещё всплывёт,
            //  поэтому придёться поддержать сия кейс. Но надо будет это спиливать.
            if (!(moduleName && typeof moduleName === 'string')) {
                results.push(undefined);

                continue;
            }

            const info = this.parseName(moduleName);
            const [cacheType, value] = this.extractCache(moduleName, info);

            if (cacheType === 'hit') {
                results.push(value);

                continue;
            }

            if (cacheType === 'error') {
                errors.push(value as RequireError);

                continue;
            }

            if (cacheType === 'miss') {
                results.push(this.loadModule(info));
            }
        }

        if (typeof successCallback === 'function') {
            return this.fireCallbacks(results, errors, successCallback, errorCallback);
        }

        return this.firePromise(results, errors);
    }

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
            defineName = loadingModule;
            dependencies = name;
            callbackFn = deps as () => unknown;
        }

        const module = this.getModule(defineName as string, this);

        //@ts-ignore
        module.define(dependencies, callbackFn);
    }
}

// @ts-ignore
const globalEnv: IPatchedGlobal = globalThis;

// @ts-ignore
globalEnv.initRequire = (root?: string, resourcesRoot?: string, cdnPath?: string) => {
    const modules = globalEnv.contents?.modules || {};
    const reactVersion = globalEnv.contents?.modules?.React?.version || 17;

    const localRequire = new ServerRequire({
        root,
        modules,
        resourcesRoot,
        cdnPath,
        buildMode: globalEnv.contents?.buildMode,
        staticsRoot: globalEnv.wsConfig.resourceRoot,
        metaRoot: globalEnv.wsConfig.metaRoot || globalEnv.metaRoot,
        cdnRoot: globalEnv.wsConfig.cdnRoot,
        loadingTimeout: 0,
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

    globalEnv.requirejs.defined = (name: string): boolean => {
        if (name && typeof name === 'string') {
            const fileInfo = localRequire.parseName(name);
            const [type] = localRequire.extractCache(name, fileInfo);

            return type === 'hit';
        }

        return false;
    };

    globalEnv.requirejs.undef = (name: string): void => {
        const { defineName } = localRequire.parseName(name);
        const module = localRequire.modules.get(defineName);

        if (!module) {
            return;
        }

        localRequire.modules.delete(defineName);
        localRequire.cache.delete(defineName);
    };

    // TODO совместимость со старым require. Удалить когда переедм везде на новый.
    globalEnv.requirejs.toUrl = (name: string): string => {
        const splitName = name.split('.');
        const ext = splitName.pop() as string;
        const path = splitName.join('.');
        const [moduleName] = path.split('/');
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
};
