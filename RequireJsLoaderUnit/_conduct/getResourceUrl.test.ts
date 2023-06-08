import { assert } from 'chai';
import getResourceUrl from 'RequireJsLoader/_conduct/getResourceUrl';
import { handlers } from 'RequireJsLoader/config';
import { IContents, IWsConfig } from 'RequireJsLoader/wasaby';

const originalContents = globalThis.contents;
const originalWsConfig = {...globalThis.wsConfig};

function clear(obj: object): void {
   Object.keys(obj).forEach((key) => {
        delete obj[key];
   });
}

describe('RequireJsLoader/_conduct/getResourceUrl', () => {
    let wsConfig: IWsConfig;
    let contents: IContents;

    beforeEach(() => {
        wsConfig = globalThis.wsConfig;
        contents = globalThis.contents = {};
        wsConfig.versioning = true;
        handlers.getModulesPrefixes.invalidate();
    });

    afterEach(() => {
        globalThis.contents = originalContents;
        clear(wsConfig);
        Object.assign(wsConfig, originalWsConfig);
   });

    it('should add domain name for absolute URL', () => {
        wsConfig.staticDomains = {domains: ['foo.bar', 'foo.baz']};
        assert.equal(getResourceUrl('/path/to/resource.js'), '//foo.bar/path/to/resource.js');
    });

    it('should ignore domain name if it\'s disabled by user', () => {
        wsConfig.staticDomains = {domains: ['foo.bar', 'foo.baz']};
        assert.equal(getResourceUrl('/path/to/resource.js', undefined, true), '/path/to/resource.js');
    });

    it('should insert ie postfix for css only if it\'s enabled by user', () => {
        wsConfig.staticDomains = {domains: ['foo.bar', 'foo.baz']};
        assert.equal(getResourceUrl('/path/to/resource.js', undefined, true, true), '/path/to/resource.js');
        assert.equal(getResourceUrl('/path/to/resource.css', undefined, true, true), '/path/to/resource_ie.css');
        assert.equal(getResourceUrl('/cdn/path/to/resource.css', undefined, true, true), '/cdn/path/to/resource.css');
        assert.equal(getResourceUrl('/ThemesModule/resource.css', undefined, true, true), '/ThemesModule/resource.css');
    });

    it('should insert rtl postfix for css only if direction is equal to rtl', () => {
        wsConfig.staticDomains = {domains: ['foo.bar', 'foo.baz']};
        assert.equal(getResourceUrl('/path/to/resource.js', undefined, true, true, 'rtl'), '/path/to/resource.js');
        assert.equal(getResourceUrl('/cdn/path/to/resource.css', undefined, true, false, 'rtl'), '/cdn/path/to/resource.css');
        assert.equal(getResourceUrl('/path/to/resource.css', undefined, true, false, 'rtl'), '/path/to/resource.rtl.css');
        assert.equal(getResourceUrl('/ThemesModule/resource.css', undefined, true, false, 'rtl'), '/ThemesModule/resource.rtl.css');
    });

    it('should add domain name for absolute URL use array syntax', () => {
        wsConfig.staticDomains = ['foo.bar', 'foo.baz'];
        assert.equal(getResourceUrl('/path/to/resource.js'), '//foo.bar/path/to/resource.js');
    });

    it('should add domain name for debug modules on a client with transmitted cookie', () => {
        wsConfig.staticDomains = ['foo.bar', 'foo.baz'];
        wsConfig.IS_SERVER_SCRIPT = false;
        assert.equal(getResourceUrl('/path/to/resource.js'), '/path/to/resource.js');
        assert.equal(getResourceUrl('/path/to/resource.js', 'true'), '/path/to/resource.js');
        assert.equal(getResourceUrl('/path/to/resource.js', 'false'), '//foo.bar/path/to/resource.js');
    });

    it('shouldn\'t add domain if there is no domains', () => {
        assert.equal(getResourceUrl('/path/to/resource.js'), '/path/to/resource.js');
    });

    it('shouldn\'t add domain name for files at resourceRoot folder', () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.staticDomains = {domains: ['foo.bar']};
        assert.equal(getResourceUrl('/assets/resource.js'), '/assets/resource.js');
        assert.equal(getResourceUrl('/assets/a/resource.js'), '//foo.bar/assets/a/resource.js');
    });

    it('shouldn\'t add domain name for svg files and contents meta', () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.staticDomains = {domains: ['foo.bar']};
        assert.equal(getResourceUrl('/assets/a/resource.js'), '//foo.bar/assets/a/resource.js');
        assert.equal(getResourceUrl('/assets/a/resource.svg'), '/assets/a/resource.svg');
        assert.equal(getResourceUrl('/assets/contents.min.js'), '/assets/contents.min.js');
        assert.equal(getResourceUrl('/assets/contents.js'), '/assets/contents.js');
    });

    it('shouldn\'t add domain name for relative URL', () => {
        wsConfig.staticDomains = {domains: ['foo.bar']};
        assert.equal(getResourceUrl('path/to/resource.js'), 'path/to/resource.js');
    });

    it('shouldn\'t add domain name for relative URL use array syntax', () => {
        wsConfig.staticDomains = ['foo.bar'];
        assert.equal(getResourceUrl('path/to/resource.js'), 'path/to/resource.js');
    });

    it('should add domain name for certain file types', () => {
        const types = ['js', 'css'];
        wsConfig.staticDomains = {domains: ['foo.bar'], types};
        types.forEach((ext) => {
            assert.equal(getResourceUrl('/path/to/file.' + ext), '//foo.bar/path/to/file.' + ext);
        });
    });

    it('should add domain name for certain file types use array syntax', () => {
        wsConfig.staticDomains = ['foo.bar'];
        ['js'].forEach((ext) => {
            assert.equal(getResourceUrl('/path/to/file.' + ext), '//foo.bar/path/to/file.' + ext);
        });
    });

    it('shouldn\'t add domain name for another file types', () => {
        wsConfig.staticDomains = {domains: ['foo.bar'], types: ['js']};

        assert.equal(getResourceUrl('/path/to/file.css'), '/path/to/file.css');
        assert.equal(getResourceUrl('/path/to/file.png'), '/path/to/file.png');
        assert.equal(getResourceUrl('/path/to/file.ttf'), '/path/to/file.ttf');
    });

    it('shouldn\'t add domain name for another file types use array syntax', () => {
        wsConfig.staticDomains = ['foo.bar'];
        assert.equal(getResourceUrl('/path/to/file.css'), '/path/to/file.css');
        assert.equal(getResourceUrl('/path/to/file.png'), '/path/to/file.png');
        assert.equal(getResourceUrl('/path/to/file.ttf'), '/path/to/file.ttf');
    });

    it('should add domain name only for certains paths defined in "resources"', () => {
        wsConfig.staticDomains = {domains: ['foo.bar'], resources: ['/assets/', '/cdn/']};
        assert.equal(getResourceUrl('/assets/some/file.js'), '//foo.bar/assets/some/file.js');
        assert.equal(getResourceUrl('/cdn/some/file.js'), '//foo.bar/cdn/some/file.js');
        assert.equal(getResourceUrl('/path/to/file.js'), '/path/to/file.js');
    });

    it('should add domain name to any path if "resources" is not defined', () => {
        wsConfig.staticDomains = ['foo.bar'];
        assert.equal(getResourceUrl('/assets/some/file.js'), '//foo.bar/assets/some/file.js');
        assert.equal(getResourceUrl('/path/to/file.js'), '//foo.bar/path/to/file.js');
    });

    it('should add application version to the absolute URL without query string and moduleName', () => {
        wsConfig.resourceRoot = '/';
        contents.buildnumber = 'x.y.z';
        assert.equal(getResourceUrl('/foo/bar.js'), '/foo/bar.js?x_module=x.y.z');
        assert.equal(getResourceUrl('/foo/bar.png'), '/foo/bar.png?x_module=x.y.z');
    });

    it('should not add module version to the absolute URL if it is already there', () => {
        wsConfig.resourceRoot = '/';
        contents.buildnumber = 'x.y.z';
        assert.equal(
            getResourceUrl('/irregular/path/RequireJsLoader/test.js?x_app=test123&x_module=x.y.z'),
            '/irregular/path/RequireJsLoader/test.js?x_app=test123&x_module=x.y.z'
        );
        assert.equal(
            getResourceUrl('/irregular/path/RequireJsLoader/test.png?x_app=test123&x_module=x.y.z'),
            '/irregular/path/RequireJsLoader/test.png?x_app=test123&x_module=x.y.z'
        );
    });

    it('should add application version to the absolute URL with query string and without moduleName', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.buildnumber = 'x.y.z';
        assert.equal(getResourceUrl('/foo/bar.js?darth=vader'), '/foo/bar.js?x_module=x.y.z&darth=vader');
    });

    it('should add application version to the absolute URL with query string and moduleName', () => {
        wsConfig.resourceRoot = '/';
        contents.buildnumber = 'x.y.z';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c'
            }
        };
        assert.equal(getResourceUrl('/foo/bar.js?darth=vader'), '/foo/bar.js?x_module=x.y.z&darth=vader');
    });

    it('shouldn\'t add application version to the absolute URL if versioning flag is false', () => {
        wsConfig.versioning = false;
        wsConfig.resourceRoot = '/';
        contents.buildnumber = 'x.y.z';
        assert.equal(getResourceUrl('/foo/bar.js'), '/foo/bar.js');
    });

    it('should add module version to the URL', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c'
            }
        };
        assert.equal(getResourceUrl('/assets/foo/bar.js'), '/assets/foo/bar.js?x_module=a.b.c');
    });

    it('should add module version to irregular URL', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
                path: '/irregular/path/foo'
            }
        };
        assert.equal(getResourceUrl('/irregular/path/foo/bar.js'), '/irregular/path/foo/bar.js?x_module=a.b.c');
    });

    it('should add module path to irregular URL if not selected', () => {
        wsConfig.resourceRoot = '/static/assets/';
        wsConfig.metaRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
                path: '/irregular/path/foo'
            }
        };
        const correctResult = '/irregular/path/foo/bar.js?x_module=a.b.c';

        assert.equal(getResourceUrl('/irregular/path/foo/bar.js'), correctResult);
        assert.equal(getResourceUrl('/foo/bar.js'), correctResult);
        assert.equal(getResourceUrl('foo/bar.js'), correctResult);
    });

    it('should add resourceRoot for module url if url without resourceRoot', () => {
        wsConfig.resourceRoot = '/static/assets/';
        wsConfig.metaRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c'
            }
        };
        const correctResult = '/static/assets/foo/bar.js?x_module=a.b.c';

        assert.equal(getResourceUrl('/static/assets/foo/bar.js'), correctResult);
        assert.equal(getResourceUrl('/foo/bar.js'), correctResult);
        assert.equal(getResourceUrl('foo/bar.js'), correctResult);
    });

    it('should add metaRoot for root url if url without metaRoot', () => {
        wsConfig.metaRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c'
            }
        };
        const correctResult = '/assets/bar.js';

        assert.equal(getResourceUrl('/assets/bar.js'), correctResult);
        assert.equal(getResourceUrl('/bar.js'), correctResult);
        assert.equal(getResourceUrl('bar.js'), correctResult);
    });

    it('should add module version to irregular module folder', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
                path: '/irregular/path/bar'
            }
        };
        assert.equal(getResourceUrl('/irregular/path/bar/baz.js'), '/irregular/path/bar/baz.js?x_module=a.b.c');
    });

    it('should add module version from application version', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.buildnumber = 'a.b.c';
        contents.modules = {
            foo: {}
        };
        assert.equal(getResourceUrl('/assets/foo/bar.js'), '/assets/foo/bar.js?x_module=a.b.c');
    });

    it('should add context version to the URL', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
                contextVersion: 'e.f'
            }
        };
        assert.equal(getResourceUrl('/assets/foo/bar.js'), '/assets/foo/bar.js?x_module=a.b.c&x_version=e.f');
    });

    it('should not add context version to the URL if it is already there', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
                contextVersion: 'e.f'
            }
        };
        assert.equal(getResourceUrl('/assets/foo/bar.js?x_module=a.b.c&x_version=e.f'), '/assets/foo/bar.js?x_module=a.b.c&x_version=e.f');
    });

    it('should add module version to the URL if resourceRoot is included twice', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.modules = {
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

    it('should deal with not a string if domain name specified', () => {
        wsConfig.staticDomains = {domains: ['foo.bar']};
        assert.isUndefined(getResourceUrl(undefined));
        assert.isNull(getResourceUrl(null));
    });

    it('should add product name to the URL with file from resource root', () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.product = 'foo';
        assert.equal(getResourceUrl('/assets/index.js'), '/assets/index.js?x_app=foo');
    });

    it('should add product name to the URL and preserve order in case there is already a x_module in headers', () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.product = 'foo';
        assert.equal(getResourceUrl('/assets/index.js?x_module=test'), '/assets/index.js?x_module=test&x_app=foo');
    });

    it('should not add product name to the URL if it is already there', () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.product = 'foo';
        assert.equal(getResourceUrl('/assets/index.js?x_module=test&x_app=foo'), '/assets/index.js?x_module=test&x_app=foo');
    });

    it('shouldn\'t add product name to the module URL', () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.product = 'foo';
        contents.modules = {
            bar: {}
        };
        assert.equal(getResourceUrl('/assets/bar/index.js'), '/assets/bar/index.js');
    });

    it('shouldn\'t add product name to the irregular URL', () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.product = 'foo';
        assert.equal(getResourceUrl('/some/module.js'), '/some/module.js');
    });

    it('shouldn\'t add version if there is no build number', () => {
        wsConfig.resourceRoot = '/assets/';
        assert.equal(getResourceUrl('/assets/foo/bar.js'), '/assets/foo/bar.js');
    });
});
