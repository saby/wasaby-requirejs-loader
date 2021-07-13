/**
 * Плагин для подключения шаблонов в виде функций.
 */
define('wml', [
   'text',
   'RequireJsLoader/extras',
   'RequireJsLoader/config',
   'optional!UI/BuilderConfig',
   'optional!Env/Env'
], function(
   text,
   extras,
   requireConfig,
   BuilderConfig,
   Env
) {
   'use strict';

   var config = BuilderConfig && BuilderConfig.Config;

   var global = extras.utils.global;
   var isServerSide = typeof window === 'undefined' && !(process && process.versions);

   function logError(error) {
      var logger = (Env && Env.IoC.resolve('ILogger')) || console;
      logger.error('Template compiler: ' + error.message);
   }

   function showAlertOnTimeoutInBrowser(err) {
      if (!err) {
         return false;
      }
      if (showAlertOnTimeoutInBrowser.isFired) {
         return false;
      }
      var REQUIRE_TIMEOUT_TYPE = 'timeout';
      if (err.requireType !== REQUIRE_TIMEOUT_TYPE) {
         return false;
      }
      if (typeof window === 'undefined') {
         return false;
      }
      if (global.wsConfig && global.wsConfig.showAlertOnTimeoutInBrowser === false) {
         return false;
      }
      var importantModules = err.requireModules.map(function(moduleName) {
         return moduleName.substr(0, 4) !== 'css!';
      });
      if (importantModules.length === 0) {
         return false;
      }

      // eslint-disable-next-line no-alert
      alert('Произошла ошибка загрузки ресурса. Проверьте интернет соединение и повторите попытку.');
      showAlertOnTimeoutInBrowser.isFired = true;
      throw err;
   }

   function createLostFunction(error) {
      logError(error);
      var wrapper = function() {
         return '<div>' + error.message + '</div>';
      };
      wrapper.stable = true;
      wrapper.includedFunctions = {};
      return wrapper;
   }

   function createTemplate(name, html, tmpl, conf, load, ext) {
      try {
         if (!conf.fileName) {
            conf.fileName = name;
         }
         tmpl.getFile(html, conf, function(file) {
            if (load.fromTextFixed) {
               load.fromTextFixed(file);
            } else {
               load.fromText(file);
            }
            // eslint-disable-next-line no-param-reassign
            load = undefined;
         }, function(error) {
            error.message = 'Error while parsing template "' + name + '": ' + error.message;
            try {
               var timeoutAlert = showAlertOnTimeoutInBrowser(error);
               if (!timeoutAlert) {
                  logError(error);
               }
            } catch (e) {
               logError(e);
            }
            load.error(error);
         }, ext);
      } catch (error) {
         error.message = 'Error while parsing template "' + name + '": ' + error.message;
         logError(error);
         load.error(error);
         // eslint-disable-next-line no-param-reassign
         load = undefined;
      }
   }

   function createLoader(name, require, load, conf, ext, needRequire, callback) {
      var loader = function(html) {
         if (html && html.indexOf('define') === 0) {
            // Got template as compiled AMD module
            if (load.fromTextFixed) {
               load.fromTextFixed(html);
            } else {
               load.fromText(html);
            }
         } else {
            // Got template as string with markup
            try {
               needRequire.unshift('UI/Builder');
               require(needRequire, function(builder) {
                  try {
                     // Check for circular dependencies before we go
                     extras.checkCircularDependencies(ext + '!' + name, builder.Tmpl.getComponents(html, conf));

                     callback(name, html, builder.Tmpl, conf, load, ext);
                  } catch (error) {
                     error.message = 'Error while parsing template "' + name + '": ' + error.message;
                     logError(error);
                     load.error(error);
                  }
               });
            } catch (error) {
               error.message = 'Error while loading builder for template "' + name + '": ' + error.message;
               logError(error);
               load.error(error);
            }
         }
      };

      loader.error = function(error) {
         error.message = 'Error while loading template "' + name + '": ' + error.message;
         showAlertOnTimeoutInBrowser(error);
         logError(error);
      };

      return loader;
   }

   var wmlObj = {
      loadBase: function(name, require, load, ext, deps, callback) {
         try {
            var path = name + '.' + ext;
            var conf = {
               config: config,
               fileName: path
            };

            // для Сервиса Представлений необходимы именно сбилженные шаблоны(для здоровья локализации)
            // Также проверяем наличие process - на Серверном скрипте должны просится шаблоны без .min
            if (isServerSide && Env && Env.constants.buildMode === 'release' && Env.constants.isServerSide) {
               path = path.replace(/(\.min)?\.tmpl$/, '.min.tmpl');
               path = path.replace(/(\.min)?\.wml/, '.min.wml');
            }


            text.load(
               path,
               require,
               createLoader(name, require, load, conf, ext, deps, callback),
               conf
            );
         } catch (error) {
            error.message = 'Error while resolving template "' + name + '": ' + error.message;
            logError(error);
            load.error(error);
         }
      },
      load: function(name, require, load) {
          requireConfig.bundleController.load(name, function() {
              wmlObj.loadBase(name, require, load, 'wml', [], createTemplate);
          });
      },
      createLostFunction: createLostFunction,
      createLoader: createLoader
   };

   return wmlObj;
});
