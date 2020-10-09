/* global define, describe, it, assert */
define([
   'optional'
], function(
   optional
) {
   'use strict';

   describe('RequireJsLoader/plugins/optional', function() {
      describe('.load()', function() {
         it('should call callback on success', function() {
            var require = function(names, success) {
               success('ok:' + names.join(','));
            };
            var result;
            var handler = function(res) {
               result = res;
            };
            optional.load('foo', require, handler);

            assert.equal(
               result,
               'ok:foo'
            );
         });

         it('should call .error() on fail', function() {
            var require = function(names, success, fail) {
               fail(new Error('fail:' + names.join(',')));
            };
            var error;
            var handler = {
               error: function(err) {
                  error = err;
               }
            };
            optional.load('foo', require, handler);

            assert.instanceOf(
               error,
               Error
            );
         });

         it('should pass null to callback on RequireJS script error', function() {
            var require = function(names, success, fail) {
               var err = new Error('Not Found');
               err.requireType = 'scripterror';
               fail(err);
            };

            var result;
            var handler = function(res) {
               result = res;
            };
            optional.load('foo', require, handler);

            assert.isNull(result);
         });

         it('should pass null to callback on RequireJS define error under NodeJS', function() {
            var require = function(names, success, fail) {
               var err = new Error('Not found while tried node\'s require("/foo.js")');
               err.requireType = 'define';
               fail(err);
            };

            var result;
            var handler = function(res) {
               result = res;
            };
            optional.load('foo', require, handler);

            assert.isNull(result);
         });

         it('should pass null to callback on XMLHttpRequest 404 error', function() {
            var require = function(names, success, fail) {
               var err = new Error('Not found');
               err.xhr = {
                  status: 404
               };
               fail(err);
            };

            var result;
            var handler = function(res) {
               result = res;
            };
            optional.load('foo', require, handler);

            assert.isNull(result);
         });

         it('should return module synchronously if it is loaded already', function() {
            var foo = {};
            var require = function(name) {
               if (name === 'foo') {
                   return foo;
               }
               throw new Error('Not found')
            };
            require.defined = function(name) {
                return name === 'foo'
            }

            var result;
            var handler = function(res) {
               result = res;
            };
            optional.load('foo', require, handler);

            assert.equal(result, foo);
         });
      });
   });
});
