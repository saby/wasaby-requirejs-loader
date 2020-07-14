/**
 * Плагин для подключения шаблонов в виде функций.
 */
define('RequireJsLoader/plugins/wml', [
   'RequireJsLoader/plugins/text',
   'RequireJsLoader/extras/patchDefine',
   'optional!View/config',
   'optional!Env/Env'
], function(
   text,
   patchDefine,
   config,
   Env
) {
   'use strict';

   var global = (function(){ return this || (0,eval)('this'); }());
   var isServerSide = typeof window === 'undefined' && !(process && process.versions);

   function logError(tag, err) {
      const logger = Env && Env.IoC.resolve('ILogger') || console;
      logger.error(tag, err.message, err);
   }

   function showAlertOnTimeoutInBrowser(err) {
      if (!err) { return false; }
      if (showAlertOnTimeoutInBrowser.isFired) { return false; }
      var REQUIRE_TIMEOUT_TYPE = 'timeout'
      if (err.requireType !== REQUIRE_TIMEOUT_TYPE) { return false; }
      if (typeof window === 'undefined') { return false; }
      if (global.wsConfig && global.wsConfig.showAlertOnTimeoutInBrowser === false) { return false; }
      var importantModules = err.requireModules.map(function (moduleName) {
         return moduleName.substr(0, 4) !== 'css!';
      });
      if (importantModules.length === 0) { return false; }
      alert('Произошла ошибка загрузки ресурса. Проверьте интернет соединение и повторите попытку.');
      showAlertOnTimeoutInBrowser.isFired = true;
      throw err;
   }

   function createLostFunction(err, ext) {
      logError(ext + '!', err.message, err);
      var wrapper = function () {
         return '<div>' + err.message + '</div>';
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
         tmpl.getFile(html, conf, function (file) {
            load.fromTextFixed ? load.fromTextFixed(file) : load.fromText(file);
            load = undefined;
         }, function (err) {
            err.message = 'Error while parsing template "' + name + '": ' + err.message;
            try {
               var timeoutAlert = showAlertOnTimeoutInBrowser(err);
               if (!timeoutAlert) {
                  logError('Template', err.message, err);
               }
            } catch (err) {
               logError('Template', err.message, err);
            }
            load.error(err);
         }, ext);
      } catch (err) {
         err.message = 'Error while parsing template "' + name + '": ' + err.message;
         logError('Template', err.message, err);
         load.error(err);
         load = undefined;
      }
   }

   function createLoader(name, require, load, conf, ext, needRequire, callback) {
      var loader = function (html) {
         if (html && html.indexOf('define') === 0) {
            //Got template as compiled AMD module
            load.fromTextFixed ? load.fromTextFixed(html) : load.fromText(html);
         } else {
            //Got template as string with markup
            try {
               require(needRequire, function(builder) {
                  try {
                     // Check for circular dependencies before we go
                     patchDefine.checkCircularDependencies(ext + '!' + name, builder.Tmpl.getComponents(html, conf));

                     callback(name, html, builder.Tmpl, conf, load, ext);
                  } catch (err) {
                     err.message = 'Error while parsing template "' + name + '": ' + err.message;
                     logError('Template', err.message, err);
                     load.error(err);
                  }
               });
            } catch (err) {
               err.message = 'Error while loading builder for template "' + name + '": ' + err.message;
               logError('Template', err.message, err);
               load.error(err);
            }
         }
      };

      loader.error = function (err) {
         err.message = 'Error while loading template "' + name + '": ' + err.message;
         showAlertOnTimeoutInBrowser(err);
         logError('Template', err.message, err);
         load.error(err);
      };

      return loader;
   }

   var wmlObj = {
      loadBase: function (name, require, load, ext, deps, callback){
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
         } catch(err) {
            err.message = 'Error while resolving template "' + name + '": ' + err.message;
            logError('Template', err.message, err);
            load.error(err);
         }
      },
      load: function (name, require, load) {
         wmlObj.loadBase(name, require, load, 'wml', ['View/Builder'], createTemplate);
      },
      createLostFunction: createLostFunction,
      createLoader: createLoader
   };

   return wmlObj;
});
