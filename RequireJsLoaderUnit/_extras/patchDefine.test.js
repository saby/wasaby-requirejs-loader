/* global define, describe, it, assert */
define([
   'RequireJsLoader/_extras/patchDefine',
   'RequireJsLoader/_extras/utils'
], function(
   defineExtra,
   utils
) {
   'use strict';

   describe('RequireJsLoader/_extras/patchDefine', function() {
      var requirejs = utils.getInstance();

      describe('getCircularDependencies()', function() {
         var getCircularDependencies = defineExtra.getCircularDependencies;

         it('should return circular path', function() {
            var deps = {
               ModuleA: ['ModuleB'],
               ModuleB: ['ModuleC'],
               ModuleC: ['ModuleA']
            };
            var loader = {
               defined: function(name) {
                  return name === 'ModuleA';
               }
            };

            assert.deepEqual(
               getCircularDependencies('ModuleA', deps, loader),
               ['ModuleA', 'ModuleB', 'ModuleC', 'ModuleA']
            );
         });

         it('should return circular path even for another module', function() {
            var deps = {
               ModuleA: ['ModuleB'],
               ModuleB: ['ModuleC'],
               ModuleC: ['ModuleB']
            };
            var loader = {
               defined: function(name) {
                  return name === 'ModuleA';
               }
            };

            assert.deepEqual(
               getCircularDependencies('ModuleA', deps, loader),
               ['ModuleA', 'ModuleB', 'ModuleC', 'ModuleB']
            );
         });

         it('should return undefined if there is no circular path', function() {
            var deps = {
               ModuleA: ['ModuleB'],
               ModuleB: ['ModuleC'],
               ModuleC: []
            };
            var loader = {
               defined: function(name) {
                  return name === 'ModuleA';
               }
            };

            assert.isUndefined(getCircularDependencies('ModuleA', deps, loader));
         });
      });

      describe('addForeignServiceDependencies()', function() {
         var addForeignServiceDependencies = defineExtra.addForeignServiceDependencies;

         it('should add unknown module requested by foreign service to the modules list', function() {
            var modules = {
               ForeignModule1: {
                  service: 'foo',
                  path: '/foo-service/assests/ForeignModule1',
                  buildnumber: '1.2.3',
                  contextVersion: '4.5'
               }
            };
            addForeignServiceDependencies(requirejs, modules, 'ForeignModule1/A', ['UnknownModule1/B']);

            assert.deepEqual(modules.UnknownModule1, {
               initializer: 'ForeignModule1/A',
               path: '/foo-service/assests/UnknownModule1',
               service: 'foo',
               buildnumber: '1.2.3',
               contextVersion: '4.5'
            });
         });

         it('shouldn\'t add service module to the modules list', function() {
            var modules = {
               ForeignModule1: {
                  service: 'foo',
                  path: '/foo-service/assests/ForeignModule1',
                  buildnumber: '1.2.3',
                  contextVersion: '4.5'
               }
            };
            addForeignServiceDependencies(requirejs, modules, 'ForeignModule1/A', ['ServiceModule1']);

            assert.isUndefined(modules.ServiceModule1);
         });

         it('shouldn\'t add unknown module to the modules list in common case', function() {
            var modules = {
               ForeignModule2: {
                  buildnumber: '1.2.3'
               }
            };
            addForeignServiceDependencies(requirejs, modules, 'ForeignModule2/A', ['UnknownModule2/B']);

            assert.isUndefined(modules.UnknownModule2);
         });

         it('shouldn\'t add unknown module to the modules list if initial module is not defined', function() {
            var modules = {};
            addForeignServiceDependencies(requirejs, modules, 'ForeignModule3/A', ['UnknownModule3/B']);

            assert.isUndefined(modules.UnknownModule3);
         });
      });
   });
});
