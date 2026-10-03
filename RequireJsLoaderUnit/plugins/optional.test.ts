import optional = require('RequireJsLoader/plugins/optional');
import { IXhrRequireError, IPluginLoadFunction } from 'RequireJsLoader/requireTypes';
import { IPatchedGlobal } from 'RequireJsLoader/wasaby';

describe('RequireJsLoader/plugins/optional', () => {
    const originalBuildMode = (globalThis as unknown as IPatchedGlobal).contents?.buildMode;
    const contents = (globalThis as unknown as IPatchedGlobal).contents;

    beforeEach(() => {
        if (contents) {
            contents.buildMode = 'debug';
        }
    });

    afterEach(() => {
        if (contents) {
            contents.buildMode = originalBuildMode;
        }
    });

    describe('.load()', () => {
        test('should call callback on success', () => {
            const require = (names: string[], success: Function): void => {
                success('ok:' + names.join(','));
            };
            let result: unknown;
            const handler = (res: unknown) => (result = res);

            optional.load('foo', require as Require, handler as IPluginLoadFunction);

            expect(result).toStrictEqual('ok:foo');
        });

        test('should call .error() on fail', () => {
            const require = (names: string[], _success: Function, fail: Function) => {
                fail(new Error('fail:' + names.join(',')));
            };
            let error: unknown;
            const handler = {
                error: (err: unknown) => (error = err),
            };
            optional.load('foo', require as Require, handler as IPluginLoadFunction);

            expect(error).toBeInstanceOf(Error);
        });

        test('should pass null to callback on RequireJS script error', () => {
            const require = (_names: string[], _success: Function, fail: Function) => {
                const err = new Error('Not Found') as RequireError;
                err.requireType = 'scripterror';
                fail(err);
            };

            let result: unknown;
            const handler = (res: unknown) => (result = res);

            optional.load('foo', require as Require, handler as IPluginLoadFunction);

            expect(result).toBeNull();
        });

        test('should pass null to callback on RequireJS define error under NodeJS', () => {
            const require = (_names: string[], _success: Function, fail: Function) => {
                const err = new Error(
                    'Not found while tried node\'s require("/foo.js")'
                ) as RequireError;
                err.requireType = 'define';
                fail(err);
            };

            let result: unknown;
            const handler = (res: unknown) => (result = res);

            optional.load('foo', require as Require, handler as IPluginLoadFunction);

            expect(result).toBeNull();
        });

        test('should pass null to callback on XMLHttpRequest 404 error', () => {
            const require = (_names: string[], _success: Function, fail: Function) => {
                const err = new Error('Not found') as IXhrRequireError;
                err.xhr = {
                    status: 404,
                } as XMLHttpRequest;
                fail(err);
            };

            let result: unknown;
            const handler = (res: unknown) => (result = res);

            optional.load('foo', require as Require, handler as IPluginLoadFunction);

            expect(result).toBeNull();
        });

        test('should return module synchronously if it is loaded already', () => {
            const foo = { bar: 'baz' };
            const require = (name: string) => {
                if (name === 'foo') {
                    return foo;
                }
                throw new Error('Not found');
            };
            require.defined = (name: string) => name === 'foo';

            let result: unknown;
            const handler = (res: unknown) => (result = res);

            optional.load('foo', require as Require, handler as IPluginLoadFunction);

            expect(result).toStrictEqual(foo);
        });
    });
});
