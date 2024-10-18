/* eslint-disable no-undef */
/**
 * Плагин для подключения шаблонов в виде функций.
 */
define('wml', [
   'text',
   'RequireJsLoader/extras',
   'RequireJsLoader/config',
   'optional!Env/Env'
], function (text, extras, requireConfig, Env) {
   'use strict';

   var isServerSide = typeof window === 'undefined' && !(process && process.versions);

   function getModuleProperty(moduleName, propertyName) {
      var uiModuleName = moduleName.split('/').shift();
      var globalContents = requireConfig.getContents();

      return (
         globalContents &&
         globalContents.modules &&
         globalContents.modules[uiModuleName] &&
         globalContents.modules[uiModuleName][propertyName]
      );
   }

   function logError(error) {
      var logger = (Env && Env.IoC.resolve('ILogger')) || console;
      logger.error(error.message);
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
      if (globalThis.wsConfig && globalThis.wsConfig.showAlertOnTimeoutInBrowser === false) {
         return false;
      }
      var importantModules = err.requireModules.map(function (moduleName) {
         return moduleName.substr(0, 4) !== 'css!';
      });
      if (importantModules.length === 0) {
         return false;
      }

      // eslint-disable-next-line no-alert
      alert(
         'Произошла ошибка загрузки ресурса. Проверьте интернет соединение и повторите попытку.'
      );
      showAlertOnTimeoutInBrowser.isFired = true;
      throw err;
   }

   function createLostFunction(error) {
      logError(error);
      var wrapper = function () {
         return '<div>' + error.message + '</div>';
      };
      wrapper.stable = true;
      wrapper.includedFunctions = {};
      return wrapper;
   }

   function createLoader(name, require, load, conf, ext, needRequire) {
      var loader = function (html) {
         var isCompiledModule =
            html &&
            /* AMD */ (html.indexOf('define') === 0 || /* UMD */ html.indexOf('(function(') === 0);
         if (isCompiledModule) {
            // Got template as compiled AMD module
            if (load.fromTextFixed) {
               load.fromTextFixed(html);
               return;
            }
            load.fromText(html);
            return;
         }

         // Got template as string with markup
         try {
            needRequire.unshift('Compiler/Compiler');
            if (getModuleProperty(name, 'hasTailwind')) {
               // При сборке исходных файлов в шаблоны вставляется такая зависимость тогда и только тогда,
               // когда в конкретном шаблоне имеется уникальный (не существующий в Tailwind) класс.
               // При сборке шаблона в runtime на клиенте нет возможности выполнить такую умную инъекцию зависимости,
               // поэтому загружаем существующие сгенерированные tailwind файлы для всего модуля
               // при первой компиляции шаблона на клиенте из этого модуля.
               var tailwindDependency = 'css!' + name.split('/').shift() + '/tailwind';
               needRequire.push(tailwindDependency);
            }
            require(needRequire, function (CompilerLib) {
               try {
                  var compiler = new CompilerLib.Compiler();
                  var artifact = compiler.compileSync(html, conf);

                  if (!artifact.stable) {
                     logError(artifact.errors[0]);
                     load.error(artifact.errors[0]);
                     return;
                  }

                  // Check for circular dependencies before we go
                  extras.checkCircularDependencies(ext + '!' + name, artifact.dependencies);

                  if (load.fromTextFixed) {
                     load.fromTextFixed(artifact.text);
                     return;
                  }
                  load.fromText(artifact.text);
               } catch (e) {
                  var error = new Error(
                     'Error while parsing template "' + name + '": ' + e.message
                  );
                  logError(error);
                  load.error(error);
               }
            });
         } catch (e) {
            var error = new Error(
               'Error while loading builder for template "' + name + '": ' + e.message
            );
            logError(error);
            load.error(error);
         }
      };

      loader.error = function (e) {
         var error = new Error('Error while loading template "' + name + '": ' + e.message);
         showAlertOnTimeoutInBrowser(error);
         logError(error);
         load.error(error);
      };

      return loader;
   }

   var wmlObj = {
      loadBase: function (name, require, load, ext, deps) {
         try {
            var path = name + '.' + ext;
            if (globalThis.contents && globalThis.contents.extensionForTemplate === 'js') {
               return require([path], load, function (e) {
                  var error = new Error(
                     'Error while loading template "' + name + '": ' + e.message
                  );
                  showAlertOnTimeoutInBrowser(error);
                  logError(error);
                  load.error(error);
               });
            }
            var conf = {
               fileName: path,
               ESVersion: getModuleProperty(name, 'ESVersion')
            };

            // по новому формату contets ESVersion есть в описании модуля только если значение отличается
            // от корневого
            if (!conf.ESVersion && globalThis.contents && globalThis.contents.ESVersion) {
               conf.ESVersion = globalThis.contents.ESVersion;
            }

            // для Сервиса Представлений необходимы именно сбилженные шаблоны(для здоровья локализации)
            // Также проверяем наличие process - на Серверном скрипте должны просится шаблоны без .min
            if (
               isServerSide &&
               Env &&
               Env.constants.buildMode === 'release' &&
               Env.constants.isServerSide
            ) {
               path = path.replace(/(\.min)?\.tmpl$/, '.min.tmpl');
               path = path.replace(/(\.min)?\.wml/, '.min.wml');
            }

            text.load(path, require, createLoader(name, require, load, conf, ext, deps), conf);
         } catch (e) {
            var error = new Error('Error while resolving template "' + name + '": ' + e.message);
            logError(error);
            load.error(error);
         }
      },
      load: function (name, require, load) {
         requireConfig.loader.load(name, 'wml', function () {
            wmlObj.loadBase(name, require, load, 'wml', []);
         });
      },
      createLostFunction: createLostFunction,
      createLoader: createLoader
   };

   return wmlObj;
});
