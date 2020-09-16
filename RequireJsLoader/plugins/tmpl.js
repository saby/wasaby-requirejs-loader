/**
 * Плагин для подключения шаблонов в виде функций.
 */
define('tmpl', [
   'wml',
   'Env/Env',
   'optional!UI/Executor'
], function(
   wml,
   Env,
   Executor
) {
   'use strict';

   var tClosure = Executor.TClosure;

   function resolverControls(path) {
      return 'tmpl!' + path;
   }

   function setToJsonForFunction(func, moduleName, path) {
      func.toJSON = function() {
         var serialized = {
            $serialized$: 'func',
            module: moduleName
         };
         if (path) {
            serialized.path = path;
         }
         return serialized;
      };
   }

   function createTemplate(name, html, tmpl, conf, load) {
      try {
         tmpl.template(html, resolverControls, conf).handle(function (traversed) {
            try {
               var templateFunction = tmpl.func(traversed, conf);
               Object.keys(templateFunction.includedFunctions).forEach(function(elem) {
                  setToJsonForFunction(templateFunction.includedFunctions[elem], 'tmpl!' + name, 'includedFunctions.' + elem);
               });
               // Чтобы отличать функции старого шаблонизатора от нового
               templateFunction.stable = true;
               var closured = function () {
                  return templateFunction.apply(this, tmpl.addArgument(tClosure, arguments));
               };
               Object.defineProperty(closured, 'name', { 'value': templateFunction.name, configurable: true });
               closured.stable = true;
               closured.includedFunctions = templateFunction.includedFunctions;
               setToJsonForFunction(closured, 'tmpl!' + name);

               closured.reactiveProps = traversed.reactiveProps;

               load(closured);
               load = undefined;
            } catch (err) {
               err.message = 'Error while traversing template "' + name + '": ' + err.message;
               load(wml.createLostFunction(err, 'tmpl'));
               load = undefined;
            }
         }, function (err) {
            err.message = 'Error while creating template "' + name + '": ' + err.message;
            load(wml.createLostFunction(err,' tmpl'));
            load = undefined;
         });
      } catch (err) {
         err.message = 'Error while parsing template "' + name + '": ' + err.message;
         load(wml.createLostFunction(err, 'tmpl'));
         load = undefined;
      }
   }

   return {
      load: function (name, require, load) {
          var deps = [
              'is!compatibleLayer?Lib/Control/Control.compatible',
              'is!compatibleLayer?Lib/Control/AreaAbstract/AreaAbstract.compatible',
              'i18n!' + name.split('/')[0]
          ];
          if (!Env.constants.isProduction || typeof window === 'undefined') {
              deps.unshift('UI/Builder');
          }
          wml.loadBase(name, require, load, 'tmpl', deps, createTemplate);
      }
   };
});
