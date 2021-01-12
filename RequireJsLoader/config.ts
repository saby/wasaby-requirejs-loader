/**
 * Configures RequireJS on Wasaby environment.
 */
interface IDebug {
    MODULES: string[];
    IS_OVERALL: boolean;
    isEnabled(): boolean;
    isDebuggingModule(url: string): boolean;
}

interface IGetModulePrefixes {
    (): string[][];
    invalidate(): void;
}

interface IHandlersInternal {
    config: RequireJsLoader.IWsConfig;
    getModuleNameFromUrl: (url: string) => string;
    getModulesPrefixes: IGetModulePrefixes;
    checkModule: (url: string) => void;
    getWithDomain: (url: string) => string;
    getWithSuffix: (url: string) => string;
    getWithVersion: (url: string) => string;
    getWithUserDefined?: (url: string) => string;
}

/**
 * This code should be executed before any other module load that's why it's a self-invoking function.
 */
define('RequireJsLoader/config', (() => {
    let requireJsSubstitutions: Object = {};
    // Superglobal root
    const GLOBAL: RequireJsLoader.IPatchedGlobal = (function(): RequireJsLoader.IPatchedGlobal {
        // tslint:disable-next-line:ban-comma-operator
        return this || (0, eval)('this');
    }());

    // Check if we're on server side
    const IS_SERVER_SCRIPT: boolean = typeof window === 'undefined';

    // Default loading timeout for RequireJS
    const DEFAULT_LOADING_TIMEOUT = 60;

    // Resource loading timeout for RequireJS
    const LOADING_TIMEOUT: number = getWsConfig().moduleLoadingTimeout || DEFAULT_LOADING_TIMEOUT;

    // Default resources path
    const DEFAULT_RESOURCES_PATH = 'resources';

    // Release mode
    const RELEASE_MODE: RequireJsLoader.BuildMode = 'release';

    // Debug mode
    const DEBUG_MODE: RequireJsLoader.BuildMode = 'debug';

    // Application build mode
    const BUILD_MODE: RequireJsLoader.BuildMode = GLOBAL.contents && GLOBAL.contents.buildMode || DEBUG_MODE;

    // Path to react on CDN with version
    const REACT_CDN_PATH = '/cdn/React/17.0.1/';

    function getWsConfig(): RequireJsLoader.IWsConfig {
        return GLOBAL.wsConfig || (GLOBAL.wsConfig = {});
    }

    function getContents(): RequireJsLoader.IContents {
        return GLOBAL.contents;
    }

    function logError(err: Error): void {
        if (typeof console === 'object') {
            // tslint:disable-next-line:no-console
            console.error(err);
        } else {
            throw err;
        }
    }

    /**
     * Cross-browser Object.assign implementation
     */
    function objectAssign(target: object, source: object): object {
        if (Object.assign) {
            Object.assign(target, source);
            return target;
        }

        for (const name in source) {
            if (source.hasOwnProperty(name)) {
                target[name] = source[name];
            }
        }
        return target;
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

    function getCookie(): string {
        try {
            return typeof document === 'object' && String(document.cookie);
        } catch (err) {
            logError(err);
        }
    }

    /**
     * На страницах OnlineSbisRu/CompatibleTemplate зависимости пакуются в rt-пакеты и собираются DepsCollector(saby/UI)
     * Поэтому в глобальной переменной храним имена запакованных в rt-пакет модулей
     * И игнорируем попытки require
     * https://online.sbis.ru/opendoc.html?guid=348beb13-7b57-4257-b8b8-c5393bee13bd
     * TODO следует избавится при отказе от rt-паковки
     */
    const rtPack = {
        MODULES_NAMES: undefined,

        getModules(): Record<string, string> {
            if (IS_SERVER_SCRIPT || !GLOBAL.rtpackModuleNames) {
                return {};
            }
            try {
                return JSON.parse(GLOBAL.rtpackModuleNames);
            } catch (err) {
                logError(err);
                return {};
            }
        },

        isPacked(moduleName: string): boolean {
            if (!this.MODULES_NAMES) {
                this.MODULES_NAMES = this.getModules();
            }
            return this.MODULES_NAMES && this.MODULES_NAMES.hasOwnProperty(moduleName);
        }
    };

    /**
     * Work with static files
     */
    const staticFiles = {
        prevConfig: null,
        prevStaticDomains: null,

        getConfig(): RequireJsLoader.IStaticResourcesConfig {
            const wsConfig = getWsConfig();
            if (this.prevConfig && wsConfig.staticDomains === this.prevStaticDomains) {
                return this.prevConfig;
            }

            // Normailze config for statics
            const config = wsConfig.staticDomains instanceof Array ? {
                domains: wsConfig.staticDomains,
                types: ['js']
            } : (wsConfig.staticDomains || {
                domains: [],
                types: ['js']
            });

            this.prevConfig = config;
            this.prevStaticDomains = wsConfig.staticDomains;

            return config;
        }
    };

    /**
     * Wraps global define() function of RequireJS
     * @param require Root RequireJS instance
     * @param original Original define() function
     * @return Wrapped function
     */
    function patchDefine(require: RequireJsLoader.IRequireExt, original: RequireDefine): RequireDefine {
        const context = require.s.contexts._;
        const contents = getContents();
        const wsCoreIncluded = contents?.modules?.['WS.Core'];

        // Returns required dependencies for candidate
        function needDependencyFor(name: string, candidateDeps: string[], skipNamespace: string): string[] {
            if (
                typeof name !== 'string' || // Don't add to anonymous
                name.indexOf('/') === -1 || // Don't add to special names
                candidateDeps.indexOf(name) > -1 || // Don't add to each other
                name.substr(0, skipNamespace.length) === skipNamespace // Break cycles we know about
            ) {
                return [];
            }

            return candidateDeps.filter((depName) => {
                return depName && !context.defined[depName]; // Add if module is not defined yet
            });
        }

        // Adds extra dependencies for every defined module to force their loading
        function patchedDefine(name: string, deps?: string[], callback?: Function): void {
            const toAdd = needDependencyFor(name, [
                // Force load polyfills
                IS_SERVER_SCRIPT ? '' : (wsCoreIncluded ? 'Core/polyfill' : ''),
                // Force load extra patches for RequireJS
                'RequireJsLoader/autoload'

                /**
                 * RequireJsLoader modules should not have any magic extra dependencies
                 * from RequireJsLoader, it could cause multiple cycle dependencies between
                 * from each other. All dependencies of the modules should be strictly declared
                 * from the beginning.
                 */
            ], 'RequireJsLoader/');

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
            return original.call(this, name, finalDeps, finalCallback);
        }

        patchedDefine.amd = original.amd;

        return patchedDefine as RequireDefine;
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
                let exports: Record<string, unknown> | Function = context.defined[map.id] as Record<string, unknown>;
                if (exports && !exports._packedLibrary) {
                    // Lookup for ES6 default export if available
                    if (exports && exports.__esModule && exports.default) {
                        exports = exports.default;
                    }

                    if (typeof exports === 'function') {
                        // Give _moduleName to each class and BTW mark private classes
                        const proto = exports.prototype;
                        if (!proto.hasOwnProperty('_moduleName')) {
                            proto._moduleName = map.name;
                            if (map.name.indexOf('/_') !== -1) {
                                proto._isPrivateModule = true;
                            }
                        }
                    } else if (
                        // Give _moduleName to each private or unnamed class in public library
                        exports
                        && typeof exports === 'object'
                        && Object.getPrototypeOf(exports) === Object.prototype
                        && map.name.indexOf('/_') === -1
                    ) {
                        Object.keys(exports).forEach((name) => {
                            const module = exports[name];
                            if (typeof module === 'function') {
                                const proto = module.prototype;
                                if (proto && (proto._isPrivateModule || !proto.hasOwnProperty('_moduleName'))) {
                                    proto._moduleName = map.name + ':' + name;
                                }
                            }
                        });
                    }
                }
            }

            if (parent) {
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
            return url && (
                this.IS_OVERALL ||
                this.MODULES.some((mod) => url.indexOf('/' + mod) !== -1)
            );
        }
    };

    const cookie = getCookie();
    if (cookie) {
        const matches = cookie.match(/s3debug=([^;]+)[;]?/);
        if (matches) {
            const debugModules = String(matches[1]);
            if (debugModules === 'true') {
                debug.IS_OVERALL = true;
            } else {
                debug.MODULES = debugModules.split(',');
            }
        }
    }

    /**
     * Deal with bundles in depend on debug mode
     */
    function postProcessBundles(bundles: string[]): object {
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
                return debug.MODULES.every((debugMode) => moduleName.indexOf(debugMode) === -1);
            });
        }

        // Filtering bundles by rejecting packages which are include modules from debug.MODULES
        return Object.keys(bundles)
            .filter(filterReleasePackages)
            .reduce((memo, packageName) => {
                memo[packageName] = bundles[packageName];
                return memo;
            }, {});
    }

    /**
     * Creates additional handlers for RequireJS
     */
    function buildHandlers(config: RequireJsLoader.IWsConfig): IHandlersInternal {
        const FILE_EXTENSION = /\.([A-z0-9]+($|\?))/;
        const INTERFACE_MODULE_NAME = /^[A-z0-9\.]+$/;
        const IGNORE_PART = '((?!\\/(cdn|rtpackage|rtpack|demo_src)\\/).)*';
        const WITH_VERSION_MATCH = new RegExp('^' + IGNORE_PART + '\\.[A-z0-9]+(\\?|$)');
        const WITH_SUFFIX_MATCH = new RegExp('^' + IGNORE_PART + '\\.(js|xhtml|tmpl|wml|css|json|jstpl)(\\?|$)');
        const EXTENSION_MATCH = /(\.min)?\.js/;
        const FILES_SUFFIX = BUILD_MODE === RELEASE_MODE ? '.min' : '';

        function getResourcesPath(): string {
            let prefix = config.resourceRoot || '';
            if (prefix === '/') {
                prefix = '';
            }
            return prefix;
        }

        // Returns domain for certain URL
        function getDomain(url: string): string {
            const domains = staticFiles.getConfig().domains || [];
            return domains[0];
        }

        // Search for all modules with irregular path
        let modulesPrefixesCache: string[][];
        function getModulesPrefixes(): string[][] {
            if (modulesPrefixesCache) {
                return modulesPrefixesCache;
            }

            const contents = getContents();
            const prefixes = contents && contents.modules ?
                Object.keys(contents.modules)
                    .map((moduleName) => [moduleName, contents.modules[moduleName].path])
                    .filter((modulePath) => modulePath[1])
                    // Order paths by length descending so we can find the best one fits in desired URL
                    .sort((a, b) => b[1].length - a[1].length) :
                [];

            // Base resource path is most suitable
            const resourcesPath = getResourcesPath();
            prefixes.unshift(['', resourcesPath]);

            // Cache result only in case when resourcesPath conatains a value
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
        function getModuleNameFromUrl(url: string): string {
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
                        return reviseModuleName(pathname.substr(modulePrefix.length).split('/')[0]);
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
                throw new ReferenceError(`Interface module "${moduleName}" taken from URL "${url}" is not included into an application.`);
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
        function getWithDomainByType(url: string, domain: string, allowedTypes: string[]): string {
            const extension = url.split('?').shift().split('.').pop().toLowerCase();
            let result = url;

            // If there is no types defined add domain to any URL
            if (!allowedTypes || allowedTypes.indexOf(extension) !== -1) {
                result = '//' + domain + result;
            }

            return result;
        }

        // Adds domain signature to the URL if it starts with certain prefix and contains certain resource type
        function getWithDomainByPrefixAndType(
            url: string,
            domain: string,
            allowedPrefixes: string[],
            allowedTypes: string[]
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

        // Injects domain signature to the URL if necessary
        function getWithDomain(url: string): string {
            if (!url) {
                return url;
            }

            const domain = getDomain(url);
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
                return getWithDomainByPrefixAndType(url, domain, staticConfig.resources, staticConfig.types);
            }

            return url;
        }

        // Returns primary and remote services version for certain URL
        function getVersions(url: string): {
            context: string;
            defined: boolean;
            module: string;
            name: string;
        } {
            if (config.versioning === false) {
                return;
            }

            const contents = getContents();
            let moduleConfig = null;

            const moduleName = getModuleNameFromUrl(url);
            if (moduleName) {
                // Each UI module can have an individual build number
                const modules = contents && contents.modules || {};
                moduleConfig = modules[moduleName];
            }

            const buildNumber = contents && contents.buildnumber || '';
            const contextVersion = contents && contents.contextVersion || '';
            return {
                name: moduleName,
                defined: !!moduleConfig,
                module: moduleConfig && moduleConfig.buildnumber || buildNumber,
                context: moduleConfig && moduleConfig.contextVersion || contextVersion
            };
        }

        // Injects version signature to the URL if necessary
        function getWithVersion(url: string): string {
            const versions = getVersions(url);
            const pairs = [];

            if (versions) {
                if (versions.module) {
                    // Has module version
                    pairs.push('x_module=' + versions.module);
                }

                if (versions.context) {
                    // Has context version
                    pairs.push('x_version=' + versions.context);
                }

                // Add parameter to files in resourceRoot to make their URL unique for different applications
                if (versions.name && !versions.defined && config.product) {
                    pairs.push('x_app=' + config.product);
                }

                if (url && !versions.name) {
                    let normalizedUrl = url.replace(EXTENSION_MATCH, '');

                    // url can be completed, e.g. /react.min.js or /react.js
                    // so we need to normalize it first to check in requirejs substitutions
                    // for a match
                    if (url.charAt(0) === '/') {
                        normalizedUrl = normalizedUrl.substr(1);
                    }

                    // get normalized url if it's exceptional dependency that have
                    // special url in requirejs config.
                    // e.g. 'jquery' has an url '/cdn/JQuery/jquery/3.3.1/jquery-min'
                    // and getWithVersion function should return proper url according
                    // to this substitution
                    if (requireJsSubstitutions.hasOwnProperty(normalizedUrl)) {
                        url = requireJsSubstitutions[normalizedUrl];
                    }
                }
            }

            const versionSignature = pairs.length ? '?' + pairs.join('&') : '';

            // Inject version signature to the URL if it don't have it yet and can be modified this way
            if (
                versionSignature &&
                typeof url === 'string' &&
                url.indexOf(versionSignature) === -1 &&
                WITH_VERSION_MATCH.test(url)
            ) {
                const parts = url.split('?', 2);
                return parts[0] + versionSignature + (parts[1] ? '&' + parts[1] : '');
            }

            return url;
        }

        // Injects suffix signature to the URL if necessary
        function getWithSuffix(url: string): string {
            if (FILES_SUFFIX && !debug.isDebuggingModule(url)) {
                const suffixSign = FILES_SUFFIX + '.';

                // Inject suffix signature to the URL if it don't have it yet and can be attracted to
                if (
                    suffixSign &&
                    typeof url === 'string' &&
                    url.indexOf(suffixSign) === -1 &&
                    WITH_SUFFIX_MATCH.test(url)
                ) {
                    return url.replace(FILE_EXTENSION, suffixSign + '$1');
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
            getWithUserDefined
        };
    }

    /**
     * Patches nameToUrl method of specified context as decorator with URL post processing
     * @param context RequireJS context to patch
     * @param withHandlers Handlers to apply in patch
     */
    function patchContext(
        context: RequireJsLoader.IRequireContext,
        withHandlers: Partial<IHandlersInternal>
    ): () => void {
        if (context.isPatchedByWs) {
            return;
        }
        context.isPatchedByWs = true;

        const HAS_PROTOCOL = /^([a-z]+:)?\/\//;
        const originalNameToUrl = context.nameToUrl;

        /**
         * Converts module name to the file path. Supports cases where moduleName may actually be just an URL.
         * @param name The name of the module.
         * @param [ext] The extension of the module
         * @param [skipExt] Skip extension
         */
        context.nameToUrl = function nameToUrlDecorator(name: string, ext?: string, skipExt?: boolean): string {
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
                // Only deal with templates
                if (nameExt === '.wml' || nameExt === '.tmpl') {
                    skipExtActual = true;
                }
            }

            let url = originalNameToUrl(name, ext, skipExtActual);

            // Skip URLs with protocol prefix
            if (HAS_PROTOCOL.test(url)) {
                return url;
            }

            if (!IS_SERVER_SCRIPT && withHandlers.getWithSuffix) {
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

        let originalLoad;
        if (withHandlers.checkModule) {
            originalLoad = context.load;
            /**
             * Process the request to load a module.
             * @param id The name of the module.
             * @param url The URL to the module.
             */
            context.load = function loadDecorator(id: string, url: string): void {
                if (rtPack.isPacked(id)) {
                    return;
                }
                withHandlers.checkModule(url);
                return originalLoad(id, url);
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
                originalLoad = null;
            }
        };
    }

    /**
     * Before RequireJS script node will be insert into DOM
     * @param node Script DOM element
     * @param config Context config
     * @param moduleName the name of the module.
     * @param url Requested module URL
     */
    function onNodeCreated(node: HTMLScriptElement, config?: object, moduleName?: string, url?: string): void {
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
        wsConfig.APP_PATH = baseUrl;
        wsConfig.RESOURCES_PATH = resourcesPath;

        // Build config
        const config: RequireConfig = {
            baseUrl,
            map: {
                '*': {
                    i18n: 'I18n/i18n',
                    optional: 'RequireJsLoader/plugins/optional'
                }
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
                react: `${REACT_CDN_PATH}${debug.isEnabled() ? 'react.development' : 'react.production.min'}`,
                'react-dom': `${REACT_CDN_PATH}${debug.isEnabled() ? 'react-dom.development' : 'react-dom.production.min'}`,
                // jQuery must die
                jquery: '/cdn/JQuery/jquery/3.3.1/jquery-min'

            },
            onNodeCreated,
            waitSeconds: IS_SERVER_SCRIPT ? 0 : LOADING_TIMEOUT
        };

        // If WS.Core in application
        if (wsPath) {
            objectAssign(config.paths, {
                // tlib.js location to use it as AMD dependency in compiled code
                tslib: pathJoin(wsPath, 'ext/tslib'),

                // Router is vital
                router: pathJoin(resourcesPath, 'router'),

                // Compatibility with old modules from WS
                WS: removeTrailingSlash(wsPath),
                Core: pathJoin(wsPath, 'core'),
                Lib: pathJoin(wsPath, 'lib'),
                Ext: pathJoin(wsPath, 'lib/Ext'),
                Deprecated: pathJoin(resourcesPath, 'WS.Deprecated'),
                Helpers: pathJoin(wsPath, 'core/helpers'),
                Transport: pathJoin(wsPath, 'transport'),
                bootup : pathJoin(wsPath, 'res/js/bootup'),
                'bootup-min' : pathJoin(wsPath, 'res/js/bootup-min'),
                'old-bootup' : pathJoin(wsPath, 'res/js/old-bootup')
            });
        }

        // Check and handle some options
        const contents = initialContents || getContents();
        if (contents) {
            objectAssign(config, contents);
            if (contents.modules) {
                for (const name in contents.modules) {
                    if (contents.modules.hasOwnProperty(name)) {
                        const moduleConfig = contents.modules[name];
                        config.paths[name] = moduleConfig.path ?
                            pathJoin(moduleConfig.path) :
                            pathJoin(resourcesPath, name);
                    }
                }
            }
        }

        return config;
    }

    // Applies startup config for RequireJS
    function applyConfig(require: Require, wsConfig: RequireJsLoader.IWsConfig, context?: string): Require {
        // Application path
        const appPath = wsConfig && wsConfig.appRoot || '/';

        // Resources path
        const resourcesPath = wsConfig ? wsConfig.resourceRoot || DEFAULT_RESOURCES_PATH : '';

        // WS path
        const wsPath = wsConfig && wsConfig.wsRoot || '';

        // Bundles post processing
        const contents = getContents();
        if (GLOBAL.bundles && contents && BUILD_MODE === RELEASE_MODE) {
            contents.bundles = postProcessBundles(GLOBAL.bundles);
        }

        const config = createConfig(appPath, wsPath, resourcesPath);

        // set require js substitutions for exceptional modules(such as 'react',
        // 'jquery' and requirejs plugins) to be further used to get correct url
        // for this dependencies in getWithVersion function.
        requireJsSubstitutions = config.paths;
        if (context) {
            config.context = context;
        }

        return require.config(config);
    }

    // Initiates application environment
    function prepareEnvironment(require: RequireJsLoader.IRequireExt, withHandlers: IHandlersInternal): void {
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

    // Build URL handlers
    const handlers = buildHandlers(localWsConfig);

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
        createConfig,
        applyConfig,
        prepareEnvironment,
        handlers
    });
})());

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

    export function patchContext(
        context: RequireJsLoader.IRequireContext,
        handlers: Partial<IHandlersInternal>
    ): () => void;

    export function getWsConfig(): RequireJsLoader.IWsConfig;

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
}
