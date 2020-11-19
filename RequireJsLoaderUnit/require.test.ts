import { assert } from 'chai';
import { createConfig } from 'RequireJsLoader/config';
import { IRequireExt } from '../RequireJsLoader/require.ext';

const localDefine = define;
const defaultContext = (requirejs as IRequireExt).s.contexts._;
const appPath = defaultContext.config.baseUrl;
const config = createConfig(appPath);
config.context = 'RequireJsLoaderUnit/require';
const contextRequire = requirejs.config(config);

function asyncRequire<T>(names: string[], loader: Require = require): Promise<T> {
    return new Promise((resolve, reject) => {
        loader(names, (...results) => {
            resolve(results as unknown as T);
        }, reject);
    });
}

describe('require()', () => {
    it('should return defined module body', () => {
        localDefine('RequireJsLoaderUnit/require/foo', () => 'RequireJsLoaderUnit/require/foo.js');

        after(() => {
            requirejs.undef('RequireJsLoaderUnit/require/foo');
        });

        return asyncRequire(['RequireJsLoaderUnit/require/foo']).then(([result]) => {
            assert.equal(result, 'RequireJsLoaderUnit/require/foo.js');
        });
    });

    describe('using json! plugin', () => {
        after(() => {
            requirejs.undef('json!RequireJsLoaderUnit/fixtures/ModuleA');
            requirejs.undef('RequireJsLoaderUnit/fixtures/ModuleA');
        });

        it('should return defined module body', () => {
            return asyncRequire(['json!RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then(([result]) => {
                assert.deepEqual(result, ['RequireJsLoaderUnit/fixtures/ModuleA.json']);
            });
        });

        it('should return module without plugin if module with plugin has been required before', () => {
            return asyncRequire(['json!RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then(
                ([pluginResult]) => {
                    assert.deepEqual(pluginResult, ['RequireJsLoaderUnit/fixtures/ModuleA.json']);
            }).then(() => {
                return asyncRequire(['RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then((
                    [noPluginResult]) => {
                        assert.equal(noPluginResult, 'RequireJsLoaderUnit/fixtures/ModuleA.js');
                    }
                );
            });
        });
    });
});
