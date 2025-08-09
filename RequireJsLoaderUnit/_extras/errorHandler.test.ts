import errorHandler from 'RequireJsLoader/_extras/errorHandler';
import { getInstance } from 'RequireJsLoader/_extras/utils';

describe('RequireJsLoader/_extras/errorHandler', () => {
    const logger = {
        log() {
            /* noop */
        },
    };
    const requirejs = getInstance();

    describe('when undefine failed modules and some far ancestor module is not defined', () => {
        let undo: ReturnType<typeof errorHandler>;

        beforeEach(() => {
            undo = errorHandler(requirejs, {
                logger,
                undefineFailedModules: true,
                showAlertOnError: false,
            });

            define('Foo/bar1', ['Foo/bar2'], (bar2: unknown) => {
                return '[bar1]' + bar2;
            });

            define('Foo/bar2', ['Foo/bar3'], (bar3: unknown) => {
                return '[bar2]' + bar3;
            });
        });

        afterEach(() => {
            undo();
        });

        it('should call error handler on first require call', (done) => {
            require(['Foo/bar1'], () => {
                done(new Error("Shouldn't get here"));
            }, (err: unknown) => {
                expect(err).toBeInstanceOf(Error);

                done();
            });
        });

        it('should call error handler on second require call', (done) => {
            require(['Foo/bar1'], () => {
                done(new Error("Shouldn't get here"));
            }, (err: unknown) => {
                expect(err).toBeInstanceOf(Error);

                done();
            });
        });

        it('should throw an exception on first require call', () => {
            expect.assertions(1);

            try {
                require('Foo/bar1');
            } catch (err) {
                expect(err).toBeInstanceOf(Error);
            }
        });

        it('should throw an exception on second require call', () => {
            expect.assertions(1);

            try {
                require('Foo/bar1');
            } catch (err) {
                expect(err).toBeInstanceOf(Error);
            }
        });
    });
});
