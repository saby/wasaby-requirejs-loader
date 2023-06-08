/* global define, describe, it, assert */
define([
   'RequireJsLoader/_extras/resourceLoadHandler',
   'RequireJsLoader/_extras/utils'
], function(
   resourceLoadHandler,
   utils
) {
   'use strict';

   describe('RequireJsLoader/_extras/resourceLoadHandler', function() {
      var requirejs = utils.getInstance();

      var undo;

      before(function() {
         undo = resourceLoadHandler.default(requirejs, true);
      });

      after(function() {
         undo();
      });

      it('should serialize class with toJSON() use _moduleName on prototype', function(done) {
         after(function() {
            requirejs.undef('Foo/Bar');
         });

         define('Foo/Bar', function() {
            var Bar = function() {/* noop */};
            Bar.prototype._moduleName = 'Foo/Bar';
            return Bar;
         });

         require(['Foo/Bar'], function(Bar) {
            var state = Bar.toJSON();
            assert.deepEqual(state, {
               $serialized$: 'func',
               module: 'Foo/Bar',
               path: undefined
            });
            done();
         }, done);
      });

      it('should add toJSON() method to the static method', function(done) {
         after(function() {
            requirejs.undef('Foo/BarA');
         });

         define('Foo/BarA', function() {
            var Bar = function() {/* noop */};
            Bar.prototype._moduleName = 'Foo/BarA';
            Bar.propA = function() {/* noop */};
            return Bar;
         });

         require(['Foo/BarA'], function(Bar) {
            var state = Bar.propA.toJSON();
            assert.deepEqual(state, {
               $serialized$: 'func',
               module: 'Foo/BarA',
               path: 'propA'
            });
            done();
         }, done);
      });

      it('shouldn\'t read property with accessor descriptor', function(done) {
         after(function() {
            requirejs.undef('Foo/BarB');
         });

         var error;

         define('Foo/BarB', function() {
            var Bar = function() {/* noop */};
            Bar.prototype._moduleName = 'Foo/BarB';
            Object.defineProperty(Bar, 'propA', {
               enumerable: true,
               get: function() {
                  error = new Error('Accessor descriptor getter shouldn\'t being called');
                  return error;
               }
            });
            return Bar;
         });

         require(['Foo/BarB'], function() {
            done(error);
         }, done);
      });

      it('should serialize class as library member with toJSON() use last defined _moduleName on prototype', function(done) {
         after(function() {
            requirejs.undef('Foo/_Bar');
         });

         define('Foo/_Bar', function() {
            var Bar = function() {/* noop */};
            Bar.prototype._moduleName = 'Foo/_Bar';
            return Bar;
         });

         require(['Foo/_Bar'], function(Bar) {
            Bar.prototype._moduleName = 'Foo:Bar';
            var state = Bar.toJSON();
            assert.deepEqual(state, {
               $serialized$: 'func',
               module: 'Foo',
               path: 'Bar'
            });
            done();
         }, done);
      });
   });
});
