/* global define, describe, it, assert */
define([
   'RequireJsLoader/getResourceUrl'
], function(
   getResourceUrl
) {
   'use strict';

   var global = this || (0, eval)('this');// eslint-disable-line no-eval

   describe('RequireJsLoader/getResourceUrl', function() {
      var contents = global.contents;
      var wsConfig = Object.assign({}, global.wsConfig);

      function clear(obj) {
         Object.keys(obj).forEach(function(key) {
            delete obj[key];
         });
      }

      beforeEach(function() {
         global.contents = {};
         global.wsConfig.getModulesPrefixes.invalidate();
      });

      afterEach(function() {
         global.contents = contents;

         clear(global.wsConfig);
         Object.assign(global.wsConfig, wsConfig);
      });

      it('should add domain name for absolute URL', function() {
         global.wsConfig.staticDomains = {domains: ['foo.bar', 'foo.baz']};
         assert.equal(getResourceUrl('/path/to/resource.js'), '//foo.bar/path/to/resource.js');
      });

      it('should add domain name for absolute URL use array syntax', function() {
         global.wsConfig.staticDomains = ['foo.bar', 'foo.baz'];
         assert.equal(getResourceUrl('/path/to/resource.js'), '//foo.bar/path/to/resource.js');
      });

      it('shouldn\'t add domain if there is no domains', function() {
         assert.equal(getResourceUrl('/path/to/resource.js'), '/path/to/resource.js');
      });

      it('shouldn\'t add domain name for files at resourceRoot folder', function() {
         global.wsConfig.resourceRoot = '/assets/';
         global.wsConfig.staticDomains = {domains: ['foo.bar']};
         assert.equal(getResourceUrl('/assets/resource.js'), '/assets/resource.js');
         assert.equal(getResourceUrl('/assets/a/resource.js'), '//foo.bar/assets/a/resource.js');
      });

      it('shouldn\'t add domain name for relative URL', function() {
         global.wsConfig.staticDomains = {domains: ['foo.bar']};
         assert.equal(getResourceUrl('path/to/resource.js'), 'path/to/resource.js');
      });

      it('shouldn\'t add domain fname or relative URL use array syntax', function() {
         global.wsConfig.staticDomains = ['foo.bar'];
         assert.equal(getResourceUrl('path/to/resource.js'), 'path/to/resource.js');
      });

      it('should add domain name for certain file types', function() {
         var types = ['js', 'css'];
         global.wsConfig.staticDomains = {domains: ['foo.bar'], types: types};
         types.forEach(function(ext) {
            assert.equal(getResourceUrl('/path/to/file.' + ext), '//foo.bar/path/to/file.' + ext);
         });
      });

      it('should add domain name for certain file types use array syntax', function() {
         global.wsConfig.staticDomains = ['foo.bar'];
         ['js'].forEach(function(ext) {
            assert.equal(getResourceUrl('/path/to/file.' + ext), '//foo.bar/path/to/file.' + ext);
         });
      });

      it('shouldn\'t add domain name for another file types', function() {
         global.wsConfig.staticDomains = {domains: ['foo.bar'], types: ['js']};

         assert.equal(getResourceUrl('/path/to/file.css'), '/path/to/file.css');
         assert.equal(getResourceUrl('/path/to/file.png'), '/path/to/file.png');
         assert.equal(getResourceUrl('/path/to/file.ttf'), '/path/to/file.ttf');
      });

      it('shouldn\'t add domain name for another file types use array syntax', function() {
         global.wsConfig.staticDomains = ['foo.bar'];
         assert.equal(getResourceUrl('/path/to/file.css'), '/path/to/file.css');
         assert.equal(getResourceUrl('/path/to/file.png'), '/path/to/file.png');
         assert.equal(getResourceUrl('/path/to/file.ttf'), '/path/to/file.ttf');
      });

      it('should add domain name only for certains paths defined in "resources"', function() {
         global.wsConfig.staticDomains = {domains: ['foo.bar'], resources: ['/assets/', '/cdn/']};
         assert.equal(getResourceUrl('/assets/some/file.js'), '//foo.bar/assets/some/file.js');
         assert.equal(getResourceUrl('/cdn/some/file.js'), '//foo.bar/cdn/some/file.js');
         assert.equal(getResourceUrl('/path/to/file.js'), '/path/to/file.js');
      });

      it('should add domain name to any path if "resources" is not defined', function() {
         global.wsConfig.staticDomains = ['foo.bar'];
         assert.equal(getResourceUrl('/assets/some/file.js'), '//foo.bar/assets/some/file.js');
         assert.equal(getResourceUrl('/path/to/file.js'), '//foo.bar/path/to/file.js');
      });

      it('should add application version to the absolute URL without query string and moduleName', function() {
         global.wsConfig.resourceRoot = '/';
         global.contents.buildnumber = 'x.y.z';
         assert.equal(getResourceUrl('/foo/bar.js'), '/foo/bar.js?x_module=x.y.z');
         assert.equal(getResourceUrl('/foo/bar.png'), '/foo/bar.png?x_module=x.y.z');
      });

      it('should add application version to the absolute URL with query string and without moduleName', function() {
         global.wsConfig.resourceRoot = '/assets/';
         global.contents.buildnumber = 'x.y.z';
         assert.equal(getResourceUrl('/foo/bar.js?darth=vader'), '/foo/bar.js?x_module=x.y.z&darth=vader');
      });

      it('should add application version to the absolute URL with query string and moduleName', function() {
         global.wsConfig.resourceRoot = '/';
         global.contents.buildnumber = 'x.y.z';
         global.contents.modules = {
            foo: {
               buildnumber: 'a.b.c'
            }
         };
         assert.equal(getResourceUrl('/foo/bar.js?darth=vader'), '/foo/bar.js?x_module=x.y.z&darth=vader');
      });

      it('shouldn\'t add application version to the absolute URL if versioning flag is false', function() {
         global.wsConfig.versioning = false;
         global.wsConfig.resourceRoot = '/';
         global.contents.buildnumber = 'x.y.z';
         assert.equal(getResourceUrl('/foo/bar.js'), '/foo/bar.js');
      });

      it('should add module version to the URL', function() {
         global.wsConfig.resourceRoot = '/assets/';
         global.contents.modules = {
            foo: {
               buildnumber: 'a.b.c'
            }
         };
         assert.equal(getResourceUrl('/assets/foo/bar.js'), '/assets/foo/bar.js?x_module=a.b.c');
      });

      it('should add module version to irregular URL', function() {
         global.wsConfig.resourceRoot = '/assets/';
         global.contents.modules = {
            foo: {
               buildnumber: 'a.b.c',
               path: '/irregular/path/foo'
            }
         };
         assert.equal(getResourceUrl('/irregular/path/foo/bar.js'), '/irregular/path/foo/bar.js?x_module=a.b.c');
      });

      it('should add module version to irregular module folder', function() {
         global.wsConfig.resourceRoot = '/assets/';
         global.contents.modules = {
            foo: {
               buildnumber: 'a.b.c',
               path: '/irregular/path/bar'
            }
         };
         assert.equal(getResourceUrl('/irregular/path/bar/baz.js'), '/irregular/path/bar/baz.js?x_module=a.b.c');
      });

      it('should add module version from application version', function() {
         global.wsConfig.resourceRoot = '/assets/';
         global.contents.buildnumber = 'a.b.c';
         global.contents.modules = {
            foo: {}
         };
         assert.equal(getResourceUrl('/assets/foo/bar.js'), '/assets/foo/bar.js?x_module=a.b.c');
      });

      it('should add context version to the URL', function() {
         global.wsConfig.resourceRoot = '/assets/';
         global.contents.modules = {
            foo: {
               buildnumber: 'a.b.c',
               contextVersion: 'e.f'
            }
         };
         assert.equal(getResourceUrl('/assets/foo/bar.js'), '/assets/foo/bar.js?x_module=a.b.c&x_version=e.f');
      });

      it('should add module version to the URL if resourceRoot is included twice', function() {
         global.wsConfig.resourceRoot = '/assets/';
         global.contents.modules = {
            foo: {
               buildnumber: 'a.b.c'
            }
         };
         assert.equal(getResourceUrl('/assets/foo/assets/bar.js'), '/assets/foo/assets/bar.js?x_module=a.b.c');
      });

      it('should deal with not a string', function() {
         assert.isUndefined(getResourceUrl(undefined));
         assert.isNull(getResourceUrl(null));
      });

      it('should add product name to the URL with file from resource root', function() {
         global.wsConfig.resourceRoot = '/assets/';
         global.wsConfig.product = 'foo';
         assert.equal(getResourceUrl('/assets/index.js'), '/assets/index.js?x_app=foo');
      });

      it('shouldn\'t add product name to the module URL', function() {
         global.wsConfig.resourceRoot = '/assets/';
         global.wsConfig.product = 'foo';
         global.contents.modules = {
            bar: {}
         };
         assert.equal(getResourceUrl('/assets/bar/index.js'), '/assets/bar/index.js');
      });

      it('shouldn\'t add product name to the irregular URL', function() {
         global.wsConfig.resourceRoot = '/assets/';
         global.wsConfig.product = 'foo';
         assert.equal(getResourceUrl('/some/module.js'), '/some/module.js');
      });

      it('shouldn\'t add version if there is no build number', function() {
         global.wsConfig.resourceRoot = '/assets/';
         assert.equal(getResourceUrl('/assets/foo/bar.js'), '/assets/foo/bar.js');
      });
   });
});
