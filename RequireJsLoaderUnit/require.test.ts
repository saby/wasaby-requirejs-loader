import { createConfig } from 'RequireJsLoader/config';
import { IRequireExt } from 'RequireJsLoader/require.ext';

const localDefine = define;
const defaultContext = (requirejs as IRequireExt).s.contexts._;
const appPath = defaultContext.config.baseUrl;
const config = createConfig(appPath || '/');
config.context = 'RequireJsLoaderUnit/require';
const contextRequire = requirejs.config(config);

function asyncRequire<T extends unknown[]>(names: string[], loader: Require = require): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        loader(
            names,
            (...results: T) => {
                resolve(results);
            },
            reject
        );
    });
}

describe('require()', () => {
    afterEach(() => {
        requirejs.undef('RequireJsLoaderUnit/require/foo');
        requirejs.undef('json!RequireJsLoaderUnit/fixtures/ModuleA');
        requirejs.undef('RequireJsLoaderUnit/fixtures/ModuleA');
    });

    test('should return defined module body', () => {
        localDefine('RequireJsLoaderUnit/require/foo', () => 'RequireJsLoaderUnit/require/foo.js');

        return asyncRequire(['RequireJsLoaderUnit/require/foo']).then(([result]) => {
            expect(result).toStrictEqual('RequireJsLoaderUnit/require/foo.js');
        });
    });

    describe('using json! plugin', () => {
        test('should return defined module body', () => {
            return asyncRequire(['json!RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then(
                ([result]) => {
                    expect(result).toEqual(['RequireJsLoaderUnit/fixtures/ModuleA.json']);
                }
            );
        });

        test('should return module without plugin if module with plugin has been required before', () => {
            return asyncRequire(['json!RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire)
                .then(([pluginResult]) => {
                    expect(pluginResult).toEqual(['RequireJsLoaderUnit/fixtures/ModuleA.json']);
                })
                .then(() => {
                    return asyncRequire(
                        ['RequireJsLoaderUnit/fixtures/ModuleA'],
                        contextRequire
                    ).then(([noPluginResult]) => {
                        expect(noPluginResult).toStrictEqual(
                            'RequireJsLoaderUnit/fixtures/ModuleA.js'
                        );
                    });
                });
        });
    });
});
