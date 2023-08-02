import { assert } from 'chai';
import { patchContext, handlers, IHandlers } from 'RequireJsLoader/config';
import { IContents, IWsConfig } from 'RequireJsLoader/wasaby';
import { IRequireExt } from 'RequireJsLoader/require.ext';

const originalContents = globalThis.contents;
const originalWsConfig = globalThis.wsConfig;
const { getModulesPrefixes } = handlers;

describe('RequireJsLoader/config', () => {
    let wsConfig: IWsConfig;
    let contents: IContents;
    let handlersCopy: IHandlers;

    beforeEach(() => {
        contents = globalThis.contents = {};
        wsConfig = globalThis.wsConfig = Object.assign({}, originalWsConfig);
        handlersCopy = {...handlers};

        getModulesPrefixes.invalidate();
    });

    afterEach(() => {
        globalThis.contents = originalContents;
        globalThis.wsConfig = originalWsConfig;
        Object.assign(handlers, handlersCopy);
    });

    context('when affects requirejs()\'s behaviour', () => {
        it('shouldn\'t throw ReferenceError for file in resources folder', () => {
            wsConfig.resourceRoot = '/assets/';
            return new Promise((resolve) => {
                requirejs(['/assets/contents.js'], resolve, (err) => {
                    assert.notInstanceOf(err, ReferenceError);
                    resolve();
                });
            });
        });
    });

    context('when affects require.defined()\'s behaviour', () => {
        it('shouldn\'t throw ReferenceError if module doesn\'t exist', () => {
            wsConfig.resourceRoot = '/assets/';
            assert.isFalse(requirejs.defined('path/to/resource'));
        });
    });

    context('patchContext()', () => {
        const defContext = (requirejs as IRequireExt).s.contexts._;
        let restoreContext;

        beforeEach(() => {
            restoreContext = patchContext(defContext, {} as IHandlers);
        });

        afterEach(() => {
            if (restoreContext) {
                restoreContext();
            }
        });

        context('when affects context.nameToUrl()\'s behaviour', () => {
            it('should use updated implementation of handlers.getWithUserDefined()', () => {
                handlers.getWithUserDefined = (url: string): string => url + '#foo';
                assert.equal(defContext.nameToUrl('/bar.js'), '/bar.js#foo');
            });

            it('shouldn\'t add .js extension if url already ends with .wml or .tmpl', () => {
                assert.isTrue(defContext.nameToUrl('foo/bar.wml').endsWith('/foo/bar.wml'));
                assert.isTrue(defContext.nameToUrl('foo/bar.tmpl').endsWith('/foo/bar.tmpl'));
            });
        });
    });

    context('handlers', () => {
        const {checkModule, getModuleNameFromUrl, getWithUserDefined} = handlers;

        let localWsConfigCopy: RequireJsLoader.IWsConfig;

        beforeEach(() => {
            localWsConfigCopy = {...handlers.config};
        });

        afterEach(() => {
            Object.assign(handlers.config, localWsConfigCopy);
        });

        context('getModulesPrefixes()', () => {
            it('should return resources root by default', () => {
                const result = getModulesPrefixes();
                assert.deepEqual(result, [['', './']]);
            });

            it('should return updated resources root after its change from empty string to meaningful value', () => {
                const localWsConfig = handlers.config;
                localWsConfig.resourceRoot = '';
                getModulesPrefixes();
                localWsConfig.resourceRoot = 'assets/';
                const result = getModulesPrefixes();

                assert.deepEqual(result, [['', 'assets/']]);
            });
        });

        context('checkModule()', () => {
            it('shouldn\'t add local service name to "loadedServices" in "contents"', () => {
                checkModule('/foo/bar.js');
                assert.isUndefined(contents.loadedServices);
            });

            it('should add external service name to "loadedServices" in "contents" using relative URL', () => {
                contents.modules = {
                    foo: {
                        path: '/foo-service-path/',
                        service: 'foo-service'
                    }
                };
                checkModule('/foo-service-path/bar.js');
                assert.isTrue(contents.loadedServices['foo-service']);
            });

            it('should add external service name to "loadedServices" in "contents" using URL with domain', () => {
                contents.modules = {
                    foo: {
                        path: '/foo-service-path/',
                        service: 'foo-service'
                    }
                };
                checkModule('//foo.domain/foo-service-path/bar.js');
                assert.isTrue(contents.loadedServices['foo-service']);
            });
        });

        context('getModuleNameFromUrl()', () => {
            it('should return undefined for empty URL', () => {
                assert.isUndefined(getModuleNameFromUrl(''));
            });

            it('should return undefined for service module URL', () => {
                assert.isUndefined(getModuleNameFromUrl('_@r123'));
            });

            it('should return module name for absolute URL', () => {
                const localWsConfig = handlers.config;
                localWsConfig.resourceRoot = '/assets/';

                const name = getModuleNameFromUrl('/assets/Foo/bar.js');
                assert.equal(name, 'Foo');
            });

            it('should return module name for URL with domain', () => {
                const localWsConfig = handlers.config;
                localWsConfig.resourceRoot = '/assets/';

                const name = getModuleNameFromUrl('//domain.name/assets/Foo/bar.js');
                assert.equal(name, 'Foo');
            });

            it('should return module name for URL with server path ending with slash', () => {
                const localWsConfig = handlers.config;
                localWsConfig.IS_SERVER_SCRIPT = true;
                localWsConfig.APP_PATH = '/path/to/';
                localWsConfig.resourceRoot = 'assets/';

                assert.equal(getModuleNameFromUrl('/path/to/assets/Foo/bar.js'), 'Foo');
            });

            it('should return module name for URL with server path doesn\'t ending with slash', () => {
                const localWsConfig = handlers.config;
                localWsConfig.IS_SERVER_SCRIPT = true;
                localWsConfig.APP_PATH = '/path/to';
                localWsConfig.resourceRoot = '/assets/';

                localWsConfig.APP_PATH = '/path/to';
                localWsConfig.resourceRoot = '/assets/';
                assert.equal(getModuleNameFromUrl('/path/to/assets/Foo/bar.js'), 'Foo');
            });
        });

        context('getWithUserDefined()', () => {
            it('should return given value back by default', () => {
                assert.deepEqual(getWithUserDefined('/foo/bar.js'), '/foo/bar.js');
            });
        });
    });
});
