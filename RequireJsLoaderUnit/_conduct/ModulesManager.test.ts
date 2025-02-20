import ModulesManager from 'RequireJsLoader/_conduct/ModulesManager';
import { ModuleLoadCallback } from 'RequireJsLoader/_conduct/IModulesHandler';
import { handlers } from 'RequireJsLoader/config';
import fakeRequire, {
    clear,
    define as fakeDefine,
    getImplementation,
    hasBeenUndefined,
} from '../mocks/requirejs';

describe('RequireJsLoader/_conduct/ModulesManager', () => {
    const originalGetWithUserDefined = handlers.getWithUserDefined;

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {
            /* noop */
        });
        clear();
    });

    afterEach(() => {
        handlers.getWithUserDefined = originalGetWithUserDefined;
    });

    describe('.constructor()', () => {
        test('should apply option urlModifier to handlers.getWithUserDefined implementation', () => {
            const urlModifier = (url: string) => url;
            const manager = new ModulesManager({ urlModifier });

            expect(manager).toBeInstanceOf(ModulesManager);
            expect(handlers.getWithUserDefined).toEqual(urlModifier);
        });
    });

    describe('.isLoaded()', () => {
        test('should return true if module is loaded', () => {
            const manager = new ModulesManager({ loader: requirejs });

            expect(manager.isLoaded('RequireJsLoader/_conduct/ModulesManager')).toBeTruthy();
        });

        test('should return false if module is not loaded', () => {
            const manager = new ModulesManager({ loader: requirejs });

            expect(manager.isLoaded('RequireJsLoader/_conduct/UnknownModulesManager')).toBeFalsy();
        });

        test('should return false for module with empty exports', () => {
            const foo = {};
            fakeDefine('foo', [], foo);

            const manager = new ModulesManager({ loader: fakeRequire });

            return manager.load(['foo']).then(() => {
                expect(manager.isLoaded('foo')).toBeFalsy();
            });
        });
    });

    describe('.load()', () => {
        test('should return empty array', () => {
            const manager = new ModulesManager({ loader: fakeRequire });

            return manager.load([]).then((loadedModules) => {
                expect(loadedModules).toEqual([]);
            });
        });

        test('should return modules implementation', () => {
            const foo = {};
            const bar = {};

            fakeDefine('foo', [], foo);
            fakeDefine('bar', [], bar);

            const manager = new ModulesManager({ loader: fakeRequire });

            return manager.load<[object, object]>(['foo', 'bar']).then(([theFoo, theBar]) => {
                expect(theFoo).toEqual(foo);
                expect(theBar).toEqual(bar);
            });
        });

        test('should undefine failed modules', () => {
            const manager = new ModulesManager({ loader: fakeRequire });
            return manager.load(['foo']).catch(() => {
                expect(hasBeenUndefined('foo')).toBeTruthy();
            });
        });
    });

    describe('.unload()', () => {
        test('should clear module implementation', () => {
            const foo = {};
            const bar = {};
            fakeDefine('foo', [], foo);
            fakeDefine('bar', [], bar);

            const manager = new ModulesManager({ loader: fakeRequire });
            return manager.unload(['foo']).then(() => {
                expect(getImplementation('foo')).toBeUndefined();
                expect(getImplementation('bar')).toStrictEqual(bar);
            });
        });

        test('should clear depending modules implementations', () => {
            const foo = {};
            const bar = {};
            const baz = {};

            fakeDefine('foo', [], foo);
            fakeDefine('bar', ['foo'], bar);
            fakeDefine('baz', ['foo', 'bar'], baz);

            const manager = new ModulesManager({ loader: fakeRequire });

            return manager.unload(['foo']).then(() => {
                expect(getImplementation('foo')).toBeUndefined();
                expect(getImplementation('bar')).toBeUndefined();
                expect(getImplementation('baz')).toBeUndefined();
            });
        });
    });

    describe('.onModuleLoaded()', () => {
        let manager: ModulesManager;
        let handler: ModuleLoadCallback;

        beforeEach(() => {
            manager = new ModulesManager({ loader: fakeRequire });
        });

        afterEach(() => {
            manager.offModuleLoaded(handler);
        });

        test('should call function with requested module implementation', () => {
            const foo = {};
            fakeDefine('foo', [], foo);

            const loaded: Record<string, unknown> = {};
            handler = (name: string, module: unknown) => {
                loaded[name] = module;
            };

            manager.onModuleLoaded(handler);

            return manager.load(['foo']).then(() => {
                expect(loaded.foo).toStrictEqual(foo);
            });
        });

        test('should call function with depend module implementation', () => {
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
                expect(loaded.foo).toStrictEqual(foo);
            });
        });

        test('should overwrite module implementation', () => {
            const foo = ['foo'];
            const bar = ['bar'];

            fakeDefine('foo', [], foo);

            handler = () => bar;
            manager.onModuleLoaded(handler);

            return manager.load(['foo']).then(() => {
                expect(getImplementation('foo')).toStrictEqual(bar);
            });
        });

        test("shouldn't overwrite module implementation when returns undefined", () => {
            const foo = ['foo'];
            fakeDefine('foo', [], foo);

            handler = () => undefined;
            manager.onModuleLoaded(handler);

            return manager.load(['foo']).then(() => {
                expect(getImplementation('foo')).toStrictEqual(foo);
            });
        });
    });

    describe('.offModuleLoaded()', () => {
        test('should do not call handler on next module load', () => {
            const foo = {};
            fakeDefine('foo', [], foo);

            const loaded: Record<string, unknown> = {};
            const handler = (name: string, module: unknown) => {
                loaded[name] = module;
            };

            const manager = new ModulesManager({ loader: fakeRequire });
            manager.onModuleLoaded(handler);
            manager.offModuleLoaded(handler);

            return manager.load(['foo']).then(() => {
                expect(loaded.foo).toBeUndefined();
            });
        });

        test('should do nothing with unknown handler', () => {
            const handler = () => {
                // Do nothing
            };
            const manager = new ModulesManager({ loader: fakeRequire });
            manager.offModuleLoaded(handler);
        });
    });

    describe('.loadSync()', () => {
        test('should return module', () => {
            const foo = {};
            fakeDefine('foo', [], foo);

            const manager = new ModulesManager({ loader: fakeRequire });

            expect(manager.loadSync('foo')).toStrictEqual(foo);
        });
    });

    describe('.unloadSync()', () => {
        test('should clear module implementation', () => {
            const foo = {};
            const bar = {};
            fakeDefine('foo', [], foo);
            fakeDefine('bar', [], bar);

            const manager = new ModulesManager({ loader: fakeRequire });
            manager.unloadSync('foo');

            expect(getImplementation('foo')).toBeUndefined();
            expect(getImplementation('bar')).toStrictEqual(bar);
        });

        test('should clear depending modules implementations', () => {
            const foo = {};
            const bar = {};
            const baz = {};

            fakeDefine('foo', [], foo);
            fakeDefine('bar', ['foo'], bar);
            fakeDefine('baz', ['foo', 'bar'], baz);

            const manager = new ModulesManager({ loader: fakeRequire });
            manager.unloadSync('foo');

            expect(getImplementation('foo')).toBeUndefined();
            expect(getImplementation('bar')).toBeUndefined();
            expect(getImplementation('baz')).toBeUndefined();
        });
    });
});
