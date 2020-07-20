import {assert} from 'chai';
import getResourceUrl from 'RequireJsLoader/getResourceUrl';
// @ts-ignore
import {handlers} from 'RequireJsLoader/config';

// tslint:disable-next-line:ban-comma-operator
const global = (0, eval)('this');
const contents = global.contents;
const wsConfig = Object.assign({}, global.wsConfig);

function clear(obj: object): void {
   Object.keys(obj).forEach((key) => {
      delete obj[key];
   });
}

describe('RequireJsLoader/getResourceUrl', () => {
   beforeEach(() => {
      global.contents = {};
      handlers.getModulesPrefixes.invalidate();
   });

   afterEach(() => {
      global.contents = contents;

      clear(global.wsConfig);
      Object.assign(global.wsConfig, wsConfig);
   });

   it('should add domain name for absolute URL', () => {
      global.wsConfig.staticDomains = {domains: ['foo.bar', 'foo.baz']};
      assert.equal(getResourceUrl('/path/to/resource.js'), '//foo.bar/path/to/resource.js');
   });

   it('should add domain name for absolute URL use array syntax', () => {
      global.wsConfig.staticDomains = ['foo.bar', 'foo.baz'];
      assert.equal(getResourceUrl('/path/to/resource.js'), '//foo.bar/path/to/resource.js');
   });

   it('shouldn\'t add domain if there is no domains', () => {
      assert.equal(getResourceUrl('/path/to/resource.js'), '/path/to/resource.js');
   });

   it('shouldn\'t add domain name for files at resourceRoot folder', () => {
      global.wsConfig.resourceRoot = '/assets/';
      global.wsConfig.staticDomains = {domains: ['foo.bar']};
      assert.equal(getResourceUrl('/assets/resource.js'), '/assets/resource.js');
      assert.equal(getResourceUrl('/assets/a/resource.js'), '//foo.bar/assets/a/resource.js');
   });

   it('shouldn\'t add domain name for relative URL', () => {
      global.wsConfig.staticDomains = {domains: ['foo.bar']};
      assert.equal(getResourceUrl('path/to/resource.js'), 'path/to/resource.js');
   });

   it('shouldn\'t add domain fname or relative URL use array syntax', () => {
      global.wsConfig.staticDomains = ['foo.bar'];
      assert.equal(getResourceUrl('path/to/resource.js'), 'path/to/resource.js');
   });

   it('should add domain name for certain file types', () => {
      const types = ['js', 'css'];
      global.wsConfig.staticDomains = {domains: ['foo.bar'], types};
      types.forEach((ext) => {
         assert.equal(getResourceUrl('/path/to/file.' + ext), '//foo.bar/path/to/file.' + ext);
      });
   });

   it('should add domain name for certain file types use array syntax', () => {
      global.wsConfig.staticDomains = ['foo.bar'];
      ['js'].forEach((ext) => {
         assert.equal(getResourceUrl('/path/to/file.' + ext), '//foo.bar/path/to/file.' + ext);
      });
   });

   it('shouldn\'t add domain name for another file types', () => {
      global.wsConfig.staticDomains = {domains: ['foo.bar'], types: ['js']};

      assert.equal(getResourceUrl('/path/to/file.css'), '/path/to/file.css');
      assert.equal(getResourceUrl('/path/to/file.png'), '/path/to/file.png');
      assert.equal(getResourceUrl('/path/to/file.ttf'), '/path/to/file.ttf');
   });

   it('shouldn\'t add domain name for another file types use array syntax', () => {
      global.wsConfig.staticDomains = ['foo.bar'];
      assert.equal(getResourceUrl('/path/to/file.css'), '/path/to/file.css');
      assert.equal(getResourceUrl('/path/to/file.png'), '/path/to/file.png');
      assert.equal(getResourceUrl('/path/to/file.ttf'), '/path/to/file.ttf');
   });

   it('should add domain name only for certains paths defined in "resources"', () => {
      global.wsConfig.staticDomains = {domains: ['foo.bar'], resources: ['/assets/', '/cdn/']};
      assert.equal(getResourceUrl('/assets/some/file.js'), '//foo.bar/assets/some/file.js');
      assert.equal(getResourceUrl('/cdn/some/file.js'), '//foo.bar/cdn/some/file.js');
      assert.equal(getResourceUrl('/path/to/file.js'), '/path/to/file.js');
   });

   it('should add domain name to any path if "resources" is not defined', () => {
      global.wsConfig.staticDomains = ['foo.bar'];
      assert.equal(getResourceUrl('/assets/some/file.js'), '//foo.bar/assets/some/file.js');
      assert.equal(getResourceUrl('/path/to/file.js'), '//foo.bar/path/to/file.js');
   });

   it('should add application version to the absolute URL without query string and moduleName', () => {
      global.wsConfig.resourceRoot = '/';
      global.contents.buildnumber = 'x.y.z';
      assert.equal(getResourceUrl('/foo/bar.js'), '/foo/bar.js?x_module=x.y.z');
      assert.equal(getResourceUrl('/foo/bar.png'), '/foo/bar.png?x_module=x.y.z');
   });

   it('should add application version to the absolute URL with query string and without moduleName', () => {
      global.wsConfig.resourceRoot = '/assets/';
      global.contents.buildnumber = 'x.y.z';
      assert.equal(getResourceUrl('/foo/bar.js?darth=vader'), '/foo/bar.js?x_module=x.y.z&darth=vader');
   });

   it('should add application version to the absolute URL with query string and moduleName', () => {
      global.wsConfig.resourceRoot = '/';
      global.contents.buildnumber = 'x.y.z';
      global.contents.modules = {
         foo: {
            buildnumber: 'a.b.c'
         }
      };
      assert.equal(getResourceUrl('/foo/bar.js?darth=vader'), '/foo/bar.js?x_module=x.y.z&darth=vader');
   });

   it('shouldn\'t add application version to the absolute URL if versioning flag is false', () => {
      global.wsConfig.versioning = false;
      global.wsConfig.resourceRoot = '/';
      global.contents.buildnumber = 'x.y.z';
      assert.equal(getResourceUrl('/foo/bar.js'), '/foo/bar.js');
   });

   it('should add module version to the URL', () => {
      global.wsConfig.resourceRoot = '/assets/';
      global.contents.modules = {
         foo: {
            buildnumber: 'a.b.c'
         }
      };
      assert.equal(getResourceUrl('/assets/foo/bar.js'), '/assets/foo/bar.js?x_module=a.b.c');
   });

   it('should add module version to irregular URL', () => {
      global.wsConfig.resourceRoot = '/assets/';
      global.contents.modules = {
         foo: {
            buildnumber: 'a.b.c',
            path: '/irregular/path/foo'
         }
      };
      assert.equal(getResourceUrl('/irregular/path/foo/bar.js'), '/irregular/path/foo/bar.js?x_module=a.b.c');
   });

   it('should add module version to irregular module folder', () => {
      global.wsConfig.resourceRoot = '/assets/';
      global.contents.modules = {
         foo: {
            buildnumber: 'a.b.c',
            path: '/irregular/path/bar'
         }
      };
      assert.equal(getResourceUrl('/irregular/path/bar/baz.js'), '/irregular/path/bar/baz.js?x_module=a.b.c');
   });

   it('should add module version from application version', () => {
      global.wsConfig.resourceRoot = '/assets/';
      global.contents.buildnumber = 'a.b.c';
      global.contents.modules = {
         foo: {}
      };
      assert.equal(getResourceUrl('/assets/foo/bar.js'), '/assets/foo/bar.js?x_module=a.b.c');
   });

   it('should add context version to the URL', () => {
      global.wsConfig.resourceRoot = '/assets/';
      global.contents.modules = {
         foo: {
            buildnumber: 'a.b.c',
            contextVersion: 'e.f'
         }
      };
      assert.equal(getResourceUrl('/assets/foo/bar.js'), '/assets/foo/bar.js?x_module=a.b.c&x_version=e.f');
   });

   it('should add module version to the URL if resourceRoot is included twice', () => {
      global.wsConfig.resourceRoot = '/assets/';
      global.contents.modules = {
         foo: {
            buildnumber: 'a.b.c'
         }
      };
      assert.equal(getResourceUrl('/assets/foo/assets/bar.js'), '/assets/foo/assets/bar.js?x_module=a.b.c');
   });

   it('should deal with not a string', () => {
      assert.isUndefined(getResourceUrl(undefined));
      assert.isNull(getResourceUrl(null));
   });

   it('should add product name to the URL with file from resource root', () => {
      global.wsConfig.resourceRoot = '/assets/';
      global.wsConfig.product = 'foo';
      assert.equal(getResourceUrl('/assets/index.js'), '/assets/index.js?x_app=foo');
   });

   it('shouldn\'t add product name to the module URL', () => {
      global.wsConfig.resourceRoot = '/assets/';
      global.wsConfig.product = 'foo';
      global.contents.modules = {
         bar: {}
      };
      assert.equal(getResourceUrl('/assets/bar/index.js'), '/assets/bar/index.js');
   });

   it('shouldn\'t add product name to the irregular URL', () => {
      global.wsConfig.resourceRoot = '/assets/';
      global.wsConfig.product = 'foo';
      assert.equal(getResourceUrl('/some/module.js'), '/some/module.js');
   });

   it('shouldn\'t add version if there is no build number', () => {
      global.wsConfig.resourceRoot = '/assets/';
      assert.equal(getResourceUrl('/assets/foo/bar.js'), '/assets/foo/bar.js');
   });
});
