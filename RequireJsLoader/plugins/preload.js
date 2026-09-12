/**
 * Created by Shilovda on 08.07.2015.
 */
define('preload', function () {
   'use strict';

   function noop() {
      // Do nothing
   }

   function clientLoader(name, require, onLoad) {
      onLoad(function () {
         require(String(name).split(';'), noop, function (err) {
            onLoad.error(err);
         });
      });
   }

   function serverLoader(name, require, onLoad) {
      onLoad(noop);
   }

   return {
      load: typeof window === 'undefined' ? serverLoader : clientLoader
   };
});
