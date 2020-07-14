define('RequireJsLoader/plugins/optional', function() {
   'use strict';

   var global = (function(){ return this || (0,eval)('this'); }());

   var PLATFORM_MAP = {
      WS: 'WS.Core',
      Core: 'WS.Core',
      Lib: 'WS.Core',
      Ext: 'WS.Core',
      Helpers: 'WS.Core',
      Transport: 'WS.Core',
      Resources: 'WS.Core',
      Deprecated: 'WS.Deprecated'
   };

   function showAlertOnTimeoutInBrowser(err) {
      if (!err) { return; }
      if (showAlertOnTimeoutInBrowser.isFired) { return; }
      var REQUIRE_TIMEOUT_TYPE = 'timeout';
      if (err.requireType !== REQUIRE_TIMEOUT_TYPE) { return; }
      if (typeof window === 'undefined') { return; }
      if (global.wsConfig && global.wsConfig.showAlertOnTimeoutInBrowser === false) { return; }
      var importantModules = err.requireModules.map(function (moduleName) {
         return moduleName.substr(0, 4) !== 'css!';
      });
      if (importantModules.length === 0) {
         return;
      }
      alert("Произошла ошибка загрузки ресурса. Проверьте интернет соединение и повторите попытку.");
      showAlertOnTimeoutInBrowser.isFired = true;
      throw err;
   }

   function isNorFoundError(error) {
      if (!error) {
         return false;
      }

      // Handle RequireJS errors
      switch (error.requireType) {
         case 'scripterror':
            return true;
         case 'define':
            return String(error.message).indexOf('tried node\'s require(') > -1;
      }

      // Handle XMLHttpRequest errors
      if (error.xhr && error.xhr.status === 404) {
         return true;
      }

      return false;
   }

   return {
      load: function (name, require, onLoad) {
         // Check if modules list is available and release mode is on
         var contents = global.contents;
         if (
            contents &&
            contents.buildMode === 'release' &&
            contents.modules
         ) {
            var moduleName = name.split('/')[0];
            var plugins = moduleName.split(/[!?]/);
            moduleName = plugins.pop();

            // Some old platform modules have mismatched name
            if (PLATFORM_MAP[moduleName]) {
               moduleName = PLATFORM_MAP[moduleName];
            }

            // Skip fast check for some plugins
            if (
               plugins.indexOf('css') === -1 &&
               plugins.indexOf('remote') === -1
            ) {
               // Fast check via modules list
               if (!(moduleName in contents.modules)) {
                  onLoad(null);
                  return;
               }
            }
         }

         try {
            // Slow check via RequireJS result
            require([name], onLoad, function(error) {
               showAlertOnTimeoutInBrowser(error);
               if (isNorFoundError(error)) {
                  onLoad(null);
               } else {
                  if (error.message) {
                     error.message = 'Failed to load "optional!' + name + '" : ' + error.message;
                  }
                  onLoad.error(error);
               }
            });
         } catch (error) {
            if (error.message) {
               error.message = 'Failed to load "optional!' + name + '" : ' + error.message;
            }
            onLoad.error(error);
         }
      }
   }
});
