/* global define, describe, it, assert */
define([
   'RequireJsLoader/_extras/errorHandler',
   'RequireJsLoader/_extras/utils'
], function(
   errorHandler,
   utils
) {
   'use strict';

   describe('RequireJsLoader/_extras/errorHandler', function() {
      var logger = console;
      var requirejs = utils.getInstance();

      context('when undefine failed modules and some far ancestor module is not defined', function() {
         var undo;

         before(function() {
            undo = errorHandler.default(requirejs, {
               logger,
               undefineFailedModules: true,
               showAlertOnError: false
            });

            define('Foo/bar1', ['Foo/bar2'], function(bar2) {
                return '[bar1]' + bar2;
            });
    
            define('Foo/bar2', ['Foo/bar3'], function(bar3) {
                return '[bar2]' + bar3;
            });
         });

         after(function() {
            undo();
         });

         it('should call error handler on first require call', function(done) {
            require(['Foo/bar1'], function() {
               done(new Error('Shouldn\'t get here'));
            }, function(err) {
               assert.instanceOf(err, Error);
               done();
            });
         });

         it('should call error handler on second require call', function(done) {
            require(['Foo/bar1'], function() {
               done(new Error('Shouldn\'t get here'));
            }, function(err) {
               assert.instanceOf(err, Error);
               done();
            });
         });

         it('should throw an exception on first require call', function() {
            assert.throws(function() {
               require('Foo/bar1');
            });
         });

         it('should throw an exception on second require call', function() {
            assert.throws(function() {
               require('Foo/bar1');
            });
         });
      });
   });
});
