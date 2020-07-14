define('datasource', ['Core/pathResolver', 'Env/Env', 'text'], function(pathResolver) {
   'use strict';

   return {
      load: function(name, require, onLoad) {
         try {
            var path = pathResolver(name, 'dpack');
            require(['text!' + path], function(json) {
               var parsedData = {};
               try {
                  parsedData = JSON.parse(json);
                  onLoad(parsedData);
               } catch (err) {
                  onLoad.error(err);
               }
            }, function(err) {
               onLoad.error(err);
            });
         }
         catch (err) {
            onLoad.error(err);
         }
      }
   }
});
