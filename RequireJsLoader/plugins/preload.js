/**
 * Created by Shilovda on 08.07.2015.
 */
define('RequireJsLoader/plugins/preload', function() {
   'use strict';

   function noop() {
   }

   function clientLoader(name, require, onLoad) {
      onLoad(function() {
         require(String(name).split(';'), noop, function(err) {
            onLoad.error(err);
         });
      });
   }

   function serverLoader(name, require, onLoad) {
      onLoad(noop);
   }

   return {
      load: typeof window === 'undefined' ? serverLoader : clientLoader
   }
});
