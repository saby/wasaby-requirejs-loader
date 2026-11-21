import { handlers, IHandlers } from 'RequireJsLoader/config';
import { IContents, IWsConfig, IPatchedGlobal } from 'RequireJsLoader/wasaby';

const originalContents = (globalThis as unknown as IPatchedGlobal).contents;
const originalWsConfig = (globalThis as unknown as IPatchedGlobal).wsConfig;
const { getModulesPrefixes } = handlers;

describe('RequireJsLoader/config', () => {
    let wsConfig: IWsConfig;
    let contents: IContents;
    let handlersCopy: IHandlers;

    beforeEach(() => {
        contents = (globalThis as unknown as IPatchedGlobal).contents = {};
        wsConfig = (globalThis as unknown as IPatchedGlobal).wsConfig = {
            ...originalWsConfig,
        };
        handlersCopy = { ...handlers };

        getModulesPrefixes.invalidate();
    });

    afterEach(() => {
        (globalThis as unknown as IPatchedGlobal).contents = originalContents;
        (globalThis as unknown as IPatchedGlobal).wsConfig = originalWsConfig;
        Object.assign(handlers, handlersCopy);
    });

    describe("when affects requirejs()'s behaviour", () => {
        test("shouldn't throw ReferenceError for file in resources folder", () => {
            wsConfig.resourceRoot = '';

            return new Promise((resolve) => {
                requirejs(['/assets/contents.js'], resolve, (err: Error) => {
                    expect(err).not.toBeInstanceOf(ReferenceError);

                    resolve('Done');
                });
            });
        });
    });

    describe("when affects require.defined()'s behaviour", () => {
        test("shouldn't throw ReferenceError if module doesn't exist", () => {
            wsConfig.resourceRoot = '/assets/';

            expect(requirejs.defined('path/to/resource')).toBeFalsy();
        });
    });

    describe('handlers', () => {
        const { checkModule, getModuleNameFromUrl } = handlers;

        describe('getModulesPrefixes()', () => {
            test('should return resources root by default', () => {
                const result = getModulesPrefixes();

                expect(result).toEqual([['', '']]);
            });

            test('should return updated resources root after its change from empty string to meaningful value', () => {
                wsConfig.resourceRoot = '';

                getModulesPrefixes();

                wsConfig.resourceRoot = 'assets/';
                const result = getModulesPrefixes();

                expect(result).toEqual([['', 'assets/']]);
            });
        });

        describe('checkModule()', () => {
            test('shouldn\'t add local service name to "loadedServices" in "contents"', () => {
                checkModule('/foo/bar.js');

                expect(contents.loadedServices).toBeUndefined();
            });

            test('should add external service name to "loadedServices" in "contents" using relative URL', () => {
                contents.modules = {
                    foo: {
                        path: '/foo-service-path/',
                        service: 'foo-service',
                    },
                };

                checkModule('/foo-service-path/bar.js');

                expect(contents.loadedServices?.['foo-service']).toBeTruthy();
            });

            test('should add external service name to "loadedServices" in "contents" using URL with domain', () => {
                contents.modules = {
                    foo: {
                        path: '/foo-service-path/',
                        service: 'foo-service',
                    },
                };

                checkModule('//foo.domain/foo-service-path/bar.js');

                expect(contents.loadedServices?.['foo-service']).toBeTruthy();
            });
        });

        describe('getModuleNameFromUrl()', () => {
            test('should return undefined for empty URL', () => {
                expect(getModuleNameFromUrl('')).toBeUndefined();
            });

            test('should return undefined for service module URL', () => {
                expect(getModuleNameFromUrl('_@r123')).toBeUndefined();
            });

            test('should return module name for absolute URL', () => {
                wsConfig.resourceRoot = '/assets/';

                const name = getModuleNameFromUrl('/assets/Foo/bar.js');

                expect(name).toStrictEqual('Foo');
            });

            test('should return module name for URL with domain', () => {
                wsConfig.resourceRoot = '/assets/';

                const name = getModuleNameFromUrl('//domain.name/assets/Foo/bar.js');

                expect(name).toStrictEqual('Foo');
            });

            test('should return module name for URL with server path ending with slash', () => {
                wsConfig.IS_SERVER_SCRIPT = true;
                wsConfig.APP_PATH = '/path/to/';
                wsConfig.resourceRoot = 'assets/';

                expect(getModuleNameFromUrl('/path/to/assets/Foo/bar.js')).toStrictEqual('Foo');
            });

            test("should return module name for URL with server path doesn't ending with slash", () => {
                wsConfig.IS_SERVER_SCRIPT = true;
                wsConfig.APP_PATH = '/path/to';
                wsConfig.resourceRoot = '/assets/';

                expect(getModuleNameFromUrl('/path/to/assets/Foo/bar.js')).toStrictEqual('Foo');
            });
        });
    });
});
