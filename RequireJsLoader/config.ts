import {BuildMode, IStaticResourcesConfig, IWsConfig, IContents, IPatchedGlobal} from './wasaby';
import {IRequireExt, IRequireContext, IRequireMapExt, OnResourceLoadCallback} from './require.ext';

(() => {
   const GLOBAL: IPatchedGlobal = (function(): IPatchedGlobal {
      // tslint:disable-next-line:ban-comma-operator
      return this || (0, eval)('this');
   }());

   // Init global wsConfig variable
   if (!GLOBAL.wsConfig) {
      GLOBAL.wsConfig = {};
   }

   // Check if we're on server side
   const IS_SERVER_SCRIPT: boolean = typeof window === 'undefined';

   // Resource loading timeout for RequireJS
   const LOADING_TIMEOUT: number = 60;

   // Release mode
   const RELEASE_MODE: BuildMode = 'release';

   // Debug mode
   const DEBUG_MODE: BuildMode = 'debug';

   // Application build mode
   const BUILD_MODE: BuildMode = GLOBAL.contents && GLOBAL.contents.buildMode || DEBUG_MODE;

   function logError(err: Error): void {
      if (typeof console === 'object') {
         // tslint:disable-next-line:no-console
         console.error(err);
      } else {
         throw err;
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

   let prevConfig;
   let prevStaticDomains;

   /**
    * Returns config for static files
    */
   function getStaticConfig(): IStaticResourcesConfig {
      if (prevConfig && GLOBAL.wsConfig.staticDomains === prevStaticDomains) {
         return prevConfig;
      }

      // Normailze config for statics
      const config = GLOBAL.wsConfig.staticDomains instanceof Array ? {
         domains: GLOBAL.wsConfig.staticDomains,
         types: ['js']
      } : (GLOBAL.wsConfig.staticDomains || {
         domains: [],
         types: ['js']
      });

      prevConfig = config;
      prevStaticDomains = GLOBAL.wsConfig.staticDomains;

      return config;
   }

   /**
    * Wraps global define() function of RequireJS
    * @param require Root RequireJS instance
    * @param original Original define() function
    * @return Wrapped function
    */
   function patchDefine(require: IRequireExt, original: RequireDefine): RequireDefine {
      const context = require.s.contexts._;

      // Returns required dependencies for candidate
      function needDependencyFor(name: string, candidateDeps: string[], skipDeps: string[]): string[] {
         if (
            typeof name !== 'string' || // Don't add to anonymous
            name.indexOf('/') === -1 || // Don't add to special names
            candidateDeps.indexOf(name) > -1 || // Don't add to each other
            skipDeps.indexOf(name) > -1 // Break cycles we know about
         ) {
            return [];
         }

         return candidateDeps.filter((depName) => {
            return depName && !context.defined[depName]; // Add if module is not defined yet
         });
      }

      // Adds extra dependencies for every defined module to force their loading
      function patchedDefine(name: string, deps: string[], callback: Function): void {
         const toAdd = needDependencyFor(name, [
            // Force load polyfills
            IS_SERVER_SCRIPT ? '' : (GLOBAL.contents && GLOBAL.contents.modules && GLOBAL.contents.modules['WS.Core'] ? 'Core/polyfill' : ''),
            // Force load extra patches for RequireJS
            'RequireJsLoader/extras/autoload'
         ], [
            // Break cycles
            'RequireJsLoader/extras/errorHandler',
            'RequireJsLoader/extras/resourceLoadHandler',
            'RequireJsLoader/extras/patchDefine',
            'RequireJsLoader/extras/utils'
         ]);

         // Add extra dependencies
         if (toAdd.length) {
            if (!(deps instanceof Array)) {
               callback = deps;
               deps = [];
            }
            deps.push.apply(deps, toAdd);
         }

         // Call original define() function
         return original.call(this, name, deps, callback);
      }

      patchedDefine.amd = original.amd;

      return patchedDefine as RequireDefine;
   }

   /**
    * Returns handler for RequireJS resource loader callback
    * @param parent Previous callback
    */
   function createResourceLoader(parent: OnResourceLoadCallback): OnResourceLoadCallback {
      return function onResourceLoad(context: IRequireContext, map: IRequireMapExt): void {
         if (!map.prefix) {
            let exports: Record<string, unknown> | Function = context.defined[map.id] as Record<string, unknown>;
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

         if (parent) {
            parent.apply(this, arguments);
         }
      };
   }

   // Detect debug mode constants
   const debug = {
      IS_OVERALL: 'debug' in GLOBAL.wsConfig ? GLOBAL.wsConfig.debug : false,
      MODULES: [],
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

   interface IHandlers {
      getModulesPrefixes: () => string[][];
      checkModule: (url: string) => void;
      getWithDomain: (url: string) => string;
      getWithSuffix: (url: string) => string;
      getWithVersion: (url: string) => string;
   }

   /**
    * Creates additional handlers for RequireJS
    */
   function buildHandlers(config: IWsConfig): IHandlers {
      const FILE_EXTENSION = /\.([A-z0-9]+($|\?))/;
      const INTERFACE_MODULE_NAME = /^[A-z0-9\.]+$/;
      const IGNORE_PART = '((?!\\/(cdn|rtpackage|rtpack|demo_src)\\/).)*';
      const WITH_VERSION_MATCH = new RegExp('^' + IGNORE_PART + '\\.[A-z0-9]+(\\?|$)');
      const WITH_SUFFIX_MATCH = new RegExp('^' + IGNORE_PART + '\\.(js|xhtml|tmpl|wml|css|json|jstpl)(\\?|$)');
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
         const domains = getStaticConfig().domains || [];
         return domains[0];
      }

      // Search for all modules with irregular path
      let modulesPrefixesCache: string[][];
      function getModulesPrefixes(): string[][] {
         if (modulesPrefixesCache) {
            return modulesPrefixesCache;
         }
         const contents = GLOBAL.contents;

         const prefixes = contents && contents.modules ?
            Object.keys(contents.modules)
               .map((moduleName) => [moduleName, contents.modules[moduleName].path])
               .filter((modulePath) => modulePath[1])
               // Order paths by length descending so we can find the best one fits in desired URL
               .sort((a, b) => b[1].length - a[1].length) :
            [];

         // Base resource path is most suitable
         prefixes.unshift(['', getResourcesPath()]);

         return modulesPrefixesCache = prefixes;
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

         // Search for suitable module
         const prefixes = getModulesPrefixes();
         for (let i = 0; i < prefixes.length; i++) {
            const modulePrefix = prefixes[i][1];
            // URL should start with base prefix or certain module prefix
            if (modulePrefix && url.substr(0, modulePrefix.length) === modulePrefix) {
               if (i === 0) {
                  // Base prefix
                  return reviseModuleName(url.substr(modulePrefix.length).split('/')[0]);
               } else {
                  // Certain module prefix
                  return prefixes[i][0];
               }
            }
         }
      }

      // Checks interface module that requested in URL
      function checkModule(url: string): void {
         const contents = GLOBAL.contents;
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
         const domain = getDomain(url);
         const staticConfig = getStaticConfig();

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

         const contents = GLOBAL.contents;
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

      return {
         getModulesPrefixes,
         checkModule,
         getWithDomain,
         getWithSuffix,
         getWithVersion
      };
   }

   /**
    * Patches nameToUrl method of specified context as decorator with URL post processing
    * @param context RequireJS context to patch
    * @param handlers Handlers to apply in patch
    */
   function patchContext(
      context: IRequireContext,
      {checkModule, getWithSuffix, getWithVersion, getWithDomain}: IHandlers
   ): () => void {
      if (context.isPatchedByWs) {
         return;
      }

      context.isPatchedByWs = true;
      const originalNameToUrl = context.nameToUrl;

      context.nameToUrl = (() => {
         const HAS_PROTOCOL = /^([a-z]+:)?\/\//;

         /**
          * Converts a module name to a file path. Supports cases where moduleName may actually be just an URL.
          * @param name The name of the module.
          * @param [ext] The extension of the module
          * @param [skipExt] Skip extension
          */
         return function nameToUrlDecorator(name: string, ext?: string, skipExt?: boolean): string {
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

            if (getWithSuffix) {
               url = getWithSuffix(url);
            }
            if (getWithVersion) {
               url = getWithVersion(url);
            }
            if (getWithDomain) {
               url = getWithDomain(url);
            }

            return url;
         };
      })();

      let originalLoad;
      if (checkModule) {
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
            checkModule(url);
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
    * @param appPath Base URL
    * @param wsPath RequireJsLoader path
    * @param resourcesPath Resources path
    * @param [contents] Optional config
    */
   function createConfig(
      appPath: string,
      wsPath: string,
      resourcesPath: string,
      contents?: IContents
   ): RequireConfig {
      // Normalize wsConfig
      const wsConfig = GLOBAL.wsConfig;
      wsConfig.APP_PATH = appPath;
      wsConfig.RESOURCES_PATH = resourcesPath;

      const options = contents || GLOBAL.contents;

      // Build config
      const config: RequireConfig = {
         baseUrl: appPath,
         map: {
            '*': {
               // Plugins
               browser: 'RequireJsLoader/plugins/browser',
               cdn: 'RequireJsLoader/plugins/cdn',
               css: 'RequireJsLoader/plugins/css',
               datasource: 'RequireJsLoader/plugins/datasource',
               json: 'RequireJsLoader/plugins/json',
               html: 'RequireJsLoader/plugins/html',
               i18n: 'I18n/i18n',
               is: 'RequireJsLoader/plugins/is',
               'is-api': 'RequireJsLoader/plugins/is-api',
               'native-css': 'RequireJsLoader/plugins/native-css',
               normalize: 'RequireJsLoader/plugins/normalize',
               optional: 'RequireJsLoader/plugins/optional',
               order: 'RequireJsLoader/plugins/order',
               preload: 'RequireJsLoader/plugins/preload',
               remote: 'RequireJsLoader/plugins/remote',
               template: 'RequireJsLoader/plugins/template',
               text: 'RequireJsLoader/plugins/text',
               tmpl: 'RequireJsLoader/plugins/tmpl',
               wml: 'RequireJsLoader/plugins/wml',
               xml: 'RequireJsLoader/plugins/xml'
            }
         },
         paths: {
            // tlib.js location to use it as AMD dependency in compiled code
            tslib: pathJoin(wsPath, 'ext/tslib'),

            // Router is vital
            router: pathJoin(resourcesPath, 'router'),

            // Compatibility with old modules from WS
            WS: removeTrailingSlash(wsPath),
            'WS.Core': wsPath,
            Core: pathJoin(wsPath, 'core'),
            Lib: pathJoin(wsPath, 'lib'),
            Ext: pathJoin(wsPath, 'lib/Ext'),
            Deprecated: pathJoin(resourcesPath, 'WS.Deprecated'),
            Helpers: pathJoin(wsPath, 'core/helpers'),
            Transport: pathJoin(wsPath, 'transport'),
            bootup : pathJoin(wsPath, 'res/js/bootup'),
            'bootup-min' : pathJoin(wsPath, 'res/js/bootup-min'),
            'old-bootup' : pathJoin(wsPath, 'res/js/old-bootup'),

            // jQuery must die
            jquery: '/cdn/JQuery/jquery/3.3.1/jquery-min'

         },
         onNodeCreated,
         waitSeconds: IS_SERVER_SCRIPT ? 0 : LOADING_TIMEOUT
      };

      // Check and handle some options
      if (options) {
         Object.assign(config, options);
         if (options.modules) {
            for (const name in options.modules) {
               if (options.modules.hasOwnProperty(name)) {
                  const moduleConfig = options.modules[name];
                  config.paths[name] = moduleConfig.path ?
                     pathJoin(moduleConfig.path) :
                     pathJoin(resourcesPath, name);
               }
            }
         }
      }

      // Dependencies for loading in background
      config.deps = ['RequireJsLoader/extras/dynamicConfig'];

      return config;
   }

   // Applies startup config for RequireJS
   function applyConfig(require: Require, wsConfig: IWsConfig, context?: string): Require {
      // Application path
      const appPath = wsConfig && wsConfig.appRoot || '/';

      // Resources path
      const resourcesPath = wsConfig ? wsConfig.resourceRoot || 'resources' : '';

      // WS path
      const wsPath = wsConfig && wsConfig.wsRoot || pathJoin(resourcesPath, 'WS.Core');

      // Bundles post processing
      if (GLOBAL.bundles && GLOBAL.contents && BUILD_MODE === RELEASE_MODE) {
         GLOBAL.contents.bundles = postProcessBundles(GLOBAL.bundles);
      }

      const config = createConfig(
         appPath,
         wsPath,
         resourcesPath
      );
      if (context) {
         config.context = context;
      }

      return require.config(config);
   }

   // Initiates application environment
   function prepareEnvironment(require: IRequireExt, withHandlers: IHandlers): void {
      // Mark root RequireJS instance in purpose of Wasaby Dev Tools
      require.isWasaby = true;

      // Patch define() function
      if (typeof define === 'function') {
         define = patchDefine(require, define);
      }

      // Set resource load handler
      require.onResourceLoad = createResourceLoader(require.onResourceLoad);

      // Patch default context
      patchContext(require.s.contexts._, IS_SERVER_SCRIPT ? {
         checkModule: withHandlers.checkModule,
         getWithVersion: withHandlers.getWithVersion,
         getModulesPrefixes: undefined,
         getWithSuffix: undefined,
         getWithDomain: undefined
      } : withHandlers);
   }

   // Normalize wsConfig
   GLOBAL.wsConfig.BUILD_MODE = BUILD_MODE;
   GLOBAL.wsConfig.IS_OVERALL_DEBUG = debug.IS_OVERALL;
   GLOBAL.wsConfig.DEBUGGING_MODULES = debug.MODULES;
   GLOBAL.wsConfig.IS_SERVER_SCRIPT = IS_SERVER_SCRIPT;

   // Build URL handlers
   const handlers = buildHandlers(GLOBAL.wsConfig);

   prepareEnvironment(requirejs as IRequireExt, handlers);

   // Define module in RequireJS environment
   if (typeof define === 'function') {
      define('RequireJsLoader/config', () => {
         return {
            prepareEnvironment,
            applyConfig,
            createConfig,
            patchContext,
            handlers
         };
      });
   }

   // Export config constructor in CommonJS environment
   // @ts-ignore
   if (typeof module === 'object') {
      // @ts-ignore
      module.exports = createConfig;
   }

   // Initialize RequireJS in browser environment
   if (!IS_SERVER_SCRIPT) {
      applyConfig(requirejs, GLOBAL.wsConfig);
   }
})();
