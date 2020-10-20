import { assert } from 'chai';
// @ts-ignore
import { patchContext, handlers } from 'RequireJsLoader/config';
import { global } from 'RequireJsLoader/_extras/utils';
import { IRequireExt } from '../RequireJsLoader/require.ext';

describe('RequireJsLoader/config', () => {
    const originalContents = global.contents;
    const originalWsConfig = global.wsConfig;
    const {getModulesPrefixes} = handlers;

    beforeEach(() => {
        global.contents = {};
        global.wsConfig = Object.assign({}, originalWsConfig);
        getModulesPrefixes.invalidate();
    });

    afterEach(() => {
        global.contents = originalContents;
        global.wsConfig = originalWsConfig;
    });

    context('when affects requirejs()\'s behaviour', () => {
        it('shouldn\'t throw ReferenceError for file in resources folder', () => {
            global.wsConfig.resourceRoot = '/assets/';
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
            global.wsConfig.resourceRoot = '/assets/';
            assert.isFalse(requirejs.defined('path/to/resource'));
        });
    });

    context('patchContext()', () => {
        const defContext = (requirejs as IRequireExt).s.contexts._;
        let restoreContext;

        beforeEach(() => {
            restoreContext = patchContext(defContext, {});
        });

        afterEach(() => {
            if (restoreContext) {
                restoreContext();
            }
        });

        context('when affects context.nameToUrl()\'s behaviour', () => {
            it('shouldn\'t add .js extension if url already ends with .wml or .tmpl', () => {
                assert.isTrue(defContext.nameToUrl('foo/bar.wml').endsWith('/foo/bar.wml'));
                assert.isTrue(defContext.nameToUrl('foo/bar.tmpl').endsWith('/foo/bar.tmpl'));
            });
        });
    });

    context('handlers', () => {
        const {checkModule} = handlers;

        context('checkModule()', () => {
            it('shouldn\'t add local service name to "loadedServices" in "contents"', () => {
                checkModule('/foo/bar.js');
                assert.isUndefined(global.contents.loadedServices);
            });

            it('should add external service name to "loadedServices" in "contents" using relative URL', () => {
                global.contents.modules = {
                    foo: {
                        path: '/foo-service-path/',
                        service: 'foo-service'
                    }
                };
                checkModule('/foo-service-path/bar.js');
                assert.isTrue(global.contents.loadedServices['foo-service']);
            });

            it('should add external service name to "loadedServices" in "contents" using URL with domain', () => {
                global.contents.modules = {
                    foo: {
                        path: '/foo-service-path/',
                        service: 'foo-service'
                    }
                };
                checkModule('//foo.domain/foo-service-path/bar.js');
                assert.isTrue(global.contents.loadedServices['foo-service']);
            });
        });
    });
});
