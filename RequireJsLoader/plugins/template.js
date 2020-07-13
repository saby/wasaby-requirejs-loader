define('template', function () {
   'use strict';

   return {
      load: function (name, require, load) {
         load.error(new Error('Plugin "template" not supported anymore'));
      }
   };
});
