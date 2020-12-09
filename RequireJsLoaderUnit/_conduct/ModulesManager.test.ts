import { assert } from 'chai';
import ModulesManager from 'RequireJsLoader/_conduct/ModulesManager';
import { ModuleLoadCallback } from 'RequireJsLoader/_conduct/IModulesHandler';
import { handlers } from 'RequireJsLoader/config';
import fakeRequire, { clear, define as fakeDefine, getImplementation, hasBeenUndefined } from '../mocks/requirejs';

describe('RequireJsLoader/_conduct/ModulesManager', () => {
    const originalGetWithUserDefined = handlers.getWithUserDefined;

    beforeEach(() => {
        clear();
    });

    afterEach(() => {
        handlers.getWithUserDefined = originalGetWithUserDefined;
    });

    describe('.constructor()', () => {
        it('should apply option urlModifier to handlers.getWithUserDefined implementation', () => {
            const urlModifier = (url: string) => url;
            const manager = new ModulesManager({urlModifier});
            assert.instanceOf(manager, ModulesManager);
            assert.equal(handlers.getWithUserDefined, urlModifier);
        });
    });

    describe('.isLoaded()', () => {
        it('should return true if module is loaded', () => {
            const manager = new ModulesManager({loader: requirejs});
            assert.isTrue(manager.isLoaded('RequireJsLoader/_conduct/ModulesManager'));
        });

        it('should return false if module is not loaded', () => {
            const manager = new ModulesManager({loader: requirejs});
            assert.isFalse(manager.isLoaded('RequireJsLoader/_conduct/UnknownModulesManager'));
        });

        it('should return false for module with empty exports', () => {
            const foo = {};
            fakeDefine('foo', [], foo);

            const manager = new ModulesManager({loader: fakeRequire});
            return manager.load(['foo']).then(() => {
                assert.isFalse(manager.isLoaded('foo'));
            });
        });
    });

    describe('.load()', () => {
        it('should return empty array', () => {
            const manager = new ModulesManager({loader: fakeRequire});
            return manager.load([]).then((loadedModules) => {
                assert.deepEqual(loadedModules, []);
            });
        });

        it('should return modules implementation', () => {
            const foo = {};
            const bar = {};
            fakeDefine('foo', [], foo);
            fakeDefine('bar', [], bar);

            const manager = new ModulesManager({loader: fakeRequire});
            return manager.load(['foo', 'bar']).then(([theFoo, theBar]) => {
                assert.equal(theFoo, foo);
                assert.equal(theBar, bar);
            });
        });

        it('should undefine failed modules', () => {
            const manager = new ModulesManager({loader: fakeRequire});
            return manager.load(['foo']).catch((err) => {
                assert.isTrue(hasBeenUndefined('foo'));
            });
        });
    });

    describe('.unload()', () => {
        it('should clear module implementation', () => {
            const foo = {};
            const bar = {};
            fakeDefine('foo', [], foo);
            fakeDefine('bar', [], bar);

            const manager = new ModulesManager({loader: fakeRequire});
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

            const manager = new ModulesManager({loader: fakeRequire});
            return manager.unload(['foo']).then(() => {
                assert.isUndefined(getImplementation('foo'));
                assert.isUndefined(getImplementation('bar'));
                assert.isUndefined(getImplementation('baz'));
            });
        });
    });

    describe('.onModuleLoaded()', () => {
        let manager: ModulesManager;
        let handler: ModuleLoadCallback<unknown>;

        beforeEach(() => {
            manager = new ModulesManager({loader: fakeRequire});
        });

        afterEach(() => {
            manager.offModuleLoaded(handler);
        });

        it('should call function with requested module implementation', () => {
            const foo = {};
            fakeDefine('foo', [], foo);

            const loaded: Record<string, unknown> = {};
            handler = (name: string, module: unknown) => {
                loaded[name] = module;
            };
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
            handler = (name: string, module: unknown) => {
                loaded[name] = module;
            };
            manager.onModuleLoaded(handler);

            return manager.load(['bar']).then(() => {
                assert.strictEqual(loaded.foo, foo);
            });
        });

        it('should overwrite module implementation', () => {
            const foo = ['foo'];
            const bar = ['bar'];

            fakeDefine('foo', [], foo);

            handler = () => bar;
            manager.onModuleLoaded(handler);

            return manager.load(['foo']).then(() => {
                assert.strictEqual(getImplementation('foo'), bar);
            });
        });

        it('shouldn\'t overwrite module implementation when returns undefined', () => {
            const foo = ['foo'];
            fakeDefine('foo', [], foo);

            handler = () => undefined;
            manager.onModuleLoaded(handler);

            return manager.load(['foo']).then(() => {
                assert.strictEqual(getImplementation('foo'), foo);
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

            const manager = new ModulesManager({loader: fakeRequire});
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
            const manager = new ModulesManager({loader: fakeRequire});
            manager.offModuleLoaded(handler);
        });
    });

    describe('.loadSync()', () => {
        it('should return module', () => {
            const foo = {};
            fakeDefine('foo', [], foo);

            const manager = new ModulesManager({loader: fakeRequire});
            assert.strictEqual(manager.loadSync('foo'), foo);
        });
    });

    describe('.unloadSync()', () => {
        it('should clear module implementation', () => {
            const foo = {};
            const bar = {};
            fakeDefine('foo', [], foo);
            fakeDefine('bar', [], bar);

            const manager = new ModulesManager({loader: fakeRequire});
            manager.unloadSync('foo');

            assert.isUndefined(getImplementation('foo'));
            assert.strictEqual(getImplementation('bar'), bar);
        });

        it('should clear depending modules implementations', () => {
            const foo = {};
            const bar = {};
            const baz = {};
            fakeDefine('foo', [], foo);
            fakeDefine('bar', ['foo'], bar);
            fakeDefine('baz', ['foo', 'bar'], baz);

            const manager = new ModulesManager({loader: fakeRequire});
            manager.unloadSync('foo');

            assert.isUndefined(getImplementation('foo'));
            assert.isUndefined(getImplementation('bar'));
            assert.isUndefined(getImplementation('baz'));
        });
    });
});
