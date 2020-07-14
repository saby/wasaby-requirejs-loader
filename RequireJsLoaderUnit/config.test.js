/* global define, describe, it, assert */
define([
   'RequireJsLoader/config',
   'require'
], function(
   config,
   require
) {
   'use strict';

   var global = this || (0, eval)('this');// eslint-disable-line no-eval

   describe('RequireJsLoader/config', function() {
      var contents = global.contents;
      var wsConfig = global.wsConfig;

      beforeEach(function() {
         global.contents = {};
         global.wsConfig = Object.assign({}, global.wsConfig);
      });

      afterEach(function() {
         global.contents = contents;
         global.wsConfig = wsConfig;
      });

      context('when affects require()\'s behaviour', function() {
         it('shouldn\'t throw ReferenceError for file in resources folder', function() {
            global.wsConfig.resourceRoot = '/assets/';
            return new Promise(function (resolve) {
               require(['/assets/contents.js'], resolve, function(err) {
                  assert.notInstanceOf(err, ReferenceError);
                  resolve();
               });
            });
         });
      });

      context('when affects require.defined()\'s behaviour', function() {
         it('shouldn\'t throw ReferenceError if module doesn\'t exist', function() {
            global.wsConfig.resourceRoot = '/assets/';
            assert.isFalse(require.defined('path/to/resource'));
         });
      });

      context('patchContext()', function() {
         var defContext = global.requirejs.s.contexts._;
         var restoreContext;

         beforeEach(function() {
            restoreContext = config.patchContext(defContext, {});
         });

         afterEach(function() {
            if (restoreContext) {
               restoreContext();
            }
         });

         context('when affects context.nameToUrl()\'s behaviour', function() {
            it('shouldn\'t add .js extension if url already ends with .wml or .tmpl', function() {
               assert.isTrue(defContext.nameToUrl('foo/bar.wml').endsWith('/foo/bar.wml'));
               assert.isTrue(defContext.nameToUrl('foo/bar.tmpl').endsWith('/foo/bar.tmpl'));
            });
         });
      });
   });
});
