/**
 * Плагин для подключения шаблонов в виде функций.
 */
define('tmpl', ['wml', 'RequireJsLoader/config'], function (wml, requireConfig) {
   'use strict';

   return {
      load: function (name, require, load) {
         requireConfig.loader.load(name, 'tmpl', function () {
            var deps = [
               'is!compatibleLayer?Lib/Control/Control.compatible',
               'is!compatibleLayer?Lib/Control/AreaAbstract/AreaAbstract.compatible'
            ];

            wml.loadBase(name, require, load, 'tmpl', deps);
         });
      }
   };
});
