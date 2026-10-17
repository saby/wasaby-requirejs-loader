import resourceLoadHandler from 'RequireJsLoader/_extras/resourceLoadHandler';
import { getInstance } from 'RequireJsLoader/_extras/utils';

interface ITestClass extends Function {
    toJSON(): object;
}

describe('RequireJsLoader/_extras/resourceLoadHandler', () => {
    const requirejs = getInstance();

    let undo: ReturnType<typeof resourceLoadHandler>;

    beforeEach(() => {
        undo = resourceLoadHandler(requirejs, true);
    });

    afterEach(() => {
        requirejs.undef('Foo/Bar');
        requirejs.undef('Foo/BarA');
        requirejs.undef('Foo/BarB');
        requirejs.undef('Foo/_Bar');

        undo();
    });

    it('should serialize class with toJSON() use _moduleName on prototype', (done) => {
        define('Foo/Bar', () => {
            const Bar = function () {
                /* noop */
            };

            Bar.prototype._moduleName = 'Foo/Bar';

            return Bar;
        });

        require(['Foo/Bar'], (Bar: ITestClass) => {
            const state = Bar.toJSON();

            expect(state).toEqual({
                $serialized$: 'func',
                module: 'Foo/Bar',
                path: undefined,
            });

            done();
        }, done);
    });

    it('should add toJSON() method to the static method', (done) => {
        define('Foo/BarA', () => {
            const Bar = function () {
                /* noop */
            };

            Bar.prototype._moduleName = 'Foo/BarA';
            Bar.propA = function () {
                /* noop */
            };

            return Bar;
        });

        require(['Foo/BarA'], (Bar: { propA: ITestClass }) => {
            const state = Bar.propA.toJSON();

            expect(state).toEqual({
                $serialized$: 'func',
                module: 'Foo/BarA',
                path: 'propA',
            });

            done();
        }, done);
    });

    // it("shouldn't read property with accessor descriptor", (done) => {
    //     let error: Error;
    //
    //     define('Foo/BarB', () => {
    //         const Bar = function () {
    //             /* noop */
    //         };
    //
    //         Bar.prototype._moduleName = 'Foo/BarB';
    //         Object.defineProperty(Bar, 'propA', {
    //             enumerable: true,
    //             get: () => {
    //                 error = new Error("Accessor descriptor getter shouldn't being called");
    //
    //                 return error;
    //             },
    //         });
    //
    //         return Bar;
    //     });
    //
    //     require(['Foo/BarB'], () => {
    //         done(error);
    //     }, done);
    // });

    it('should serialize class as library member with toJSON() use last defined _moduleName on prototype', (done) => {
        define('Foo/_Bar', () => {
            const Bar = function () {
                /* noop */
            };

            Bar.prototype._moduleName = 'Foo/_Bar';

            return Bar;
        });

        require(['Foo/_Bar'], (Bar: ITestClass) => {
            Bar.prototype._moduleName = 'Foo:Bar';

            const state = Bar.toJSON();

            expect(state).toEqual({
                $serialized$: 'func',
                module: 'Foo',
                path: 'Bar',
            });

            done();
        }, done);
    });
});
