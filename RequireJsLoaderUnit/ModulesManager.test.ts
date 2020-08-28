import {assert} from 'chai';
import ModulesManager from 'RequireJsLoader/ModulesManager';
import fakeRequire, {clear, define as fakeDefine, getImplementation} from './mocks/requirejs';

describe('RequireJsLoader/ModulesManager', () => {
    beforeEach(() => {
        clear();
    });

    describe('.load()', () => {
        it('should return empty array', () => {
            const manager = new ModulesManager(fakeRequire);
            return manager.load([]).then((loadedModules) => {
                assert.deepEqual(loadedModules, []);
            });
        });

        it('should return modules implementation', () => {
            const foo = {};
            const bar = {};
            fakeDefine('foo', [], foo);
            fakeDefine('bar', [], bar);

            const manager = new ModulesManager(fakeRequire);
            return manager.load(['foo', 'bar']).then((loadedModules) => {
                assert.deepEqual(loadedModules, [foo, bar]);
            });
        });
    });

    describe('.unload()', () => {
        it('should clear module implementation', () => {
            const foo = {};
            const bar = {};
            fakeDefine('foo', [], foo);
            fakeDefine('bar', [], bar);

            const manager = new ModulesManager(fakeRequire);
            return manager.unload(['foo']).then(() => {
                assert.isUndefined(getImplementation('foo'));
                assert.strictEqual(getImplementation('bar'), bar);
            });
        });

        it('should clear depending modules implementations', () => {
            const foo = {};
            const bar = {};
            const baz = {};
            fakeDefine('foo', [], foo);
            fakeDefine('bar', ['foo'], bar);
            fakeDefine('baz', ['foo', 'bar'], baz);

            const manager = new ModulesManager(fakeRequire);
            return manager.unload(['foo']).then(() => {
                assert.isUndefined(getImplementation('foo'));
                assert.isUndefined(getImplementation('bar'));
                assert.isUndefined(getImplementation('baz'));
            });
        });
    });

    describe('.onModuleLoaded()', () => {
        it('should call function with requested module implementation', () => {
            const foo = {};
            fakeDefine('foo', [], foo);

            const loaded: Record<string, unknown> = {};
            const handler = (name: string, module: unknown) => {
                loaded[name] = module;
            };

            const manager = new ModulesManager(fakeRequire);
            manager.onModuleLoaded(handler);

            return manager.load(['foo']).then(() => {
                assert.strictEqual(loaded.foo, foo);
            });
        });

        it('should call function with depend module implementation', () => {
            const foo = {};
            const bar = {};
            fakeDefine('foo', [], foo);
            fakeDefine('bar', ['foo'], bar);

            const loaded: Record<string, unknown> = {};
            const handler = (name: string, module: unknown) => {
                loaded[name] = module;
            };

            const manager = new ModulesManager(fakeRequire);
            manager.onModuleLoaded(handler);

            return manager.load(['bar']).then(() => {
                assert.strictEqual(loaded.foo, foo);
            });
        });
    });

    describe('.offModuleLoaded()', () => {
        it('should do not call handler on next module load', () => {
            const foo = {};
            fakeDefine('foo', [], foo);

            const loaded: Record<string, unknown> = {};
            const handler = (name: string, module: unknown) => {
                loaded[name] = module;
            };

            const manager = new ModulesManager(fakeRequire);
            manager.onModuleLoaded(handler);
            manager.offModuleLoaded(handler);

            return manager.load(['foo']).then(() => {
                assert.isUndefined(loaded.foo);
            });
        });

        it('should do nothing with unknown handler', () => {
            const handler = () => {
                // Do nothing
            };
            const manager = new ModulesManager(fakeRequire);
            manager.offModuleLoaded(handler);
        });
    });
});
