import { assert } from 'chai';
import optional = require('RequireJsLoader/plugins/optional');
import { IXhrRequireError, IPluginLoadFunction } from 'RequireJsLoader/require.ext';

describe('RequireJsLoader/plugins/optional', () => {
    describe('.load()', () => {
        it('should call callback on success', () => {
            const require = (names, success) => {
                success('ok:' + names.join(','));
            };
            let result: unknown;
            const handler = (res: unknown) => result = res;

            optional.load('foo', require as Require, handler as IPluginLoadFunction);

            assert.equal(result, 'ok:foo');
        });

        it('should call .error() on fail', () => {
            const require = (names, success, fail) => {
                fail(new Error('fail:' + names.join(',')));
            };
            let error: unknown;
            const handler = {
                error: (err: unknown) => error = err
            };
            optional.load('foo', require as Require, handler as IPluginLoadFunction);

            assert.instanceOf(error, Error);
        });

        it('should pass null to callback on RequireJS script error', () => {
            const require = (names, success, fail) => {
                const err = new Error('Not Found') as RequireError;
                err.requireType = 'scripterror';
                fail(err);
            };

            let result: unknown;
            const handler = (res: unknown) => result = res;

            optional.load('foo', require as Require, handler as IPluginLoadFunction);
            assert.isNull(result);
        });

        it('should pass null to callback on RequireJS define error under NodeJS', () => {
            const require = (names, success, fail) => {
                const err = new Error('Not found while tried node\'s require("/foo.js")') as RequireError;
                err.requireType = 'define';
                fail(err);
            };

            let result: unknown;
            const handler = (res: unknown) => result = res;

            optional.load('foo', require as Require, handler as IPluginLoadFunction);
            assert.isNull(result);
        });

        it('should pass null to callback on XMLHttpRequest 404 error', () => {
            const require = (names, success, fail) => {
                const err = new Error('Not found') as IXhrRequireError;
                err.xhr = {
                    status: 404
                } as XMLHttpRequest;
                fail(err);
            };

            let result: unknown;
            const handler = (res: unknown) => result = res;

            optional.load('foo', require as Require, handler as IPluginLoadFunction);
            assert.isNull(result);
        });

        it('should return module synchronously if it is loaded already', () => {
            const foo = {bar: 'baz'};
            const require = (name) => {
                if (name === 'foo') {
                     return foo;
                }
                throw new Error('Not found');
            };
            require.defined = (name: string) => name === 'foo';

            let result: unknown;
            const handler = (res: unknown) => result = res;

            optional.load('foo', require as Require, handler as IPluginLoadFunction);
            assert.equal(result, foo);
        });
    });
});
