define('json', ['text', 'Core/pathResolver'], function(text, pathResolver) {
   'use strict';

   return {
      load: function(name, require, load, conf) {
         try {
            var path = pathResolver(name, 'json');

            var onLoad = function(json) {
               var parsedData = {};
               try {
                  parsedData = JSON.parse(json);
                  load(parsedData);
               } catch (e) {
                  load.error(e);
               }
            };

            onLoad.error = function(e) {
               load.error(e);
            };

            text.load(path, require, onLoad, conf);
         } catch (e) {
            load.error(e);
         }
      }
   }
});
