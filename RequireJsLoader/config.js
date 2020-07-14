(function () {
   'use strict';

   var global = this || (0, eval)('this');

   global.wsConfig = global.wsConfig || {};

   // Check if on server side
   var IS_SERVER_SCRIPT = typeof window === 'undefined';

   // Resource loading timeout for RequireJS
   var LOADING_TIMEOUT = 60;

   // Release mode
   var RELEASE_MODE = 'release';

   // Debug mode
   var DEBUG_MODE = 'debug';

   // Application build mode
   var BUILD_MODE = global.contents && global.contents.buildMode || DEBUG_MODE;

   /**
    * На страницах OnlineSbisRu/CompatibleTemplate зависимости пакуются в rt-пакеты и собираются DepsCollector(saby/UI)
    * Поэтому в глобальной переменной храним имена запакованных в rt-пакет модулей
    * И игнорируем попытки require
    * https://online.sbis.ru/opendoc.html?guid=348beb13-7b57-4257-b8b8-c5393bee13bd
    * TODO следует избавится при отказе от rt-паковки
    */
   var RTPACK_MODULES_NAMES;
   function getRtPackModules() {
      if (IS_SERVER_SCRIPT) { return {}; }
      try {
         return global.rtpackModuleNames && JSON.parse(global.rtpackModuleNames);
      } catch (_) {
         return {};
      }
   }

   function isRtPackModule(moduleName) {
      if (!RTPACK_MODULES_NAMES) { RTPACK_MODULES_NAMES = getRtPackModules() }
      return !!RTPACK_MODULES_NAMES && RTPACK_MODULES_NAMES.hasOwnProperty(moduleName);
   }

   // Removes leading slash from string
   function removeLeadingSlash(path) {
      if (path) {
         var head = path.charAt(0);
         if (head === '/' || head === '\\') {
            path = path.substr(1);
         }
      }
      return path;
   }

   // Removes trailing slash from string
   function removeTrailingSlash(path) {
      if (path) {
         var tail = path.substr(path.length - 1);
         if (tail === '/' || tail === '\\') {
            path = path.substr(0, path.length - 1);
         }
      }
      return path;
   }

   // Joins path parts together
   function pathJoin() {
      var count = arguments.length;
      var path = [];
      var before;
      var after;
      for (var i = 0; i < count; i++) {
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

   function getCookie() {
      try {
         return global.document && String(global.document.cookie);
      } catch (err) {
         if (global.console) {
            global.console.error(err);
         } else {
            throw err;
         }
      }
   }

   var prevConfig;
   var prevStaticDomains;

   /**
    * Returns config for static files
    */
   function getStaticConfig() {
      if (prevConfig && global.wsConfig.staticDomains === prevStaticDomains) {
         return prevConfig;
      }

      // Normailze config for statics
      var config = global.wsConfig.staticDomains instanceof Array
         ? {
            domains: global.wsConfig.staticDomains,
            types: ['js']
         } : (global.wsConfig.staticDomains || {
            domains: [],
            types: ['js']
         })

      prevConfig = config;
      prevStaticDomains = global.wsConfig.staticDomains;

      return config;
   }

   /**
    * Wraps global define() function of RequireJS
    * @param {requirejs} require Root RequireJS instance
    * @param {Function} original Original define() function
    * @return {Function} Wrapped function
    */
   function patchDefine(require, original) {
      var context = require.s.contexts._;

      function needDependencyFor(name, candidateDeps, skipDeps) {
         if (
            typeof name !== 'string' || // Don't add to anonymous
            name.indexOf('/') === -1 || // Don't add to special names
            candidateDeps.indexOf(name) > -1 || // Don't add to each other
            skipDeps.indexOf(name) > -1 // Break cycles we know about
         ) {
            return [];
         }

         return candidateDeps.filter(function(depName) {
            return depName && !context.defined[depName] // Add if module is not defined yet
         });
      }

      // Adds extra dependencies for every defined module for forcing their loading
      function patchedDefine(name, deps, callback) {
         var toAdd = needDependencyFor(name, [
            // Force load polyfills
            IS_SERVER_SCRIPT ? '' : 'Core/polyfill',
            // Force load extra patches for RequireJS
            'RequireJsLoader/extras/autoload'
         ], [
            // Break cycles
            'RequireJsLoader/extras/errorHandler',
            'RequireJsLoader/extras/resourceLoadHandler',
            'RequireJsLoader/extras/patchDefine',
            'RequireJsLoader/extras/utils'
         ]);

         //Add extra dependencies
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

      return patchedDefine;
   }

   /**
    * Returns handler for RequireJS resource loader callback
    * @param {Function} parent Previous callback
    * @return {Function}
    */
   function createResourceLoader(parent) {
      return function onResourceLoad(context, map) {
         if (!map.prefix) {
            var exports = context.defined[map.id];
            // Lookup for ES6 default export if available
            if (exports && exports.__esModule && exports.default) {
               exports = exports.default;
            }

            if (typeof exports === 'function') {
               //Give _moduleName to each class and BTW mark private classes
               var proto = exports.prototype;
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
               Object.keys(exports).forEach(function(name) {
                  var module = exports[name];
                  if (typeof module === 'function') {
                     var proto = module.prototype;
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
   var IS_OVERALL_DEBUG = 'debug' in global.wsConfig ? global.wsConfig.debug : false;
   var DEBUGGING_MODULES = [];
   var cookie = getCookie();
   if (cookie) {
      var matches = cookie.match(/s3debug=([^;]+)[;]?/);
      if (matches) {
         var debugModules = String(matches[1]);
         if (debugModules === 'true') {
            IS_OVERALL_DEBUG = true;
         } else {
            DEBUGGING_MODULES = debugModules.split(',');
         }
      }
   }

   /**
    * Determines debug mode for specified URL
    */
   function isDebuggingModule(url) {
      return url && (IS_OVERALL_DEBUG || DEBUGGING_MODULES.some(function (mod) {
         return url.indexOf('/' + mod) !== -1;
      }));
   }

   /**
    * Deal with bundles in depend on debug mode
    */
   function postProcessBundles(bundles) {
      if (!bundles || IS_OVERALL_DEBUG) {
         return {};
      }

      if (DEBUGGING_MODULES.length === 0) {
         return bundles;
      }
      // Filtering bundles by rejecting packages which are include modules from DEBUGGING_MODULES
      var filteredBundles = {};
      Object.keys(bundles)
         .filter(filterReleasePackages)
         .forEach(function (packageName) {
            filteredBundles[packageName] = bundles[packageName];
         });
      return filteredBundles;

      /** Возвращает список пакетов, в которые не входят debug модули */
      function filterReleasePackages(packageName) {
         return bundles[packageName].every(function (moduleNameWithPlugin) {
            var moduleName = moduleNameWithPlugin.split('!').pop();
            return DEBUGGING_MODULES.every(function (debugMod) {
               return moduleName.indexOf(debugMod) === -1;
            });
         });
      }
   }

   /**
    * Creates additional handlers for RequireJS
    */
   function buildHandlers(config) {
      var FILE_EXTENSION = /\.([A-z0-9]+($|\?))/;
      var INTERFACE_MODULE_NAME = /^[A-z0-9\.]+$/;
      var IGNORE_PART = '((?!\\/(cdn|rtpackage|rtpack|demo_src)\\/).)*';
      var WITH_VERSION_MATCH = new RegExp('^' + IGNORE_PART + '\\.[A-z0-9]+(\\?|$)');
      var WITH_SUFFIX_MATCH = new RegExp('^' + IGNORE_PART + '\\.(js|xhtml|tmpl|wml|css|json|jstpl)(\\?|$)');
      var FILES_SUFFIX = BUILD_MODE === RELEASE_MODE ? '.min' : '';

      function getResourcesPath() {
         var prefix = config.resourceRoot || '';
         if (prefix === '/') {
            prefix = '';
         }
         return prefix;
      }

      // Returns domain for certain URL
      function getDomain() {
         var domains = getStaticConfig().domains || [];
         return domains[0];
      }

      var modulesPrefixesCache;
      // Search for all modules with irregular path
      function getModulesPrefixes() {
         if (modulesPrefixesCache) {
            return modulesPrefixesCache;
         }
         var contents = global.contents;

         var prefixes = contents && contents.modules ? Object.keys(contents.modules).map(function(moduleName) {
            return [moduleName, contents.modules[moduleName].path];
         }).filter(function(modulePath) {
            return modulePath[1];
         }).sort(function(a, b) {
            // Order paths by length descending so we can find the best one fits in desired URL
            return b[1].length - a[1].length;
         }) : [];

         // Base resource path is most suitable
         prefixes.unshift(['', getResourcesPath()]);

         modulesPrefixesCache = prefixes;
         return prefixes;
      }
      getModulesPrefixes.invalidate = function() {
         modulesPrefixesCache = undefined;
      };

      function reviseModuleName(name) {
         return removeLeadingSlash(name);
      }

      // Returns interface module name according to URL
      function getModuleNameFromUrl(url) {
         // Skip empty URLs and requireJS's internal service URLs.
         if (!url || url.indexOf('_@r') > -1) {
            return;
         }

         // Search for suitable module
         var prefixes = getModulesPrefixes();
         for (var i = 0; i < prefixes.length; i++) {
            var modulePrefix = prefixes[i][1];
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
      function checkModule(url) {
         var contents = global.contents;
         if (!contents) {
            return;
         }

         var moduleName = getModuleNameFromUrl(url);
         if (!moduleName) {
            return;
         }

         // Each UI module can have an individual build number
         var modules = contents.modules || {};
         var moduleConfig = modules[moduleName];

         // Check if module is available
         var basePrefix = getResourcesPath();
         if (basePrefix && !moduleConfig && moduleName.match(INTERFACE_MODULE_NAME)) {
            throw new ReferenceError('Interface module "' + moduleName + '" taken from URL "' + url + '" is not included in the application.');
         }

         // Extract service name from module config and add it to the loaded services list
         if (moduleConfig && moduleConfig.service) {
            var service = moduleConfig.service;
            var loadedServices = contents.loadedServices || {};
            if (!loadedServices[service]) {
               loadedServices[service] = true;
               contents.loadedServices = loadedServices;
            }
         }
      }

      // Adds domain signature to the URL if it contains certain resource type
      function getWithDomainByType(url, domain, allowedTypes) {
         var extension = url.split('?').shift().split('.').pop().toLowerCase();

         // If there is no types defined add domain to any URL
         if (!allowedTypes || allowedTypes.indexOf(extension) !== -1) {
            url = '//' + domain + url;
         }

         return url;
      }

      // Adds domain signature to the URL if it starts with certain prefix and contains certain resource type
      function getWithDomainByPrefixAndType(url, domain, allowedPrefixes, allowedTypes) {
         if (allowedPrefixes) {
            // Add domain if URL starts with one of certain prefixes
            for (var i = 0, len = allowedPrefixes.length; i < len; i++) {
               var prefix = allowedPrefixes[i];
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
      function getWithDomain(url) {
         var domain = getDomain(url);
         var staticConfig = getStaticConfig();

         // URL is absolute and doesn't start with double slash
         if (domain && url[0] === '/' && url[1] !== '/') {
            var resourcesPath = getResourcesPath();

            // Skip URLs which located straight in resources folder
            if (url.indexOf(resourcesPath) === 0) {
               var rest = url.substr(resourcesPath.length);
               if (rest.indexOf('/') === -1) {
                  return url;
               }
            }

            // Process URL by prefix and resource type
            url = getWithDomainByPrefixAndType(url, domain, staticConfig.resources, staticConfig.types);
         }

         return url;
      }

      // Returns primary and remote services version for certain URL
      function getVersions(url) {
         if (config.versioning === false) {
            return {};
         }

         var contents = global.contents;
         var moduleConfig = null;

         var moduleName = getModuleNameFromUrl(url);
         if (moduleName) {
            // Each UI module can have an individual build number
            var modules = contents && contents.modules || {};
            moduleConfig = modules[moduleName];
         }

         var buildNumber = contents && contents.buildnumber || '';
         var contextVersion = contents && contents.contextVersion || '';
         return {
            name: moduleName,
            defined: !!moduleConfig,
            module: moduleConfig && moduleConfig.buildnumber || buildNumber,
            context: moduleConfig && moduleConfig.contextVersion || contextVersion
         };
      }

      // Injects version signature to the URL if necessary
      function getWithVersion(url) {
         var versions = getVersions(url);
         var pairs = [];

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

         var versionSignature = pairs.length ? '?' + pairs.join('&') : '';

         // Inject version signature to the URL if it don't have it yet and can be modified this way
         if (
            versionSignature &&
            typeof url == 'string' &&
            url.indexOf(versionSignature) === -1 &&
            WITH_VERSION_MATCH.test(url)
         ) {
            var parts = url.split('?', 2);
            url = parts[0] + versionSignature + (parts[1] ? '&' + parts[1] : '');
         }

         return url;
      }

      // Injects suffix signature to the URL if necessary
      function getWithSuffix(url) {
         if (FILES_SUFFIX && !isDebuggingModule(url)) {
            var suffixSign = FILES_SUFFIX + '.';

            // Inject suffix signature to the URL if it don't have it yet and can be attracted to
            if (
               suffixSign &&
               typeof url == 'string' &&
               url.indexOf(suffixSign) === -1 &&
               WITH_SUFFIX_MATCH.test(url)
            ) {
               url = url.replace(FILE_EXTENSION, suffixSign + '$1');
            }
         }

         return url;
      }

      return {
         getModulesPrefixes: getModulesPrefixes,
         checkModule: checkModule,
         getWithDomain: getWithDomain,
         getWithSuffix: getWithSuffix,
         getWithVersion: getWithVersion
      };
   }

   /**
    * Patches nameToUrl method of specified context as decorator with URL post processing
    * @param {Object} require RequireJS root instance
    * @param {Object} handlers Patch config
    */
   function patchContext(require, handlers) {
      var context = require.s.contexts._;
      if (context.isPatchedByWs) {
         return;
      }
      context.isPatchedByWs = true;

      context.nameToUrl = (function(parent) {
         var HAS_PROTOCOL = /^([a-z]+:)?\/\//;
         var getWithSuffix = handlers.getWithSuffix;
         var getWithVersion = handlers.getWithVersion;
         var getWithDomain = handlers.getWithDomain;

         /**
          * Converts a module name to a file path. Supports cases where moduleName may actually be just an URL.
          * @param {String} name The name of the module.
          * @param {String} [ext] The extension of the module
          * @param {Boolean} [skipExt] Skip extension
          */
         return function nameToUrlDecorator(name, ext, skipExt) {
            /*
             * For URLs with domain name included RequireJS does the 2nd call of nameToUrl() and passes there 'name'
             * argument which already contains the extension and empty 'ext' argument so that default implementation
             * below simply adds '.js' extension to the result URL.
             * To bypass this behaviour we have to manage 'skipExt' flag if extension already presented in URL.
             */
            if (name && !ext && !skipExt) {
               var nameDotIndex = name.lastIndexOf('.');
               var nameExt = nameDotIndex > -1 ? name.substr(nameDotIndex) : '';
               // Only deal with templates
               if (nameExt === '.wml' || nameExt === '.tmpl') {
                  skipExt = true;
               }
            }

            var url = parent(name, ext, skipExt);

            //Skip URLs with protocol prefix
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
      })(context.nameToUrl);

      if (handlers.checkModule) {
         context.load = (function(parent) {
            /**
             * Does the request to load a module.
             * @param {String} id The name of the module.
             * @param {Object} url The URL to the module.
             */
            return function loadDecorator(id, url) {
               if (isRtPackModule(id)) { return; }
               handlers.checkModule(url);
               return parent(id, url);
            };
         })(context.load);
      }
   }

   /**
    * Before RequireJS script node will be insert into DOM
    * @param {HTMLScriptElement} node Script DOM element
    * @param {Object} config Context config
    * @param {String} moduleName the name of the module.
    * @param {String} url Requested module URL
    */
   function onNodeCreated(node) {
      node.setAttribute('data-vdomignore', 'true');
   }

   /**
    * Creates startup config for RequireJS
    * @param {String} appPath Base URL
    * @param {String} wsPath RequireJsLoader path
    * @param {String} resourcesPath Resources path
    * @param {Object} options Optional config
    * @return {Object}
    */
   function createConfig(appPath, wsPath, resourcesPath, options) {
      var wsConfig = global.wsConfig;

      wsConfig.APP_PATH = appPath;
      wsConfig.RESOURCES_PATH = resourcesPath;
      wsConfig.BUILD_MODE = BUILD_MODE;
      wsConfig.IS_OVERALL_DEBUG = IS_OVERALL_DEBUG;
      wsConfig.DEBUGGING_MODULES = DEBUGGING_MODULES;
      wsConfig.IS_SERVER_SCRIPT = IS_SERVER_SCRIPT;

      // Translate the set of functions to the global config but prevent them to be enumerable and therefore serializable
      Object.defineProperties(wsConfig, {
         getModulesPrefixes: {configurable: true, value: requireHandlers.getModulesPrefixes},
         getWithVersion: {configurable: true, value: requireHandlers.getWithVersion},
         getWithDomain: {configurable: true, value: requireHandlers.getWithDomain},
         getWithSuffix: {configurable: true, value: requireHandlers.getWithSuffix},
      });

      options = options || global.contents;

      // Build config
      var config = {
         baseUrl: appPath,
         map: {
            '*': {
               'i18n': 'I18n/i18n'
            }
         },
         paths: {
            // Plugins
            'browser': 'RequireJsLoader/plugins/browser',
            'cdn': 'RequireJsLoader/plugins/cdn',
            'css': 'RequireJsLoader/plugins/css',
            'datasource': 'RequireJsLoader/plugins/datasource',
            'json': 'RequireJsLoader/plugins/json',
            'html': 'RequireJsLoader/plugins/html',
            'is': 'RequireJsLoader/plugins/is',
            'is-api': 'RequireJsLoader/plugins/is-api',
            'native-css': 'RequireJsLoader/plugins/native-css',
            'normalize': 'RequireJsLoader/plugins/normalize',
            'optional': 'RequireJsLoader/plugins/optional',
            'order': 'RequireJsLoader/plugins/order',
            'preload': 'RequireJsLoader/plugins/preload',
            'remote': 'RequireJsLoader/plugins/remote',
            'template': 'RequireJsLoader/plugins/template',
            'text': 'RequireJsLoader/plugins/text',
            'tmpl': 'RequireJsLoader/plugins/tmpl',
            'wml': 'RequireJsLoader/plugins/wml',
            'xml': 'RequireJsLoader/plugins/xml',

            // tlib.js location to use it as AMD dependency in compiled code
            'tslib': pathJoin(wsPath, 'ext/tslib'),

            // Router is vital
            'router': pathJoin(resourcesPath, 'router'),

            // Compatibility with old modules from WS
            'WS': removeTrailingSlash(wsPath),
            'WS.Core': wsPath,
            'Lib': pathJoin(wsPath, 'lib'),
            'Ext': pathJoin(wsPath, 'lib/Ext'),
            'Deprecated': pathJoin(resourcesPath, 'WS.Deprecated'),
            'Helpers': pathJoin(wsPath, 'core/helpers'),
            'Transport': pathJoin(wsPath, 'transport'),
            'bootup' : pathJoin(wsPath, 'res/js/bootup'),
            'bootup-min' : pathJoin(wsPath, 'res/js/bootup-min'),
            'old-bootup' : pathJoin(wsPath, 'res/js/old-bootup'),
            'Core': pathJoin(wsPath, 'core'),

            // jQuery must die
            'jquery': '/cdn/JQuery/jquery/3.3.1/jquery-min'

         },
         onNodeCreated: onNodeCreated,
         waitSeconds: IS_SERVER_SCRIPT ? 0 : LOADING_TIMEOUT
      };

      // Check and handle some options
      if (options) {
         var prop;
         for (prop in options) {
            if (!options.hasOwnProperty(prop)) {
               continue;
            }
            config[prop] = options[prop];
         }
         if (options.modules) {
            for (var name in options.modules) {
               if (options.modules.hasOwnProperty(name)) {
                  var moduleConfig = options.modules[name];
                  config.paths[name] = moduleConfig.hasOwnProperty('path') ? pathJoin(moduleConfig['path']) : pathJoin(resourcesPath, name);
               }
            }
         }
      }

      // Dependencies for loading in background
      config.deps = [
         'RequireJsLoader/extras/dynamicConfig'
      ];

      return config;
   }

   // Setup startup config for RequireJS
   function setupConfig(require, wsConfig) {
      // Application path
      var appPath = wsConfig && wsConfig.appRoot || '/';

      // Resources path
      var resourcesPath = wsConfig ? wsConfig.resourceRoot || 'resources' : '';

      // WS path
      var wsPath = wsConfig && wsConfig.wsRoot || pathJoin(resourcesPath, 'WS.Core');

      // Bundles post processing
      if (global.bundles && global.contents && BUILD_MODE === RELEASE_MODE) {
         global.contents.bundles = postProcessBundles(global.bundles);
      }

      var config = createConfig(
         appPath,
         wsPath,
         resourcesPath
      );
      require.config(config);
   }

   var require = global.requirejs;

   // Mark root RequireJS instance in purpose of Wasaby Dev Tools
   require.isWasaby = true;

   // Patch define() function
   if (global.define) {
      global.define = patchDefine(require, global.define);
   }

   // Set resource load handler
   require.onResourceLoad = createResourceLoader(require.onResourceLoad);

   var requireHandlers = buildHandlers(global.wsConfig);

   // Patch default context
   patchContext(require, IS_SERVER_SCRIPT ? {
      checkModule: requireHandlers.checkModule,
      getWithVersion: requireHandlers.getWithVersion
   } : requireHandlers);

   if (IS_SERVER_SCRIPT) {
      // Just return config constructor on server
      module.exports = createConfig;
   } else {
      // Initialize RequireJS in browser
      setupConfig(require, global.wsConfig);
   }
})();
