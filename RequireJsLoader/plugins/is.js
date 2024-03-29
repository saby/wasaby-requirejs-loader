/*
 * RequireJS 'is' plugin
 *
 * Usage:
 *
 * is!myFeature?module:another
 * is!~myFeature?module (negation)
 *
 *
 * Features can be set as startup config with
 * config: {
 *   is: {
 *     var: true
 *   }
 * }
 *
 * Otherwise the feature is assumed to be a moduleId resolving to a boolean.
 *
 * Thus to write a dynamic feature, say iphone.js, just do:
 *
 * iphone.js:
 * define(function() {
 *   if (typeof navigator === 'undefined' || typeof navigator.userAgent === 'undefined')
 *     return false;
 *   return navigator.userAgent.match(/iPhone/i);
 * });
 *
 * Which can then be used with a require of the form: is!iphone?iphone-scripts.
 *
 *
 * Builds
 * The build environment features are computed in the same way as in development. The only difference is
 * that features are not at all evaluated.
 *
 * It is important to retain the config for features that don't resolve to moduleIds as this is the only
 * distinction between feature detection modules and configuration items.
 * Simply set them all to 'true' to indicate that we don't need to build in their feature detection code.
 *
 * By default, all conditional modules are written in to the build layer.
 *
 * Then to exclude a feature's modules in a layer, simply add the 'isExclude' array of features to the module config,
 * or the global build config - both are respected and complementary.
 *
 * This will entirely exxlude those feature modules from the layer build. The condition itself still remains
 * undetermined until the environment execution.
 *
 * Feature layers can be created with config as in the following -
 *
 * Example:
 *
 * {
 *   modules: [
 *   {
 *     name: 'core',
 *     create: true,
 *     include: ['some', 'core', 'modules'],
 *     isExclude: ['mobile'], //exclude all is!mobile? conditional dependencies
 *   },
 *   {
 *     name: 'core-mobile',
 *     create: true,
 *     include: ['some', 'core', 'modules'],
 *     exclude: ['core']
 *   }
 *   ]
 * }
 *
 * isExclude can also be a global config for single file builds, or sharing config between the builds.
 *
 */

define('is', [
   'module',
   'require',
   'is-api',
   'optional!Env/Env'
], function(
   module,
   require,
   api,
   Env
) {
   'use strict';

   var is = {};
   is.pluginBuilder = './is-builder';
   is.normalize = api.normalize;
   is.features = ((typeof module.config === 'function') && module.config()) || {};

   // add 'browser' feature
   if (is.features.browser === undefined) {
      is.features.browser = (typeof window !== 'undefined');
   }
   if (is.features.build === undefined) {
      is.features.build = false;
   }

   // build tracking
   is.curModule = null;
   is.modules = null;

   is.empty = function() {
      return null;
   };

   var msIe = is.features.browser && navigator;
   if (msIe) {
      msIe = navigator.appVersion.match(/MSIE\s+(\d+)/);
   }

   // здесь нужен bool, а то, если undefined вдруг будет, он грузить плагин "msIe" начнёт
   is.features.msIe = !!msIe;
   is.features.msIe8 = is.features.browser && navigator && !!navigator.appVersion.match(/MSIE 8/);

   /*
    * ПЛАГИН для тестов по веткам без режима совместимости, будет удален без предупреждения
    * в документацию не добавляется, используется в одном контроле
    */
   is.features.compatibleLayer = Env && Env.constants.compat;

   is.lookup = function(feature, complete) {
      if (is.features[feature] !== undefined) {
         complete(is.features[feature]);
         return;
      }

      require([feature], function(_feature) {
         if (_feature !== true && _feature !== false) {
            throw new Error('Feature module ' + feature + ' must return true or false.');
         }

         is.features[feature] = _feature;

         complete(_feature);
      });
   };

   is.load = function(name, req, load) {
      var f = api.parse(name);

      if (f.type === 'lookup') {
         is.lookup(f.feature, load);
      }

      if (f.type === 'load_if' || f.type === 'load_if_not') {
         // check feature
         is.lookup(f.feature, function(_feature) {
            if ((_feature && f.type === 'load_if') || (!_feature && f.type === 'load_if_not')) {
               // if doing a build, check if we are including the module or not
               require([f.yesModuleId], load, function(err) {
                  load.error(err);
               });
            } else if (
               (!_feature && f.type === 'load_if' && f.noModuleId) ||
               (_feature && f.type === 'load_if_not' && f.noModuleId)
            ) {
               require([f.noModuleId], load, function(err) {
                  load.error(err);
               });
            } else {
               load(is.empty());
            }
         });
      }
   };

   return is;
});
