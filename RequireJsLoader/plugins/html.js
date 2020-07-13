/**
 * Поддерживаемые форматы запроса
 * - html!SBIS3.CORE.HTMLChunk - подключит шаблон
 * - html!encode=true?SBIS3.CORE.HTMLChunk - подключит шаблон, в котором все {{=it....}} будет делать эскейпинг текста
 */
define('html', ['Core/pathResolver', 'Core/js-template-doT', 'Env/Env', 'text'], function(pathResolver, doT, Env, text) {
   'use strict';

   var isServerSide = typeof window === 'undefined' && !(process && process.versions);

   function setToJsonForFunction(func, moduleName, path) {
      func.toJSON = function() {
         var serialized = {
            $serialized$: 'func',
            module: moduleName
         };
         if (path) {
            serialized.path = path;
         }
         return serialized;
      }
   }

   function mkTemplate(f, name) {

      var fname = name.replace(/[^a-z0-9]/gi, '_');

      // Это обертка для улучшения логов. Создается именованая функция с понятным названием чтобы из стэка можно было понять битый шаблон
      var factory = new Function('f',
         "return function " + fname + "(){ return f.apply(this, arguments); }"
      );

      var result = factory(f);
      setToJsonForFunction(result, 'html!' + name);
      return result;
   }

   return {
      load: function(name, require, load, conf) {
         var
            options = name.split('?'),
            doEncode = false,
            optStr, config;

         if (options.length > 1) {
            optStr = options.shift();
            name = options.join('?');
            doEncode = /\bencode=true\b/.test(optStr);
         } else {
            name = options[0];
         }

         var onError = function(e) {
            e.message = 'Error while loading template ' + name + '\n' + e.message + '\n' + e.stack;
            load.error(e);
         };

         var onLoad = function (html) {
            if (html && html.indexOf('define') == 0) {
               load.fromTextFixed ? load.fromTextFixed(html) : load.fromText(html);
            } else {
               //Если у нас не скомпилена html, например /debug/

               config = doT.getSettings();
               config.strip = false;
               if (doEncode) {
                  config.encode = config.interpolate;
               }
               try {
                  load(mkTemplate(doT.template(html, config, undefined, undefined, name), name));
               } catch (e) {
                  onError(e);
               }
            }
         };

         onLoad.error = function(e) {
            onError(e);
         };

         try {
            var path = pathResolver(name, 'html');

            // для Сервиса Представлений необходимы именно сбилженные шаблоны(для здоровья локализации)
            // Также проверяем наличие process - на Серверном скрипте должны просится шаблоны без .min
            if (isServerSide && Env.constants.buildMode === 'release' && Env.constants.isServerSide) {
               path = path.replace(/(\.min)?\.xhtml$/, '.min.xhtml');
            }

            require(['i18n!' + path.split('/')[0]], function() {
               text.load(path, require, onLoad, conf);
            });
         } catch (e) {
            onError(e)
         }
      }
   }
});
