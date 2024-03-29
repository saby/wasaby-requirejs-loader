define('css', [
   'RequireJsLoader/extras',
   'RequireJsLoader/config',
   'optional!UI/theme/controller',
   'optional!Env/Env'
], function(
   extras,
   requireConfig,
   controller,
   Env
) {
   'use strict';

   var global = extras.utils.global;
   var isControl = /^(Resources\/)?(SBIS3\.CONTROLS)\//;
   var loadCss = (global.wsConfig || {}).loadCss === undefined ? true : global.wsConfig.loadCss;

   /**
    * Определяем, является ли запрашиваемый стиль стилем из контролов ядра.
    * На страницах carry, presto, booking не должны применяться стили групп
    * Controls, SBIS3.CONTROLS, а также супербандлы(поскольку они включают в себя
    * вышеописанные стили)
    */
   function itIsControl(name) {
      return name.match(isControl);
   }

   /**
    * Старые страницы хранят имя темы в wsConfig.themeName
    * Достаём из конфигурации тему. Если конфигурация отсутствует или
    * отсутствует свойство themeName, значит считаем, что работаем с онлайном и
    * позволяем грузить онлайновские контролы.
    * @param name
    * @returns {string}
    */
   function resolveSuffix(name) {
      return global.wsConfig && global.wsConfig.themeName && itIsControl(name);
   }

   function loadStyle(name, require, load, conf) {
       var onload = function() {
           load(true);
       };

       var onerror = function(err) {
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
           /** через css! плагин скачиваются устаревшие немультитемные csss */
           tc.get(name.replace('theme?', ''), global.themeName, controller.THEME_TYPE.SINGLE).then(onload, onerror);
           return;
       }
       tc.get(name, controller.EMPTY_THEME, controller.THEME_TYPE.SINGLE).then(onload, onerror);
   }

   var _ignoredModules = global._ignoredModules;
   return {
      load: function(name, require, load, conf) {
          requireConfig.loader.load(name, 'css', function() {
              loadStyle(name, require, load, conf);
          });
      }
   };
});
