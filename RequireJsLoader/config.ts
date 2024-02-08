/**
 * Configures RequireJS on Wasaby environment.
 * @private
 */
interface IDebug {
    MODULES: string[];
    IS_OVERALL?: boolean;
    isEnabled(): boolean;
    isDebuggingModule(url: string): boolean;
}

interface IGetModulePrefixes {
    (): string[][];
    invalidate(): void;
}

interface IHandlersInternal {
    config: RequireJsLoader.IWsConfig;
    getModuleNameFromUrl: (url: string) => string | undefined;
    getModulesPrefixes: IGetModulePrefixes;
    checkModule: (url: string) => void;
    getWithDomain(url: string, debugCookieValue?: string, skipDomains?: boolean): string;
    getWithDomain(
        url?: string,
        debugCookieValue?: string,
        skipDomains?: boolean
    ): string | undefined;
    getWithSuffix(
        url: string,
        debugCookieValue?: string,
        _isIE?: boolean,
        direction?: string
    ): string;
    getWithSuffix(
        url?: string,
        debugCookieValue?: string,
        _isIE?: boolean,
        direction?: string
    ): string | undefined;
    getWithVersion(url: string): string;
    getWithVersion(url?: string): string | undefined;
    getWithResourceRoot(url: string): string;
    getWithResourceRoot(url?: string): string | undefined;
    getWithUserDefined: (url: string) => string;
}

interface ILoader {
    load: (name: string, require: RequireJsLoader.IRequireContext, load: () => void) => void;
}

interface IRTPackage {
    MODULES_NAMES: Record<string, string> | undefined;
    getModules(): Record<string, string> | undefined;
    isPacked(moduleName: string): boolean | undefined;
}

interface IStaticFile {
    prevConfig?: RequireJsLoader.IStaticResourcesConfig;
    prevStaticDomains?: RequireJsLoader.IStaticResourcesConfig | string[];
    getConfig(): RequireJsLoader.IStaticResourcesConfig;
}

// Полиффил globalThis для IE11. https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/globalThis
// Данное свойство нужно инициализировать как можно раньше до исполнения все скриптов,
// а SbisUI/polyfill грузиться через require и поэтому это поздно.
// Поэтому вставляем полифил сюда в конфиг require, который грузиться и исполняется первым.
if (typeof globalThis === 'undefined') {
    const globalEnv = (function () {
        // @ts-ignore
        // eslint-disable-next-line no-eval
        return this || (1, eval)('this');
    })();

    globalEnv.globalThis = globalEnv;
}

//This code should be executed before any other module load that's why it's a self-invoking function.
define(
    'RequireJsLoader/config',
    (() => {
        const GLOBAL = globalThis as unknown as RequireJsLoader.IPatchedGlobal;

        const POLYFILL_MODULE = 'SbisUI/polyfill';

        // Check if we're on server side
        const IS_SERVER_SCRIPT: boolean = typeof window === 'undefined';

        // Default loading timeout for RequireJS
        const DEFAULT_LOADING_TIMEOUT = 60;

        // Resource loading timeout for RequireJS
        const LOADING_TIMEOUT: number =
            getWsConfig().moduleLoadingTimeout || DEFAULT_LOADING_TIMEOUT;

        // Default resources path
        const DEFAULT_RESOURCES_PATH = 'resources';

        // Default meta path
        const DEFAULT_META_PATH = GLOBAL.metaRoot || '';

        // Release mode
        const RELEASE_MODE: RequireJsLoader.BuildMode = 'release';

        // Debug mode
        const DEBUG_MODE: RequireJsLoader.BuildMode = 'debug';

        // Application build mode
        const BUILD_MODE: RequireJsLoader.BuildMode = GLOBAL.contents?.buildMode || DEBUG_MODE;

        // server-side react mode. release by default
        const REACT_MODE: RequireJsLoader.BuildMode =
            GLOBAL.contents?.modules?.React?.mode || RELEASE_MODE;

        const coreAliases = ['Core', 'Lib', 'Transport', 'Helpers', 'Ext', 'tslib'];

        // paths from requirejs config
        let requireJsPaths = {};

        function getRequireJsPaths() {
            return requireJsPaths;
        }
        function getWsConfig(): RequireJsLoader.IWsConfig {
            const GLOBAL = globalThis as unknown as RequireJsLoader.IPatchedGlobal;

            return GLOBAL.wsConfig || (GLOBAL.wsConfig = {} as RequireJsLoader.IWsConfig);
        }

        function getContents(): RequireJsLoader.IContents | undefined {
            return (globalThis as unknown as RequireJsLoader.IPatchedGlobal).contents;
        }

        function logError(err: Error): void {
            if (typeof console === 'object') {
                // eslint-disable-next-line
                console.error(err);
            } else {
                throw err;
            }
        }

        /**
         * Cross-browser Object.assign implementation
         */
        function objectAssign<Recipient extends {}, Donor extends {}>(
            target: Recipient,
            source: Donor
        ): Recipient & Donor {
            if (Object.assign) {
                return Object.assign(target, source);
            }

            for (const name in source) {
                if (source.hasOwnProperty(name)) {
                    //@ts-ignore
                    target[name] = source[name];
                }
            }

            return target as Recipient & Donor;
        }

        // Removes leading slash from string
        function removeLeadingSlash(path: string): string {
            let result = path;
            if (result) {
                const head = result.charAt(0);
                if (head === '/' || head === '\\') {
                    result = result.substr(1);
                }
            }
            return result;
        }

        // Removes trailing slash from string
        function removeTrailingSlash(path: string): string {
            let result = path;
            if (result) {
                const tail = result.substr(result.length - 1);
                if (tail === '/' || tail === '\\') {
                    result = result.substr(0, result.length - 1);
                }
            }
            return result;
        }

        // Joins path parts together
        function pathJoin(...args: string[]): string {
            const count = args.length;
            const path = [];
            let before: string;
            let after: string;

            for (let i = 0; i < count; i++) {
                before = after = arguments[i];
                if (i > 0) {
                    after = removeLeadingSlash(after);
                }
                if (i < count - 1) {
                    after = removeTrailingSlash(after);
                }
                if (after) {
                    path.push(after);
                } else if (i === 0 && before === '/') {
                    path.push(after);
                }
            }

            return path.join('/');
        }

        function getCookie(): string | false {
            try {
                return typeof document === 'object' && String(document.cookie);
            } catch (err) {
                logError(err as Error);
            }

            return false;
        }

        function getDirection(): string | false {
            try {
                return typeof document === 'object' && document.body?.dir;
            } catch (err) {
                logError(err as Error);
            }

            return false;
        }

        /**
         * На страницах OnlineSbisRu/CompatibleTemplate зависимости пакуются в rt-пакеты и собираются DepsCollector(saby/UI)
         * Поэтому в глобальной переменной храним имена запакованных в rt-пакет модулей
         * И игнорируем попытки require
         * https://online.sbis.ru/opendoc.html?guid=348beb13-7b57-4257-b8b8-c5393bee13bd
         * TODO следует избавится при отказе от rt-паковки
         */
        const rtPack: IRTPackage = {
            MODULES_NAMES: undefined,

            getModules(): Record<string, string> | undefined {
                const GLOBAL = globalThis as unknown as RequireJsLoader.IPatchedGlobal;

                if (IS_SERVER_SCRIPT || !GLOBAL.rtpackModuleNames) {
                    return {};
                }
                try {
                    return JSON.parse(GLOBAL.rtpackModuleNames);
                } catch (err) {
                    logError(err as Error);

                    return {};
                }
            },

            isPacked(moduleName: string): boolean | undefined {
                if (!this.MODULES_NAMES) {
                    this.MODULES_NAMES = this.getModules();
                }

                return this.MODULES_NAMES && this.MODULES_NAMES.hasOwnProperty(moduleName);
            },
        };

        /**
         * Work with static files
         */
        const staticFiles: IStaticFile = {
            prevConfig: undefined,
            prevStaticDomains: undefined,

            getConfig(): RequireJsLoader.IStaticResourcesConfig {
                const wsConfig = getWsConfig();

                if (this.prevConfig && wsConfig.staticDomains === this.prevStaticDomains) {
                    return this.prevConfig;
                }

                // Normailze config for statics
                const config =
                    wsConfig.staticDomains instanceof Array
                        ? {
                              domains: wsConfig.staticDomains,
                              types: ['js'],
                          }
                        : wsConfig.staticDomains || {
                              domains: [],
                              types: ['js'],
                          };

                this.prevConfig = config;
                this.prevStaticDomains = wsConfig.staticDomains;

                return config;
            },
        };

        /**
         * Wraps global define() function of RequireJS
         * @param require Root RequireJS instance
         * @param original Original define() function
         * @return Wrapped function
         */
        function patchDefine(
            require: RequireJsLoader.IRequireExt,
            original: RequireDefine
        ): RequireDefine {
            const context = require.s.contexts._;
            const contents = getContents();
            const includedSbisEnvUI = contents?.modules?.SbisUI;

            // dependencies that should be loaded in every possible module
            const IMPORTANT_DEPENDENCIES = [
                // Force load polyfills in every possible module
                IS_SERVER_SCRIPT ? '' : includedSbisEnvUI ? POLYFILL_MODULE : '',
            ];

            // Returns required dependencies for candidate
            function needDependencyFor(
                name: string,
                strictDependencies: string[],
                candidateDeps: string[],
                skipNamespace: string
            ): string[] {
                if (
                    typeof name !== 'string' || // Don't add to anonymous
                    name.indexOf('/packageMap.json') !== -1 || // Don't add to meta files
                    (name.indexOf('/') === -1 && name.indexOf('react') === -1) || // Don't add to special names
                    name.indexOf(POLYFILL_MODULE) === 0 || // Don't add any dependencies to SbisEnvUI/polyfill namespace
                    candidateDeps.indexOf(name) > -1 // Don't add to each other
                ) {
                    return [];
                }

                // Break cycles we know about
                if (name.substr(0, skipNamespace.length) === skipNamespace) {
                    return strictDependencies;
                }

                return candidateDeps.filter((depName) => {
                    return depName && !context.defined[depName]; // Add if module is not defined yet
                });
            }

            // Adds extra dependencies for every defined module to force their loading
            function patchedDefine(name: string, deps?: string[], callback?: Function): void {
                const toAdd = needDependencyFor(
                    name,
                    IMPORTANT_DEPENDENCIES,
                    [
                        // Force load extra patches for RequireJS
                        'RequireJsLoader/autoload',

                        // RequireJsLoader modules should not have any magic extra dependencies
                        // from RequireJsLoader, it could cause multiple cycle dependencies between
                        // from each other. All dependencies of the modules should be strictly declared
                        // from the beginning.
                    ].concat(IMPORTANT_DEPENDENCIES),
                    'RequireJsLoader/'
                );

                let finalDeps = deps;
                let finalCallback = callback;
                // Add extra dependencies
                if (toAdd.length) {
                    if (!(finalDeps instanceof Array)) {
                        finalCallback = finalDeps;
                        finalDeps = [];
                    }
                    finalDeps.push.apply(finalDeps, toAdd);
                }

                // Call original define() function
                // @ts-ignore
                return original.call(this, name, finalDeps, finalCallback);
            }

            patchedDefine.amd = original.amd;

            return patchedDefine as RequireDefine;
        }

        // проверка на wasaby-контрол
        function isControlClass(controlClass: Function & { isWasaby?: boolean }): boolean {
            const prototype = controlClass && controlClass.prototype;

            if (prototype && typeof prototype !== 'undefined') {
                return prototype.$constructor || prototype._template || controlClass.isWasaby;
            }

            return false;
        }
        /**
         * Returns handler for RequireJS resource loader callback
         * @param parent Previous callback
         */
        function createResourceLoader(
            parent: RequireJsLoader.OnResourceLoadCallback
        ): RequireJsLoader.OnResourceLoadCallback {
            return function onResourceLoad(
                context: RequireJsLoader.IRequireContext,
                map: RequireJsLoader.IRequireMapExt
            ): void {
                if (!map.prefix) {
                    let exports: Record<string, unknown> | Function = context.defined[
                        map.id
                    ] as Record<string, unknown>;

                    if (exports && !exports._packedLibrary) {
                        // Lookup for ES6 default export if available
                        if (exports && exports.__esModule && exports.default) {
                            exports = exports.default;
                        }

                        if (typeof exports === 'function') {
                            // Give _moduleName to each class and BTW mark private classes
                            const proto = exports.prototype;

                            if (proto && !proto.hasOwnProperty('_moduleName')) {
                                proto._moduleName = map.name;

                                if (map.name.indexOf('/_') !== -1) {
                                    proto._isPrivateModule = true;
                                }
                            }
                        } else if (
                            // Give _moduleName to each private or unnamed class in public library
                            exports &&
                            typeof exports === 'object' &&
                            Object.getPrototypeOf(exports) === Object.prototype &&
                            map.name.indexOf('/_') === -1
                        ) {
                            Object.keys(exports).forEach((name) => {
                                const module = (exports as Record<string, unknown>)[name];

                                if (typeof module === 'function') {
                                    const proto = module.prototype;

                                    if (
                                        proto &&
                                        isControlClass(module) &&
                                        !proto.hasOwnProperty('_$moduleNameInLibrary')
                                    ) {
                                        // обходим библиотеку и расставляем компонентам уникальные названия

                                        // rskey выставляю как moduleNameInLibrary+counter.
                                        // таким образом отрезается префикс, который может отличаться на сервере и клиенте.
                                        //
                                        // Были проблемы с одинаковостью moduleName на сервере и клиенте, на сервере бывает
                                        // инициализируется moduleName не так.
                                        // Например, на сервере приватный, на клиенте библиотечный.
                                        // Поэтому ввел дополнительно поле, которое должно на сервере и клиенте одинаково
                                        // проставляться.
                                        // moduleNameInLibrary это новое поле которое всегда выставляется по библиотечному
                                        // виду. если библиотека подтянется, это поле проставится всем контролам
                                        // в библиотеке одинаково. должно по крайней мере.
                                        //
                                        // Рассчитываю на то, что на сервере и клиенте библиотеки грузятся в одинаковой
                                        // последовательности.
                                        proto._$moduleNameInLibrary = map.name + ':' + name;
                                    }

                                    if (
                                        proto &&
                                        (proto._isPrivateModule ||
                                            !proto.hasOwnProperty('_moduleName'))
                                    ) {
                                        proto._moduleName = map.name + ':' + name;
                                    }
                                }
                            });
                        }
                    }
                }

                if (parent) {
                    // @ts-ignore
                    parent.apply(this, arguments);
                }
            };
        }

        // Detect debug mode constants
        const debug: IDebug = {
            IS_OVERALL: 'debug' in getWsConfig() ? getWsConfig().debug : false,
            MODULES: [],

            /**
             * Debug mode is enabled
             */
            isEnabled(): boolean {
                return this.IS_OVERALL || this.MODULES.length > 0;
            },

            /**
             * Determines debug mode for specified URL
             */
            isDebuggingModule(url: string): boolean {
                if (url) {
                    return (
                        this.IS_OVERALL || this.MODULES.some((mod) => url.indexOf('/' + mod) !== -1)
                    );
                }

                return false;
            },
        };

        // returns array of debugging modules by transmitted cookie
        function getDebugModules(cookie: string): string[] {
            if (!cookie || cookie === 'false') {
                return [];
            }

            const debugModules = cookie.split(',');
            if (debugModules.length > 0) {
                // for WS.Core interface module files can be required
                // with different AMD module names, such as 'Core', 'Lib',
                // 'Ext', 'Helpers', 'Transport'. We should mark these namespaces
                // as debug too, so there will be no WS.Core custom packages if
                // WS.Core is chosen for debugging
                if (debugModules.includes('WS.Core')) {
                    debugModules.push('Core', 'Lib', 'Ext', 'Helpers', 'Transport');
                }

                // React module in development version don't have backward compatibility with one in production
                // mode. That's why we need to set it as debug module with any other debugging module to assure
                // compatibility of react library and compiled tsx files
                debugModules.push('React');

                // React modules are configured in require as "react/*"
                // that's why for his proper unpacking select "react" namespace
                // for debugging.
                debugModules.push('react');

                // Superbundles module could have any module packed inside, so we need
                // to unpack it with every module selected for debug.
                debugModules.push('Superbundles');
            }

            return debugModules;
        }

        const cookie = getCookie();
        if (cookie) {
            const matches = cookie.match(/s3debug=([^;]+)[;]?/);

            if (matches) {
                const debugModules = String(matches[1]);

                if (debugModules === 'true') {
                    debug.IS_OVERALL = true;
                } else {
                    debug.MODULES = getDebugModules(debugModules).map(
                        (currentModule) => `${currentModule}/`
                    );
                }

                // enable hot reload client event stream server if it's enabled by user with a cookie
                const hotReloadMatches = cookie.match(/s3HotReload=([^;]+)[;]?/);
                if (hotReloadMatches) {
                    const GLOBAL = globalThis as unknown as RequireJsLoader.IPatchedGlobal;

                    if (GLOBAL.contents?.modules?.HotReload) {
                        GLOBAL.contents.modules.HotReload.staticServer = `localhost:${hotReloadMatches[1]}`;
                    }
                }
            }
        }

        /**
         * Deal with bundles in depend on debug mode
         */
        function postProcessBundles(
            bundles: RequireJsLoader.IPatchedGlobal['bundles']
        ): RequireJsLoader.IPatchedGlobal['bundles'] {
            if (!bundles || debug.IS_OVERALL) {
                return {};
            }

            if (debug.MODULES.length === 0) {
                return bundles;
            }

            // Возвращает список пакетов, в которые не входят debug модули
            function filterReleasePackages(packageName: string): boolean {
                return bundles[packageName].every((moduleNameWithPlugin) => {
                    const moduleName = moduleNameWithPlugin.split('!').pop();

                    if (moduleName) {
                        return debug.MODULES.every(
                            (debugMode) => moduleName.indexOf(debugMode) !== 0
                        );
                    }

                    return true;
                });
            }

            // Filtering bundles by rejecting packages which are include modules from debug.MODULES
            return Object.keys(bundles)
                .filter(filterReleasePackages)
                .reduce<RequireJsLoader.IPatchedGlobal['bundles']>((memo, packageName) => {
                    memo[packageName] = bundles[packageName];
                    return memo;
                }, {});
        }

        function getModuleName(name: string): string {
            const moduleName = name.split('/')[0];

            if (coreAliases.indexOf(moduleName) !== -1) {
                return 'WS.Core';
            }

            return moduleName;
        }

        /**
         * Creates additional handlers for RequireJS
         */
        function buildHandlers(config: RequireJsLoader.IWsConfig): IHandlersInternal {
            const FILE_EXTENSION = /\.([A-z0-9]+($|\?))/;
            const INTERFACE_MODULE_NAME = /^[A-z0-9\.]+$/;
            const IGNORE_PART = '((?!\\/(cdn|rtpackage|rtpack|demo_src)\\/).)*';
            const WITH_VERSION_MATCH = new RegExp('^' + IGNORE_PART + '\\.[A-z0-9]+(\\?|$)');
            const WITH_SUFFIX_MATCH = new RegExp(
                '^' + IGNORE_PART + '\\.(js|xhtml|tmpl|wml|css|json|jstpl)(\\?|$)'
            );
            const NON_CDN_URLS_MATCH = /(contents|router|bundles)(\.min)?\.js/;
            const FILES_SUFFIX = BUILD_MODE === RELEASE_MODE ? '.min' : '';

            function getResourcesPath(): string {
                let prefix = config.resourceRoot || '';
                if (prefix === '/') {
                    prefix = '';
                }
                return prefix;
            }

            function getDomain(): string {
                const domains = staticFiles.getConfig().domains || [];
                return domains[0];
            }

            // Search for all modules with irregular path
            let modulesPrefixesCache: string[][] | undefined;
            function getModulesPrefixes(): string[][] {
                if (modulesPrefixesCache) {
                    return modulesPrefixesCache;
                }

                const contents = getContents();
                const prefixes = contents?.modules
                    ? Object.keys(contents.modules)
                          .map((moduleName) => [moduleName, contents.modules?.[moduleName].path])
                          .filter(function (modulePath: unknown[]): modulePath is [string, string] {
                              return !!modulePath[1];
                          })
                          // Order paths by length descending so we can find the best one fits in desired URL
                          .sort((a, b) => {
                              return b[1].length - a[1].length;
                          })
                    : [];

                // Base resource path is most suitable
                const resourcesPath = getResourcesPath();
                prefixes.unshift(['', resourcesPath]);

                // Cache result only in case when resourcesPath contains a value
                // That's because of PS issue: it changes resourcesPath value after application starts:
                // https://online.sbis.ru/opendoc.html?guid=0afb656b-e2d4-47ae-b86f-86d1aac5a4ac
                if (resourcesPath) {
                    modulesPrefixesCache = prefixes;
                }

                return prefixes;
            }
            getModulesPrefixes.invalidate = () => {
                modulesPrefixesCache = undefined;
            };

            function reviseModuleName(name: string): string {
                return removeLeadingSlash(name);
            }

            // Returns interface module name according to URL
            function getModuleNameFromUrl(url: string): string | undefined {
                // Skip empty URLs and requireJS's service URLs.
                if (!url || url.indexOf('_@r') > -1) {
                    return;
                }

                let pathname = url;

                // Remove domain name if needed
                if (pathname.substr(0, 2) === '//') {
                    const pathParts = pathname.substr(2).split('/');
                    pathParts[0] = '';
                    pathname = pathParts.join('/');
                }

                // Remove application path if needed
                if (
                    config.IS_SERVER_SCRIPT &&
                    config.APP_PATH &&
                    pathname.substr(0, config.APP_PATH.length) === config.APP_PATH
                ) {
                    pathname = pathname.substr(config.APP_PATH.length);
                }

                // Search for suitable module
                const prefixes = getModulesPrefixes();
                for (let i = 0; i < prefixes.length; i++) {
                    const modulePrefix = prefixes[i][1];
                    // URL should start with base prefix or certain module prefix
                    if (modulePrefix && pathname.substr(0, modulePrefix.length) === modulePrefix) {
                        if (i === 0) {
                            // Base prefix
                            return reviseModuleName(
                                pathname.substr(modulePrefix.length).split('/')[0]
                            );
                        } else {
                            // Certain module prefix
                            return prefixes[i][0];
                        }
                    }
                }
            }

            // Checks interface module that requested in URL
            function checkModule(url: string): void {
                const contents = getContents();
                if (!contents) {
                    return;
                }

                const moduleName = getModuleNameFromUrl(url);
                if (!moduleName) {
                    return;
                }

                // Each UI module can have an individual build number
                const modules = contents.modules || {};
                const moduleConfig = modules[moduleName];

                // Check if module is available
                const basePrefix = getResourcesPath();
                if (basePrefix && !moduleConfig && moduleName.match(INTERFACE_MODULE_NAME)) {
                    throw new ReferenceError(
                        `Interface module "${moduleName}" taken from URL "${url}" is not included into an application.`
                    );
                }

                // Extract service name from module config and add it to the loaded services list
                if (moduleConfig && moduleConfig.service) {
                    const service = moduleConfig.service;
                    const loadedServices = contents.loadedServices || {};
                    if (!loadedServices[service]) {
                        loadedServices[service] = true;
                        contents.loadedServices = loadedServices;
                    }
                }
            }

            // Adds domain signature to the URL if it contains certain resource type
            function getWithDomainByType(
                url: string,
                domain: string,
                allowedTypes?: string[]
            ): string {
                const extension = url.split('?').shift()?.split('.')?.pop()?.toLowerCase();
                let result = url;

                // If there is no types defined add domain to any URL
                if (!allowedTypes || (extension && allowedTypes.indexOf(extension) !== -1)) {
                    result = '//' + domain + result;
                }

                return result;
            }

            // Adds domain signature to the URL if it starts with certain prefix and contains certain resource type
            function getWithDomainByPrefixAndType(
                url: string,
                domain: string,
                allowedPrefixes?: string[],
                allowedTypes?: string[]
            ): string {
                if (allowedPrefixes) {
                    // Add domain if URL starts with one of certain prefixes
                    for (let i = 0, len = allowedPrefixes.length; i < len; i++) {
                        const prefix = allowedPrefixes[i];
                        if (url.indexOf(prefix) === 0) {
                            return getWithDomainByType(url, domain, allowedTypes);
                        }
                    }
                    return url;
                }

                // If there is no prefixes defined add domain to any URL
                return getWithDomainByType(url, domain, allowedTypes);
            }

            function isExcludedUrl(url: string) {
                // 1) we can't use domains for svg url due to cross-origin restrictions:
                // SVG <use> elements don’t currently have any way to ask for cross-origin permissions.
                // https://oreillymedia.github.io/Using_SVG/extras/ch10-cors.html
                // 2) we can't use domains for contents/router meta requests, cdn domain may contain contents/router
                // meta from another application.
                // 3) we can't use domains for manifest.json requests because manifest uses relative urls
                // and with cdn-domain there will be cross domain request for this manifest, but cross domain
                //requests are forbidden
                return (
                    url.indexOf('.svg') !== -1 ||
                    NON_CDN_URLS_MATCH.test(url) ||
                    url.indexOf('manifest.json') !== -1
                );
            }

            // Injects domain signature to the URL if necessary
            function getWithDomain(
                url: string,
                debugCookieValue?: string,
                skipDomains?: boolean
            ): string {
                if (!url || skipDomains || isExcludedUrl(url)) {
                    return url;
                }

                const isDebuggingModule = checkUrlForDebugMode(url, debugCookieValue);
                if (isDebuggingModule && !config.IS_SERVER_SCRIPT) {
                    return url;
                }

                const domain = getDomain();
                const staticConfig = staticFiles.getConfig();

                // URL is absolute and doesn't start with double slash
                if (domain && url[0] === '/' && url[1] !== '/') {
                    const resourcesPath = getResourcesPath();

                    // Skip URLs which located straight in resources folder
                    if (url.indexOf(resourcesPath) === 0) {
                        const rest = url.substr(resourcesPath.length);
                        if (rest.indexOf('/') === -1) {
                            return url;
                        }
                    }

                    // Process URL by prefix and resource type
                    return getWithDomainByPrefixAndType(
                        url,
                        domain,
                        staticConfig.resources,
                        staticConfig.types
                    );
                }

                return url;
            }

            // Returns primary and remote services version for certain URL
            function getVersions(url: string):
                | {
                      context: string;
                      defined: boolean;
                      module: string;
                      name?: string;
                  }
                | undefined {
                if (config.versioning === false) {
                    return;
                }

                const contents = getContents();
                let moduleConfig = null;

                const moduleName = getModuleNameFromUrl(url);
                if (moduleName) {
                    // Each UI module can have an individual build number
                    const modules = (contents && contents.modules) || {};
                    moduleConfig = modules[moduleName];
                }

                const buildNumber = (contents && contents.buildnumber) || '';
                const contextVersion = (contents && contents.contextVersion) || '';
                return {
                    name: moduleName,
                    defined: !!moduleConfig,
                    module: (moduleConfig && moduleConfig.buildnumber) || buildNumber,
                    context: (moduleConfig && moduleConfig.contextVersion) || contextVersion,
                };
            }

            // Injects version signature to the URL if necessary
            function getWithVersion(url: string): string {
                if (typeof url === 'string') {
                    const versions = getVersions(url);
                    const pairs = [];

                    if (versions) {
                        // Has module version
                        if (versions.module) {
                            const moduleHeader = 'x_module=' + versions.module;

                            if (url.indexOf(moduleHeader) === -1) {
                                pairs.push(moduleHeader);
                            }
                        }

                        // Has context version
                        if (versions.context) {
                            const versionHeader = 'x_version=' + versions.context;
                            if (url.indexOf(versionHeader) === -1) {
                                pairs.push(versionHeader);
                            }
                        }

                        // Add parameter to files in resourceRoot to make their URL unique for different applications
                        if (versions.name && !versions.defined && config.product) {
                            const appHeader = 'x_app=' + config.product;
                            if (url.indexOf(appHeader) === -1) {
                                pairs.push('x_app=' + config.product);
                            }
                        }
                    }

                    const versionSignature = pairs.length ? pairs.join('&') : '';

                    // Inject version signature to the URL if it don't have it yet and can be modified this way
                    if (
                        versionSignature &&
                        url.indexOf('?' + versionSignature) === -1 &&
                        WITH_VERSION_MATCH.test(url)
                    ) {
                        const parts = url.split('?', 2);
                        let result = parts[0] + '?';
                        if (parts[1]) {
                            // x_module should be at the beginning of the headers part of the url
                            // otherwise push it at the end of headers list
                            if (parts[1].indexOf('x_module') === -1) {
                                return result + versionSignature + '&' + parts[1];
                            }
                            result += parts[1] + '&';
                        }
                        return result + versionSignature;
                    }
                }

                return url;
            }

            // Injects metaRoot/resourceRoot to the URL if necessary
            function getWithResourceRoot(url: string): string {
                if (typeof url === 'string' && WITH_VERSION_MATCH.test(url)) {
                    const wsConfig = getWsConfig();

                    if (!(wsConfig.resourceRoot && wsConfig.metaRoot)) {
                        return url;
                    }

                    if (
                        url.indexOf(wsConfig.metaRoot) === 0 ||
                        url.indexOf(wsConfig.resourceRoot) === 0
                    ) {
                        return url;
                    }

                    const normalizedUrl = removeLeadingSlash(url);
                    const contents = getContents();
                    const moduleName = getModuleName(normalizedUrl);
                    const moduleInfo = contents && contents.modules && contents.modules[moduleName];

                    // inject metaRoot for root url or any url that isn't from current project
                    if (moduleInfo) {
                        // for external urls we should inject path from contents
                        // e.g. Addon2 from integration_config has path /static/resources/Addon2
                        // but there also can be external service without support of service of static
                        // and path in that case can be '/some-service/resources/MyModule
                        if (moduleInfo.path) {
                            const urlWithoutModuleName = normalizedUrl.replace(moduleName, '');

                            return `${moduleInfo.path}${urlWithoutModuleName}`;
                        }

                        return `${wsConfig.resourceRoot}${normalizedUrl}`;
                    } else {
                        const isRootUrl = normalizedUrl.split('/').length === 1;

                        if (isRootUrl) {
                            return `${wsConfig.metaRoot}${normalizedUrl}`;
                        }
                        return url;
                    }
                }

                return url;
            }

            // check if current url is from debugging module
            function checkUrlForDebugMode(
                url: string,
                debugCookieValue?: string,
                checkReactMode?: boolean
            ): boolean {
                let isDebuggingModule;

                // use transmitted value of s3debug cookie if it exists,
                // otherwise use debug meta info from current requirejs context.
                if (typeof debugCookieValue === 'string') {
                    switch (debugCookieValue) {
                        case 'true':
                            isDebuggingModule = true;
                            break;
                        case 'false':
                        case '':
                            isDebuggingModule = false;
                            break;
                        default:
                            isDebuggingModule = debugCookieValue
                                .split(',')
                                .some((mod) => url.indexOf('/' + mod) !== -1);
                            break;
                    }
                } else {
                    isDebuggingModule = debug.isDebuggingModule(url);
                }

                // we need to check for react mode only if React mode isn't
                // already selected as debugging module
                if (!isDebuggingModule && checkReactMode) {
                    return REACT_MODE === 'debug';
                }

                return isDebuggingModule;
            }

            // Injects suffix signature to the URL if necessary
            function getWithSuffix(
                url: string,
                debugCookieValue?: string,
                _isIE?: boolean,
                direction?: string
            ): string {
                if (typeof url === 'string' && WITH_SUFFIX_MATCH.test(url)) {
                    const suffixes = [];

                    if (url.indexOf('.css') !== -1) {
                        if ((direction || getDirection()) === 'rtl' && url.indexOf('.rtl') === -1) {
                            suffixes.push('.rtl');
                        }
                    }

                    const isDebuggingModule = checkUrlForDebugMode(
                        url,
                        debugCookieValue,
                        url.indexOf('React/third-party/') !== -1
                    );

                    if (FILES_SUFFIX && !isDebuggingModule) {
                        suffixes.push(FILES_SUFFIX);
                    }

                    const suffixSign = suffixes.join('');

                    if (suffixSign && url.indexOf(suffixSign) === -1) {
                        return url.replace(FILE_EXTENSION, suffixSign + '.$1');
                    }
                }

                return url;
            }

            function getWithUserDefined(url: string): string {
                return url;
            }

            return {
                config,
                getModuleNameFromUrl,
                getModulesPrefixes,
                checkModule,
                getWithDomain,
                getWithSuffix,
                getWithVersion,
                getWithResourceRoot,
                getWithUserDefined
            };
        }

        /**
         * Создаёт котроллер кастомных пакетов. Контроллер обрабатывает все запросы require-а,
         * грузит оглавления пакетов для модуля, за компонентом которого идёт запрос и
         * проверяет входит ли компонент в пакет, если входит, то переналвет запрос за пакетом.
         */
        function createLoader() {
            const bundlesMap: { [packageName: string]: Record<string, string> } = {};
            const extPackage = /\.(js|css)$/;

            function isDebugModule(name: string) {
                if (debug.IS_OVERALL) {
                    return true;
                }

                return debug.MODULES.some((moduleName) => {
                    return name.indexOf(moduleName) === 0;
                });
            }

            function isPackage(name: string) {
                return name.split('.').pop() === 'package';
            }

            function isBundlesMap(name: string) {
                return name.split('/').pop() === 'packageMap.json';
            }

            function isBundle(moduleName: string, name: string) {
                return bundlesMap[moduleName].hasOwnProperty(name);
            }

            function bundlesDisabled(name: string) {
                return IS_SERVER_SCRIPT || isDebugModule(name);
            }

            function loadPackage(name: string, url: string, require: RequireJsLoader.IRequireExt) {
                const contexts = require.s.contexts._;

                contexts.load(name, contexts.nameToUrl(url.replace(extPackage, '')), true);
            }

            function loadModule(
                moduleName: string,
                name: string,
                plugin: string,
                require: RequireJsLoader.IRequireExt,
                defaultLoad: () => void
            ) {
                const requireName = `${plugin ? `${plugin}!` : ''}${name}`;

                if (isBundle(moduleName, requireName)) {
                    loadPackage(name, bundlesMap[moduleName][requireName], require);
                } else {
                    defaultLoad();
                }
            }

            function processModule(name: string, plugin: string, defaultLoad: () => void) {
                const contents = getContents();
                const moduleName = getModuleName(name);
                const moduleInfo = contents && contents.modules && contents.modules[moduleName];

                if (!moduleInfo || bundlesDisabled(name)) {
                    defaultLoad();
                    return;
                }

                if (bundlesMap.hasOwnProperty(moduleName)) {
                    loadModule(
                        moduleName,
                        name,
                        plugin,
                        requirejs as RequireJsLoader.IRequireExt,
                        defaultLoad
                    );

                    return;
                }

                if (moduleInfo.hasOwnProperty('hasBundles')) {
                    requirejs(
                        [moduleName + '/packageMap.json'],
                        (bundles: Record<string, string>) => {
                            bundlesMap[moduleName] = bundles;

                            loadModule(
                                moduleName,
                                name,
                                plugin,
                                requirejs as RequireJsLoader.IRequireExt,
                                defaultLoad
                            );
                        },
                        (err: Error) => {
                            defaultLoad();
                            logError(err);
                        }
                    );

                    return;
                }

                bundlesMap[moduleName] = {};

                defaultLoad();
            }

            function load(name: string, plugin: string, defaultLoad: () => void) {
                if (isPackage(name) || isBundlesMap(name)) {
                    defaultLoad();

                    return;
                }

                processModule(name, plugin, defaultLoad);
            }

            return {
                load,
            };
        }

        // use getWithSuffix function in 2 cases:
        // 1) client-side JavaScript
        // 2) server-side React if react mode is release
        function isSuffixNeeded(url: string | undefined) {
            if (typeof url === 'string' && url.indexOf('React/third-party/') !== -1) {
                // when react is in debug mode by cookie, don't add min suffix
                if (debug.isDebuggingModule(url)) {
                    return false;
                }
                return REACT_MODE === 'release';
            }

            return !IS_SERVER_SCRIPT;
        }

        /**
         * Patches nameToUrl method of specified context as decorator with URL post processing
         * @param context RequireJS context to patch
         * @param withHandlers Handlers to apply in patch
         */
        function patchContext(
            context: RequireJsLoader.IRequireContext,
            withHandlers: IHandlersInternal
        ): (() => void) | undefined {
            if (context.isPatchedByWs) {
                return;
            }

            context.isPatchedByWs = true;

            const HAS_PROTOCOL = /^([a-z]+:)?\/\//;
            const originalNameToUrl = context.nameToUrl;

            // Converts module name to the file path. Support cases where moduleName may actually be just a URL.
            context.nameToUrl = function nameToUrlDecorator(
                name: string,
                ext?: string,
                skipExt?: boolean
            ): string {
                let skipExtActual = skipExt;
                /*
                 * For URLs with domain name included RequireJS does the 2nd call of nameToUrl() and passes there 'name'
                 * argument which already contains the extension and empty 'ext' argument so that default implementation
                 * below simply adds '.js' extension to the result URL.
                 * To bypass this behaviour we have to manage 'skipExt' flag if extension already presented in URL.
                 */
                if (name && !ext && !skipExtActual) {
                    const nameDotIndex = name.lastIndexOf('.');
                    const nameExt = nameDotIndex > -1 ? name.substr(nameDotIndex) : '';
                    const contents = (globalThis as unknown as RequireJsLoader.IPatchedGlobal)
                        .contents;

                    // Only deal with templates
                    if (nameExt === '.wml' || nameExt === '.tmpl') {
                        skipExtActual = true;
                    }

                    if (contents?.extensionForTemplate === 'js') {
                        skipExtActual = false;
                    }
                }

                let url = originalNameToUrl(name, ext, skipExtActual);

                // Skip URLs with protocol prefix
                if (HAS_PROTOCOL.test(url)) {
                    return url;
                }

                const wsConfig = getWsConfig();

                // check url validity only in service of static because this application
                // has different metaRoot(/resources/) and resourceRoot(/static/resources/)
                if (wsConfig.metaRoot && wsConfig.resourceRoot) {
                    if (url.indexOf(wsConfig.metaRoot) === 0) {
                        // check whether this url is module file to be asked from service of static
                        // or root meta to be asked from presentation service
                        const moduleName = withHandlers.getModuleNameFromUrl(
                            url.replace(wsConfig.metaRoot, wsConfig.resourceRoot)
                        );
                        const contents = getContents();
                        const moduleInfo = moduleName && contents?.modules?.[moduleName];

                        // normalize url if it has incorrect resourceRoot
                        if (moduleInfo) {
                            url = url.replace(wsConfig.metaRoot, wsConfig.resourceRoot);
                        }
                    }
                }

                if (withHandlers.getWithSuffix && isSuffixNeeded(url)) {
                    url = withHandlers.getWithSuffix(url);
                }

                if (withHandlers.getWithVersion) {
                    url = withHandlers.getWithVersion(url);
                }

                if (!IS_SERVER_SCRIPT && withHandlers.getWithDomain) {
                    url = withHandlers.getWithDomain(url);
                }

                if (withHandlers.getWithUserDefined) {
                    url = withHandlers.getWithUserDefined(url);
                }

                return url;
            };

            /**
             * Executes the text. Normally just uses eval, but can be modified
             * to use a better, environment-specific call. Only used for transpiling
             * loader plugins, not for plain JS modules.
             * @param {String} text the text to execute/evaluate.
             */
            context.exec = function patchExec(text: string) {
                try {
                    // eslint-disable-next-line
                    return eval(text);
                } catch (error) {
                    const errorMessage = `An error occurred during eval of text: ${text}. Error: ${error}`;

                    throw new Error(errorMessage);
                }
            };

            let originalLoad: RequireJsLoader.IRequireContext['load'];
            if (withHandlers.checkModule) {
                originalLoad = context.load;
                /**
                 * Process the request to load a module.
                 * @param id The name of the module.
                 * @param url The URL to the module.
                 * @param [disableLoader] Disable bundles.
                 */
                context.load = function loadDecorator(
                    id: string,
                    url: string,
                    disableLoader?: boolean
                ): void {
                    if (rtPack.isPacked(id)) {
                        return;
                    }

                    withHandlers.checkModule(url);

                    if (disableLoader || url.indexOf('.package.min') !== -1) {
                        originalLoad(id, url);

                        return;
                    }

                    loader.load(id, '', () => {
                        originalLoad(id, url);
                    });
                };
            }

            // Return the function which removes patch
            return () => {
                if (context.isPatchedByWs) {
                    context.nameToUrl = originalNameToUrl;

                    delete context.isPatchedByWs;
                }

                if (originalLoad) {
                    context.load = originalLoad;
                }
            };
        }

        /**
         * Before RequireJS script node will be insert into DOM
         * @param node Script DOM element
         */
        function onNodeCreated(node: HTMLScriptElement): void {
            node.setAttribute('data-vdomignore', 'true');
        }

        /**
         * Creates startup config for RequireJS
         * @param baseUrl Base URL
         * @param wsPath RequireJsLoader path
         * @param resourcesPath Resources path
         * @param [initialContents] Optional config
         */
        function createConfig(
            baseUrl: string,
            wsPath: string,
            resourcesPath: string,
            initialContents?: RequireJsLoader.IContents
        ): RequireConfig {
            // Normalize wsConfig
            const wsConfig = getWsConfig();

            // Meta path
            const metaPath = (wsConfig && wsConfig.metaRoot) || DEFAULT_META_PATH || resourcesPath;
            const reactRoot = pathJoin(resourcesPath, 'React/third-party/');

            wsConfig.APP_PATH = baseUrl;

            // builder configures RESOURCES_PATH by himself
            if (!wsConfig.IS_BUILDER) {
                wsConfig.RESOURCES_PATH = resourcesPath;
            }

            // Build config
            const config: RequireConfig = {
                baseUrl,
                map: {
                    '*': {
                        i18n: 'I18n/singletonI18n',
                        optional: 'RequireJsLoader/plugins/optional',
                    },
                },
                paths: {
                    // Plugins
                    browser: pathJoin(resourcesPath, 'RequireJsLoader/plugins/browser'),
                    cdn: pathJoin(resourcesPath, 'RequireJsLoader/plugins/cdn'),
                    css: pathJoin(resourcesPath, 'RequireJsLoader/plugins/css'),
                    datasource: pathJoin(resourcesPath, 'RequireJsLoader/plugins/datasource'),
                    json: pathJoin(resourcesPath, 'RequireJsLoader/plugins/json'),
                    html: pathJoin(resourcesPath, 'RequireJsLoader/plugins/html'),
                    is: pathJoin(resourcesPath, 'RequireJsLoader/plugins/is'),
                    'is-api': pathJoin(resourcesPath, 'RequireJsLoader/plugins/is-api'),
                    'native-css': pathJoin(resourcesPath, 'RequireJsLoader/plugins/native-css'),
                    normalize: pathJoin(resourcesPath, 'RequireJsLoader/plugins/normalize'),
                    optional: pathJoin(resourcesPath, 'RequireJsLoader/plugins/optional'),
                    order: pathJoin(resourcesPath, 'RequireJsLoader/plugins/order'),
                    preload: pathJoin(resourcesPath, 'RequireJsLoader/plugins/preload'),
                    remote: pathJoin(resourcesPath, 'RequireJsLoader/plugins/remote'),
                    template: pathJoin(resourcesPath, 'RequireJsLoader/plugins/template'),
                    text: pathJoin(resourcesPath, 'RequireJsLoader/plugins/text'),
                    tmpl: pathJoin(resourcesPath, 'RequireJsLoader/plugins/tmpl'),
                    wml: pathJoin(resourcesPath, 'RequireJsLoader/plugins/wml'),
                    xml: pathJoin(resourcesPath, 'RequireJsLoader/plugins/xml'),

                    // React packages
                    react: pathJoin(reactRoot, 'react/react'),
                    'react/jsx-dev-runtime': pathJoin(
                        reactRoot,
                        'react/jsx-dev-runtime/react-jsx-dev-runtime'
                    ),
                    'react/jsx-runtime': pathJoin(reactRoot, 'react/jsx-runtime/react-jsx-runtime'),
                    'react-dom': pathJoin(reactRoot, 'react-dom/react-dom'),
                    'react-dom/server': pathJoin(
                        reactRoot,
                        'react-dom/server/react-dom-server.browser'
                    ),
                    'react-dom/test-utils': pathJoin(
                        reactRoot,
                        'react-dom/test-utils/react-dom-test-utils'
                    ),
                    'react-dom/testing': pathJoin(reactRoot, 'react-dom/testing/react-dom-testing'),
                    'react-test-renderer': pathJoin(
                        reactRoot,
                        'react-test-renderer/react-test-renderer'
                    ),

                    // themes directory
                    themes: pathJoin(resourcesPath, 'ThemesModule'),

                    // jQuery must die
                    jquery: '/cdn/JQuery/jquery/3.3.1/jquery-min',
                },
                onNodeCreated,
                waitSeconds: IS_SERVER_SCRIPT ? 0 : LOADING_TIMEOUT,
            };

            // If WS.Core in application
            if (wsPath) {
                objectAssign(config.paths || {}, {
                    // tlib.js location to use it as AMD dependency in compiled code
                    tslib: pathJoin(wsPath, 'ext/tslib'),

                    // Compatibility with old modules from WS
                    WS: removeTrailingSlash(wsPath),
                    Core: pathJoin(wsPath, 'core'),
                    Lib: pathJoin(wsPath, 'lib'),
                    Ext: pathJoin(wsPath, 'lib/Ext'),
                    Deprecated: pathJoin(resourcesPath, 'WS.Deprecated'),
                    Helpers: pathJoin(wsPath, 'core/helpers'),
                    Transport: pathJoin(wsPath, 'transport'),
                    bootup: pathJoin(wsPath, 'res/js/bootup'),
                    'bootup-min': pathJoin(wsPath, 'res/js/bootup-min'),
                    'old-bootup': pathJoin(wsPath, 'res/js/old-bootup'),
                });
            }

            // Check and handle some options
            const contents = initialContents || getContents();

            if (contents) {
                objectAssign(config, contents);

                if (contents.modules) {
                    for (const name in contents.modules) {
                        if (config.paths && contents.modules.hasOwnProperty(name)) {
                            const moduleConfig = contents.modules[name];

                            config.paths[name] = moduleConfig.path
                                ? pathJoin(moduleConfig.path)
                                : pathJoin(resourcesPath, name);
                        }
                    }
                }
            }

            // FIXME: we don't replace control on the server until we support SSR with react
            if (!IS_SERVER_SCRIPT) {
                const cookies = getCookie();

                if (cookies) {
                    /*
                For now, reactFeatures can accept only one valid value: Control.
                Eventually, we want to provide a variety of flags to help people prepare for migration to react.
                Some ideas for flags:
                1) Replace UI/Base:Control with React.Component.
                2) Purity check for defaultProps. Get defaultProps twice and if there's a difference - log an error.
                 */
                    const matches = cookies.match(/reactFeatures=([^;]+)[;]?/);
                    if (config.paths && matches && matches[1] === 'Control') {
                        config.paths['UI/Base'] = pathJoin(resourcesPath, 'UI/BaseReact');
                        config.paths['UI/_base/Control'] = pathJoin(
                            resourcesPath,
                            'UI/_react/Control/ControlMirror'
                        );
                    }
                }
            }

            // save all non root paths from requirejs config paths
            requireJsPaths = objectAssign({}, config.paths || {});

            // all root paths should be declared at last in requirejs config paths
            if (wsPath) {
                objectAssign(config.paths || {}, {
                    // Router is vital
                    router: pathJoin(metaPath, 'router'),

                    // info from all pagex files
                    'pages-info': pathJoin(metaPath, 'pages-info'),
                    'navx-towarmup-info': pathJoin(metaPath, 'navx-towarmup-info'),
                    'wasaby-routes': pathJoin(metaPath, 'wasaby-routes'),

                    // info from all router.js files
                    'routes-info': pathJoin(metaPath, 'routes-info'),
                });
            }

            return config;
        }

        // Applies startup config for RequireJS
        function applyConfig(
            require: Require,
            wsConfig: RequireJsLoader.IWsConfig,
            context?: string
        ): Require {
            const appPath = (wsConfig && wsConfig.appRoot) || '/';
            const resourcesPath = wsConfig ? wsConfig.resourceRoot || DEFAULT_RESOURCES_PATH : '';
            const wsPath = (wsConfig && wsConfig.wsRoot) || '';
            const globalEnv = globalThis as unknown as RequireJsLoader.IPatchedGlobal;
            const contents = getContents();

            if (globalEnv.bundles && contents && BUILD_MODE === RELEASE_MODE) {
                contents.bundles = postProcessBundles(globalEnv.bundles);
            }

            const config = createConfig(appPath, wsPath, resourcesPath);

            if (context) {
                config.context = context;
            }

            return require.config(config);
        }

        // Initiates application environment
        function prepareEnvironment(
            require: RequireJsLoader.IRequireExt,
            withHandlers: IHandlersInternal
        ): void {
            // Mark root RequireJS instance in purpose of Wasaby Dev Tools
            require.isWasaby = true;

            // Patch define() function
            if (typeof define === 'function') {
                define = patchDefine(require, define);
            }

            // Set resource load handler
            require.onResourceLoad = createResourceLoader(require.onResourceLoad);

            // Patch default context
            patchContext(require.s.contexts._, withHandlers);
        }

        const localWsConfig = getWsConfig();
        const globalEnv = globalThis as unknown as RequireJsLoader.IPatchedGlobal;

        // check also global object for product name, in old WS3 pages in could be inserted
        // before wsConfig initialization.
        localWsConfig.product = localWsConfig.product || globalEnv.product || '';

        // Build URL handlers
        const handlers = buildHandlers(localWsConfig);

        const loader = createLoader();

        // Prevent from several initializations because RT packing could grab this module
        if (!localWsConfig.IS_INITIALIZED) {
            // Normalize wsConfig
            localWsConfig.IS_INITIALIZED = true;
            localWsConfig.BUILD_MODE = BUILD_MODE;
            localWsConfig.IS_OVERALL_DEBUG = debug.IS_OVERALL;
            localWsConfig.DEBUGGING_MODULES = debug.MODULES;
            localWsConfig.IS_SERVER_SCRIPT = IS_SERVER_SCRIPT;

            // Prepare environment with patches
            prepareEnvironment(requirejs as RequireJsLoader.IRequireExt, handlers);

            // Initialize RequireJS in browser
            if (!IS_SERVER_SCRIPT) {
                applyConfig(requirejs, localWsConfig);
            }
        }

        return () => ({
            BUILD_MODE,
            RELEASE_MODE,
            DEBUG_MODE,
            debug,
            patchContext,
            getWsConfig,
            getRequireJsPaths,
            createConfig,
            applyConfig,
            prepareEnvironment,
            handlers,
            loader,
            getDirection,
            getContents,
            getCookie,
            getDebugModules
        });
    })()
);

/**
 * Because of not standard module definition make its API visible for others via dedicated declaration
 */
declare module 'RequireJsLoader/config' {
    export type IHandlers = IHandlersInternal;

    export const BUILD_MODE: RequireJsLoader.BuildMode;

    export const RELEASE_MODE: RequireJsLoader.BuildMode;

    export const DEBUG_MODE: RequireJsLoader.BuildMode;

    export const debug: IDebug;

    export const handlers: IHandlersInternal;

    export const loader: ILoader;

    export function patchContext(
        context: RequireJsLoader.IRequireContext,
        handlers: Partial<IHandlersInternal>
    ): () => void;

    export function getWsConfig(): RequireJsLoader.IWsConfig;

    export function getRequireJsPaths(): object;

    export function createConfig(
        baseUrl: string,
        wsPath?: string,
        resourcesPath?: string,
        initialContents?: RequireJsLoader.IContents
    ): RequireConfig;

    export function applyConfig(
        require: Require,
        wsConfig: RequireJsLoader.IWsConfig,
        context?: string
    ): Require;

    export function prepareEnvironment(
        require: RequireJsLoader.IRequireExt,
        withHandlers: IHandlersInternal
    ): void;

    export function getDirection(): string;

    export function getContents(): RequireJsLoader.IContents;

    export function getCookie(): string;

    export function getDebugModules(cookie: string): string[];
}
