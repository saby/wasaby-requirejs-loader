define('datasource', ['text'], function () {
   'use strict';

   return {
      load: function (name, require, onLoad) {
         try {
            var path = name + '.dpack';
            require(['text!' + path], function (json) {
               var parsedData = {};
               try {
                  parsedData = JSON.parse(json);
                  onLoad(parsedData);
               } catch (err) {
                  onLoad.error(err);
               }
            }, function (err) {
               onLoad.error(err);
            });
         } catch (err) {
            onLoad.error(err);
         }
      }
   };
});
