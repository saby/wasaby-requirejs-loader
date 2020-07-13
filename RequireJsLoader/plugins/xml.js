define('xml', ['text', 'Core/pathResolver'], function(text, pathResolver) {
   'use strict';

   return {
      load: function(name, require, load, conf) {
         try {
            var path = pathResolver(name, 'xml', true);

            var onLoad = function(xml) {
               load(xml);
            };

            onLoad.error = function(e) {
               load.error(e);
            };

            text.load(path, require, onLoad, conf);
         } catch (err) {
            load.error(err);
         }
      }
   }
});
