define('browser', function () {
   'use strict';

   return {
      load: function (name, require, onLoad) {
         if (typeof window !== 'undefined') {
            require([name], onLoad, function (err) {
               onLoad.error(err);
            });
         } else {
            onLoad(null);
         }
      }
   };
});
