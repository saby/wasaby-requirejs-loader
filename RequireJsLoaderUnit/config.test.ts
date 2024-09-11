import { patchContext, handlers, IHandlers, getDebugModules } from 'RequireJsLoader/config';
import { IContents, IWsConfig, IPatchedGlobal } from 'RequireJsLoader/wasaby';
import { IRequireExt } from 'RequireJsLoader/require.ext';

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
            wsConfig.resourceRoot = '/assets/';

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

    describe('patchContext()', () => {
        const defContext = (requirejs as IRequireExt).s.contexts._;
        let restoreContext: ReturnType<typeof patchContext>;

        beforeEach(() => {
            restoreContext = patchContext(defContext, {} as IHandlers);
        });

        afterEach(() => {
            if (restoreContext) {
                restoreContext();
            }
        });

        describe("when affects context.nameToUrl()'s behaviour", () => {
            test('should use updated implementation of handlers.getWithUserDefined()', () => {
                handlers.getWithUserDefined = (url: string): string => url + '#foo';

                expect(defContext.nameToUrl('/bar.js')).toStrictEqual('/bar.js#foo');
            });

            test("shouldn't add .js extension if url already ends with .wml or .tmpl", () => {
                expect(defContext.nameToUrl('foo/bar.wml').endsWith('/foo/bar.wml')).toBeTruthy();
                expect(defContext.nameToUrl('foo/bar.tmpl').endsWith('/foo/bar.tmpl')).toBeTruthy();
            });
        });
    });

    describe('handlers', () => {
        const { checkModule, getModuleNameFromUrl, getWithUserDefined } = handlers;

        let localWsConfigCopy: IWsConfig;

        beforeEach(() => {
            localWsConfigCopy = { ...handlers.config };
        });

        afterEach(() => {
            Object.assign(handlers.config, localWsConfigCopy);
        });

        describe('getModulesPrefixes()', () => {
            test('should return resources root by default', () => {
                const result = getModulesPrefixes();

                expect(result).toEqual([['', '']]);
            });

            test('should return updated resources root after its change from empty string to meaningful value', () => {
                const localWsConfig = handlers.config;
                localWsConfig.resourceRoot = '';

                getModulesPrefixes();

                localWsConfig.resourceRoot = 'assets/';
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
                const localWsConfig = handlers.config;
                localWsConfig.resourceRoot = '/assets/';

                const name = getModuleNameFromUrl('/assets/Foo/bar.js');

                expect(name).toStrictEqual('Foo');
            });

            test('should return module name for URL with domain', () => {
                const localWsConfig = handlers.config;
                localWsConfig.resourceRoot = '/assets/';

                const name = getModuleNameFromUrl('//domain.name/assets/Foo/bar.js');

                expect(name).toStrictEqual('Foo');
            });

            test('should return module name for URL with server path ending with slash', () => {
                const localWsConfig = handlers.config;

                localWsConfig.IS_SERVER_SCRIPT = true;
                localWsConfig.APP_PATH = '/path/to/';
                localWsConfig.resourceRoot = 'assets/';

                expect(getModuleNameFromUrl('/path/to/assets/Foo/bar.js')).toStrictEqual('Foo');
            });

            test("should return module name for URL with server path doesn't ending with slash", () => {
                const localWsConfig = handlers.config;

                localWsConfig.IS_SERVER_SCRIPT = true;
                localWsConfig.APP_PATH = '/path/to';
                localWsConfig.resourceRoot = '/assets/';

                expect(getModuleNameFromUrl('/path/to/assets/Foo/bar.js')).toStrictEqual('Foo');
            });
        });

        describe('getWithUserDefined()', () => {
            test('should return given value back by default', () => {
                expect(getWithUserDefined('/foo/bar.js')).toStrictEqual('/foo/bar.js');
            });
        });
    });

    describe('get debug modules', () => {
        test('should return full WS.Core namespace list', () => {
            const result = getDebugModules('WS.Core');

            expect(result.sort()).toEqual(
                [
                    'WS.Core',
                    'Core',
                    'Lib',
                    'Ext',
                    'Helpers',
                    'Transport',
                    'React',
                    'react',
                    'Superbundles',
                ].sort()
            );
        });

        test('should return required list of modules', () => {
            const result = getDebugModules('RequireJsLoader');

            expect(result.sort()).toEqual(
                ['RequireJsLoader', 'React', 'react', 'Superbundles'].sort()
            );
        });

        test('should return an empty array for empty cookie', () => {
            const result = getDebugModules('');

            expect(result).toEqual([]);
        });

        test('should return an empty array for s3debug false', () => {
            const result = getDebugModules('false');

            expect(result).toEqual([]);
        });
    });
});
