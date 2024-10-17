/**
 * Поддерживаемые форматы запроса
 * - html!Path/to/your/Module - подключит шаблон
 * - html!encode=true?Path/to/your/Module - подключит шаблон, в котором все {{=it....}} будет делать эскейпинг текста
 */
define('html', ['text', 'optional!Core/js-template-doT', 'optional!Env/Env'], function (
   text,
   doT,
   Env
) {
   'use strict';

   var isServerSide = typeof window === 'undefined' && !(process && process.versions);

   function setToJsonForFunction(func, moduleName, path) {
      func.toJSON = function () {
         var serialized = {
            $serialized$: 'func',
            module: moduleName
         };
         if (path) {
            serialized.path = path;
         }
         return serialized;
      };
   }

   function mkTemplate(f, name) {
      var fname = name.replace(/[^a-z0-9]/gi, '_');

      // Создается именованая функция с понятным названием чтобы из стэка можно было понять битый шаблон
      // eslint-disable-next-line no-new-func
      var factory = new Function(
         'f',
         'return function ' + fname + '(){ return f.apply(this, arguments); }'
      );

      var result = factory(f);
      setToJsonForFunction(result, 'html!' + name);
      return result;
   }

   return {
      load: function (initialName, require, load, conf) {
         var name = initialName;
         var options = name.split('?');
         var doEncode = false;
         var optStr;
         var config;

         if (options.length > 1) {
            optStr = options.shift();
            name = options.join('?');
            doEncode = /\bencode=true\b/.test(optStr);
         } else {
            name = options[0];
         }

         var onError = function (err) {
            err.message =
               'Error while loading template ' + name + '\n' + err.message + '\n' + err.stack;
            load.error(err);
         };

         var onLoad = function (html) {
            if (html && html.indexOf('define') === 0) {
               if (load.fromTextFixed) {
                  load.fromTextFixed(html);
               } else {
                  load.fromText(html);
               }
               return;
            }

            if (!doT) {
               onError(
                  new ReferenceError('Module "WS.Core" is required to work with plugin "html!".')
               );
               return;
            }

            // Если у нас не скомпилена html, например /debug/
            config = doT.getSettings();
            config.strip = false;
            if (doEncode) {
               config.encode = config.interpolate;
            }
            try {
               load(mkTemplate(doT.template(html, config, undefined, undefined, name), name));
            } catch (err) {
               onError(err);
            }
         };

         onLoad.error = function (err) {
            onError(err);
         };

         try {
            var path = name + '.xhtml';

            // для Сервиса Представлений необходимы именно сбилженные шаблоны(для здоровья локализации)
            // Также проверяем наличие process - на Серверном скрипте должны просится шаблоны без .min
            if (
               isServerSide &&
               Env &&
               Env.constants.buildMode === 'release' &&
               Env.constants.isServerSide
            ) {
               path = path.replace(/(\.min)?\.xhtml$/, '.min.xhtml');
            }

            require(['i18n!' + path.split('/')[0]], function () {
               text.load(path, require, onLoad, conf);
            });
         } catch (err) {
            onError(err);
         }
      }
   };
});
