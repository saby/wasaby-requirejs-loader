define('cdn', ['optional!Env/Env'], function(Env) {
   'use strict';

   function removeLeadingSlash(initialPath) {
      var path = initialPath;
      if (path) {
         var head = path.charAt(0);
         if (head === '/' || head === '\\') {
            path = path.substr(1);
         }
      }
      return path;
   }

   return {
      load: function(name, require, onLoad) {
         if (typeof window === 'undefined') {
            onLoad('');
            return;
         }

         var temp = name.split('!');
         var plugin = temp[1] ? temp[0] + '!' : '';
         var path = temp[1] || temp[0];
         var cdnRoot = (Env && Env.constants.cdnRoot) || '/cdn/';

         require([plugin + cdnRoot + removeLeadingSlash(path)], onLoad, function(err) {
            onLoad.error(err);
         });
      }
   };
});
