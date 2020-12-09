define('json', ['text'], function(text) {
   'use strict';

   return {
      load: function(name, require, load, conf) {
         try {
            var path = name.endsWith('.json') ? name : name + '.json';

            // we need to remove leading slash if it exists.
            // otherwise "text" wouldn't be able to download file
            // properly in local tests
            if (path.startsWith('/')) {
               path = path.replace('/', '');
            }
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
   };
});
