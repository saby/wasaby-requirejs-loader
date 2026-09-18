/* eslint-disable no-undef */

define('css', [
   'RequireJsLoader/config',
   'optional!UI/theme/controller',
   'optional!Env/Env'
], function (requireConfig, controller, Env) {
   'use strict';

   var isControl = /^(Resources\/)?(SBIS3\.CONTROLS)\//;
   var loadCss =
      (globalThis.wsConfig || {}).loadCss === undefined ? true : globalThis.wsConfig.loadCss;
   var _ignoredModules = globalThis._ignoredModules;

   /*
    * Определяем, является ли запрашиваемый стиль стилем из контролов ядра.
    * На страницах carry, presto, booking не должны применяться стили групп
    * Controls, SBIS3.CONTROLS, а также супербандлы(поскольку они включают в себя
    * вышеописанные стили)
    */
   function itIsControl(name) {
      return name.match(isControl);
   }

   /*
    * Старые страницы хранят имя темы в wsConfig.themeName
    * Достаём из конфигурации тему. Если конфигурация отсутствует или
    * отсутствует свойство themeName, значит считаем, что работаем с онлайном и
    * позволяем грузить онлайновские контролы.
    * @param name
    * @returns {string}
    */
   function resolveSuffix(name) {
      return globalThis.wsConfig && globalThis.wsConfig.themeName && itIsControl(name);
   }

   function loadStyle(name, require, load, conf) {
      var onload = function () {
         load(true);
      };

      var onerror = function (err) {
         var logger = (Env && Env.IoC.resolve('ILogger')) || console;
         logger.error(err.message);
         load(null);
      };

      if (_ignoredModules) {
         for (var i = 0; i < _ignoredModules.length; i++) {
            if (_ignoredModules[i].test(name)) {
               onload();
               return;
            }
         }
      }

      if (!loadCss || conf.testing || resolveSuffix(name)) {
         onload();
         return;
      }

      if (require.isBrowser === false) {
         // не удалил, т.к sbis\core\core-common\sbis-js-engine\implementation\core\convert.cpp:281
         // выбрасывает ошибку приведения типов, вызываем onload на СП синхронно
         onload();

         // requirejs кэширует запрошенные модули на сп, при повторном запросе загрузки не произойдет
         return;
      }

      if (!controller) {
         load.error(new ReferenceError('Module "UI" is required to work with plugin "css!".'));
         return;
      }

      var tc = controller.getThemeController();
      if (name.indexOf('theme?') !== -1) {
         // через css! плагин скачиваются устаревшие немультитемные css
         tc.get(
            name.replace('theme?', ''),
            globalThis.themeName,
            controller.THEME_TYPE.SINGLE
         ).then(onload, onerror);
         return;
      }
      tc.get(name, controller.EMPTY_THEME, controller.THEME_TYPE.SINGLE).then(onload, onerror);
   }

   return {
      load: function (name, require, load, conf) {
         requireConfig.loader.load(name, 'css', function () {
            loadStyle(name, require, load, conf);
         });
      }
   };
});
