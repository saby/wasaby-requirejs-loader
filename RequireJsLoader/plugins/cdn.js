define('cdn', ['Env/Env'], function(Env) {
   'use strict';

   function removeLeadingSlash(path) {
      if (path) {
         var head = path.charAt(0);
         if (head == '/' || head == '\\') {
            path = path.substr(1);
         }
      }
      return path;
   }

   return {
      load: function(name, require, onLoad) {
         if (typeof window !== 'undefined') {
            var temp = name.split('!'),
                plugin = temp[1] ? temp[0] + '!' : '',
                path = temp[1] || temp[0],
                cdnRoot = Env.constants.cdnRoot || '/cdn/';

            require([plugin + cdnRoot + removeLeadingSlash(path)], onLoad, function(err) {
               onLoad.error(err);
            });
         } else {
            onLoad('');
         }
      }
   }
});
