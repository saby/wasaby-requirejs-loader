/**
 * Плагин для подключения шаблонов в виде функций.
 */
define('tmpl', [
   'wml'
], function(
   wml
) {
   'use strict';

   return {
      load: function(name, require, load) {
         var deps = [
            'is!compatibleLayer?Lib/Control/Control.compatible',
            'is!compatibleLayer?Lib/Control/AreaAbstract/AreaAbstract.compatible',
            'i18n!' + name.split('/')[0]
         ];
         wml.loadBase(name, require, load, 'tmpl', deps);
      }
   };
});
