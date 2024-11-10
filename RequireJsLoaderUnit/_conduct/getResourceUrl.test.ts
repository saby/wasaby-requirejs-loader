import getResourceUrl from 'RequireJsLoader/_conduct/getResourceUrl';
import { handlers } from 'RequireJsLoader/config';
import { IContents, IWsConfig, IPatchedGlobal } from 'RequireJsLoader/wasaby';

const originalContents = (globalThis as unknown as IPatchedGlobal).contents;
const originalWsConfig = { ...(globalThis as unknown as IPatchedGlobal).wsConfig };

function clear(obj: object): void {
    Object.keys(obj).forEach((key) => {
        // @ts-ignore
        delete obj[key];
    });
}

describe('RequireJsLoader/_conduct/getResourceUrl', () => {
    let wsConfig: IWsConfig;
    let contents: IContents;

    beforeEach(() => {
        wsConfig = (globalThis as unknown as IPatchedGlobal).wsConfig;
        contents = (globalThis as unknown as IPatchedGlobal).contents = {};
        wsConfig.versioning = true;
        handlers.getModulesPrefixes.invalidate();
    });

    afterEach(() => {
        (globalThis as unknown as IPatchedGlobal).contents = originalContents;
        clear(wsConfig);
        Object.assign(wsConfig, originalWsConfig);
    });

    test('should add domain name for absolute URL', () => {
        wsConfig.staticDomains = { domains: ['foo.bar', 'foo.baz'] };
        expect(getResourceUrl('/path/to/resource.js')).toStrictEqual(
            '//foo.bar/path/to/resource.js'
        );
    });

    test("should ignore domain name if it's disabled by user", () => {
        wsConfig.staticDomains = { domains: ['foo.bar', 'foo.baz'] };
        expect(getResourceUrl('/path/to/resource.js', undefined, true)).toStrictEqual(
            '/path/to/resource.js'
        );
    });

    test("shouldn't insert ie postfix for css only if it's enabled by user", () => {
        wsConfig.staticDomains = { domains: ['foo.bar', 'foo.baz'] };
        expect(getResourceUrl('/path/to/resource.js', undefined, true, true)).toStrictEqual(
            '/path/to/resource.js'
        );

        expect(getResourceUrl('/path/to/resource.css', undefined, true, true)).toStrictEqual(
            '/path/to/resource.css'
        );

        expect(getResourceUrl('/cdn/path/to/resource.css', undefined, true, true)).toStrictEqual(
            '/cdn/path/to/resource.css'
        );

        expect(getResourceUrl('/ThemesModule/resource.css', undefined, true, true)).toStrictEqual(
            '/ThemesModule/resource.css'
        );
    });

    test('should insert rtl postfix for css only if direction is equal to rtl', () => {
        wsConfig.staticDomains = { domains: ['foo.bar', 'foo.baz'] };

        expect(getResourceUrl('/path/to/resource.js', undefined, true, true, 'rtl')).toStrictEqual(
            '/path/to/resource.js'
        );

        expect(
            getResourceUrl('/cdn/path/to/resource.css', undefined, true, true, 'rtl')
        ).toStrictEqual('/cdn/path/to/resource.css');

        expect(getResourceUrl('/path/to/resource.css', undefined, true, true, 'rtl')).toStrictEqual(
            '/path/to/resource.rtl.css'
        );

        expect(
            getResourceUrl('/ThemesModule/resource.css', undefined, true, true, 'rtl')
        ).toStrictEqual('/ThemesModule/resource.rtl.css');
    });

    test('should add domain name for absolute URL use array syntax', () => {
        wsConfig.staticDomains = ['foo.bar', 'foo.baz'];

        expect(getResourceUrl('/path/to/resource.js')).toStrictEqual(
            '//foo.bar/path/to/resource.js'
        );
    });

    test('should add domain name for debug modules on a client with transmitted cookie', () => {
        wsConfig.staticDomains = ['foo.bar', 'foo.baz'];
        wsConfig.IS_SERVER_SCRIPT = false;

        expect(getResourceUrl('/path/to/resource.js')).toStrictEqual('/path/to/resource.js');

        expect(getResourceUrl('/path/to/resource.js', 'true')).toStrictEqual(
            '/path/to/resource.js'
        );
    });

    test("shouldn't add domain if there is no domains", () => {
        expect(getResourceUrl('/path/to/resource.js')).toStrictEqual('/path/to/resource.js');
    });

    test("shouldn't add domain name for files at resourceRoot folder", () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.staticDomains = { domains: ['foo.bar'] };

        expect(getResourceUrl('/assets/resource.js')).toStrictEqual('/assets/resource.js');
        expect(getResourceUrl('/assets/a/resource.js')).toStrictEqual(
            '//foo.bar/assets/a/resource.js'
        );
    });

    test("shouldn't add domain name for svg files and contents meta", () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.staticDomains = { domains: ['foo.bar'] };

        expect(getResourceUrl('/assets/a/resource.js')).toStrictEqual(
            '//foo.bar/assets/a/resource.js'
        );

        expect(getResourceUrl('/assets/a/resource.svg')).toStrictEqual('/assets/a/resource.svg');

        expect(getResourceUrl('/assets/contents.min.js')).toStrictEqual('/assets/contents.min.js');

        expect(getResourceUrl('/assets/contents.js')).toStrictEqual('/assets/contents.js');
    });

    test("shouldn't add domain name for relative URL", () => {
        wsConfig.staticDomains = { domains: ['foo.bar'] };

        expect(getResourceUrl('path/to/resource.js')).toStrictEqual('path/to/resource.js');
    });

    test("shouldn't add domain name for relative URL use array syntax", () => {
        wsConfig.staticDomains = ['foo.bar'];

        expect(getResourceUrl('path/to/resource.js')).toStrictEqual('path/to/resource.js');
    });

    test('should add domain name for certain file types', () => {
        const types = ['js', 'css'];

        wsConfig.staticDomains = { domains: ['foo.bar'], types };

        types.forEach((ext) => {
            expect(getResourceUrl('/path/to/file.' + ext)).toStrictEqual(
                '//foo.bar/path/to/file.' + ext
            );
        });
    });

    test('should add domain name for certain file types use array syntax', () => {
        wsConfig.staticDomains = ['foo.bar'];

        ['js'].forEach((ext) => {
            expect(getResourceUrl('/path/to/file.' + ext)).toStrictEqual(
                '//foo.bar/path/to/file.' + ext
            );
        });
    });

    test("shouldn't add domain name for another file types", () => {
        wsConfig.staticDomains = { domains: ['foo.bar'], types: ['js'] };

        expect(getResourceUrl('/path/to/file.css')).toStrictEqual('/path/to/file.css');
        expect(getResourceUrl('/path/to/file.png')).toStrictEqual('/path/to/file.png');
        expect(getResourceUrl('/path/to/file.ttf')).toStrictEqual('/path/to/file.ttf');
    });

    test("shouldn't add domain name for another file types use array syntax", () => {
        wsConfig.staticDomains = ['foo.bar'];

        expect(getResourceUrl('/path/to/file.css')).toStrictEqual('/path/to/file.css');
        expect(getResourceUrl('/path/to/file.png')).toStrictEqual('/path/to/file.png');
        expect(getResourceUrl('/path/to/file.ttf')).toStrictEqual('/path/to/file.ttf');
    });

    test('should add domain name only for certains paths defined in "resources"', () => {
        wsConfig.staticDomains = { domains: ['foo.bar'], resources: ['/assets/', '/cdn/'] };

        expect(getResourceUrl('/assets/some/file.js')).toStrictEqual(
            '//foo.bar/assets/some/file.js'
        );

        expect(getResourceUrl('/cdn/some/file.js')).toStrictEqual('//foo.bar/cdn/some/file.js');

        expect(getResourceUrl('/path/to/file.js')).toStrictEqual('/path/to/file.js');
    });

    test('should add domain name to any path if "resources" is not defined', () => {
        wsConfig.staticDomains = ['foo.bar'];

        expect(getResourceUrl('/assets/some/file.js')).toStrictEqual(
            '//foo.bar/assets/some/file.js'
        );
        expect(getResourceUrl('/path/to/file.js')).toStrictEqual('//foo.bar/path/to/file.js');
    });

    test('should add application version to the absolute URL without query string and moduleName', () => {
        wsConfig.resourceRoot = '/';
        contents.buildnumber = 'x.y.z';

        expect(getResourceUrl('/foo/bar.js')).toStrictEqual('/foo/bar.js?x_module=x.y.z');
        expect(getResourceUrl('/foo/bar.png')).toStrictEqual('/foo/bar.png?x_module=x.y.z');
    });

    test('should not add module version to the absolute URL if it is already there', () => {
        wsConfig.resourceRoot = '/';
        contents.buildnumber = 'x.y.z';

        expect(
            getResourceUrl('/irregular/path/RequireJsLoader/test.js?x_app=test123&x_module=x.y.z')
        ).toStrictEqual('/irregular/path/RequireJsLoader/test.js?x_app=test123&x_module=x.y.z');

        expect(
            getResourceUrl('/irregular/path/RequireJsLoader/test.png?x_app=test123&x_module=x.y.z')
        ).toStrictEqual('/irregular/path/RequireJsLoader/test.png?x_app=test123&x_module=x.y.z');
    });

    test('should add application version to the absolute URL with query string and without moduleName', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.buildnumber = 'x.y.z';

        expect(getResourceUrl('/foo/bar.js?darth=vader')).toStrictEqual(
            '/foo/bar.js?x_module=x.y.z&darth=vader'
        );
    });

    test('should add application version to the absolute URL with query string and moduleName', () => {
        wsConfig.resourceRoot = '/';
        contents.buildnumber = 'x.y.z';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
            },
        };

        expect(getResourceUrl('/foo/bar.js?darth=vader')).toStrictEqual(
            '/foo/bar.js?x_module=x.y.z&darth=vader'
        );
    });

    test("shouldn't add application version to the absolute URL if versioning flag is false", () => {
        wsConfig.versioning = false;
        wsConfig.resourceRoot = '/';
        contents.buildnumber = 'x.y.z';

        expect(getResourceUrl('/foo/bar.js')).toStrictEqual('/foo/bar.js');
    });

    test('should add module version to the URL', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
            },
        };

        expect(getResourceUrl('/assets/foo/bar.js')).toStrictEqual(
            '/assets/foo/bar.js?x_module=a.b.c'
        );
    });

    test('should add module version to irregular URL', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
                path: '/irregular/path/foo',
            },
        };

        expect(getResourceUrl('/irregular/path/foo/bar.js')).toStrictEqual(
            '/irregular/path/foo/bar.js?x_module=a.b.c'
        );
    });

    test('should add module path to irregular URL if not selected', () => {
        wsConfig.resourceRoot = '/static/assets/';
        wsConfig.metaRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
                path: '/irregular/path/foo',
            },
        };
        const correctResult = '/irregular/path/foo/bar.js?x_module=a.b.c';

        expect(getResourceUrl('/irregular/path/foo/bar.js')).toStrictEqual(correctResult);
        expect(getResourceUrl('/foo/bar.js')).toStrictEqual(correctResult);
        expect(getResourceUrl('foo/bar.js')).toStrictEqual(correctResult);
    });

    test('should add resourceRoot for module url if url without resourceRoot', () => {
        wsConfig.resourceRoot = '/static/assets/';
        wsConfig.metaRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
            },
        };
        const correctResult = '/static/assets/foo/bar.js?x_module=a.b.c';

        expect(getResourceUrl('/static/assets/foo/bar.js')).toStrictEqual(correctResult);
        expect(getResourceUrl('/foo/bar.js')).toStrictEqual(correctResult);
        expect(getResourceUrl('foo/bar.js')).toStrictEqual(correctResult);
    });

    test('should add metaRoot for root url if url without metaRoot', () => {
        wsConfig.metaRoot = '/assets/';
        wsConfig.resourceRoot = './';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
            },
        };
        const correctResult = '/assets/bar.js';

        expect(getResourceUrl('/assets/bar.js')).toStrictEqual(correctResult);
        expect(getResourceUrl('/bar.js')).toStrictEqual(correctResult);
        expect(getResourceUrl('bar.js')).toStrictEqual(correctResult);
    });

    test('should add module version to irregular module folder', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
                path: '/irregular/path/bar',
            },
        };

        expect(getResourceUrl('/irregular/path/bar/baz.js')).toStrictEqual(
            '/irregular/path/bar/baz.js?x_module=a.b.c'
        );
    });

    test('should add module version from application version', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.buildnumber = 'a.b.c';
        contents.modules = {
            foo: {},
        };

        expect(getResourceUrl('/assets/foo/bar.js')).toStrictEqual(
            '/assets/foo/bar.js?x_module=a.b.c'
        );
    });

    test('should add context version to the URL', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
                contextVersion: 'e.f',
            },
        };

        expect(getResourceUrl('/assets/foo/bar.js')).toStrictEqual(
            '/assets/foo/bar.js?x_module=a.b.c&x_version=e.f'
        );
    });

    test('should not add context version to the URL if it is already there', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
                contextVersion: 'e.f',
            },
        };

        expect(getResourceUrl('/assets/foo/bar.js?x_module=a.b.c&x_version=e.f')).toStrictEqual(
            '/assets/foo/bar.js?x_module=a.b.c&x_version=e.f'
        );
    });

    test('should add module version to the URL if resourceRoot is included twice', () => {
        wsConfig.resourceRoot = '/assets/';
        contents.modules = {
            foo: {
                buildnumber: 'a.b.c',
            },
        };

        expect(getResourceUrl('/assets/foo/assets/bar.js')).toStrictEqual(
            '/assets/foo/assets/bar.js?x_module=a.b.c'
        );
    });

    test('should deal with not a string', () => {
        expect(getResourceUrl(undefined)).toBeUndefined();
    });

    test('should deal with not a string if domain name specified', () => {
        wsConfig.staticDomains = { domains: ['foo.bar'] };

        expect(getResourceUrl(undefined)).toBeUndefined();
    });

    test('should add product name to the URL with file from resource root', () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.product = 'foo';

        expect(getResourceUrl('/assets/index.js')).toStrictEqual('/assets/index.js?x_app=foo');
    });

    test('should add product name to the URL and preserve order in case there is already a x_module in headers', () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.product = 'foo';

        expect(getResourceUrl('/assets/index.js?x_module=test')).toStrictEqual(
            '/assets/index.js?x_module=test&x_app=foo'
        );
    });

    test('should not add product name to the URL if it is already there', () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.product = 'foo';

        expect(getResourceUrl('/assets/index.js?x_module=test&x_app=foo')).toStrictEqual(
            '/assets/index.js?x_module=test&x_app=foo'
        );
    });

    test("shouldn't add product name to the module URL", () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.product = 'foo';
        contents.modules = {
            bar: {},
        };

        expect(getResourceUrl('/assets/bar/index.js')).toStrictEqual('/assets/bar/index.js');
    });

    test("shouldn't add product name to the irregular URL", () => {
        wsConfig.resourceRoot = '/assets/';
        wsConfig.product = 'foo';

        expect(getResourceUrl('/some/module.js')).toStrictEqual('/some/module.js');
    });

    test("shouldn't add version if there is no build number", () => {
        wsConfig.resourceRoot = '/assets/';

        expect(getResourceUrl('/assets/foo/bar.js')).toStrictEqual('/assets/foo/bar.js');
    });
});
