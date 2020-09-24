import {assert} from 'chai';
// @ts-ignore
import {patchContext, handlers} from 'RequireJsLoader/config';
import { IRequireExt } from '../RequireJsLoader/require.ext';

const global = this || (0, eval)('this');// eslint-disable-line no-eval

describe('RequireJsLoader/config', () => {
    const contents = global.contents;
    const wsConfig = global.wsConfig;

    beforeEach(() => {
        global.contents = {};
        global.wsConfig = Object.assign({}, global.wsConfig);
    });

    afterEach(() => {
        global.contents = contents;
        global.wsConfig = wsConfig;
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
});
