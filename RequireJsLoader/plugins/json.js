define('RequireJsLoader/plugins/json', ['RequireJsLoader/plugins/text'], function(text) {
   'use strict';

   return {
      load: function(name, require, load, conf) {
         try {
            var path = name + '.json';

            var onLoad = function(json) {
               var parsedData = {};
               try {
                  parsedData = JSON.parse(json);
                  load(parsedData);
               } catch (err) {
                  load.error(err);
               }
            };

            onLoad.error = function(err) {
               load.error(err);
            };

            text.load(path, require, onLoad, conf);
         } catch (err) {
            load.error(err);
         }
      }
   }
});
