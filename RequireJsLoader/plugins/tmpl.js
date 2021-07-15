/**
 * Плагин для подключения шаблонов в виде функций.
 */
define('tmpl', [
   'wml',
   'RequireJsLoader/config'
], function(
   wml,
   requireConfig
) {
   'use strict';

    var IS_SERVER_SCRIPT = typeof window === 'undefined';

    function logger(moduleName, name, status) {
        if (moduleName === 'SBIS3.CONTROLS' && !IS_SERVER_SCRIPT) {
            console.log(moduleName + ': module "' + name + '" ' + status);
        }
    }

   return {
      load: function(name, require, load) {

          logger(name.split('/')[0], name, 'call load in plugin tmpl');
          requireConfig.bundleController.load(name, function() {
              logger(name.split('/')[0], name, 'is not has plugin load to tmpl plugin');

              var deps = [
                  'is!compatibleLayer?Lib/Control/Control.compatible',
                  'is!compatibleLayer?Lib/Control/AreaAbstract/AreaAbstract.compatible'
              ];

              wml.loadBase(name, require, load, 'tmpl', deps);
          });
      }
   };
});
