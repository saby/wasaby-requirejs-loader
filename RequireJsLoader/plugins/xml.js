define('xml', ['text'], function (text) {
   'use strict';

   return {
      load: function (name, require, load, conf) {
         try {
            var url = name + '.xml';

            var onLoad = function (xml) {
               load(xml);
            };

            onLoad.error = function (err) {
               load.error(err);
            };

            text.load(url, require, onLoad, conf);
         } catch (err) {
            load.error(err);
         }
      }
   };
});
