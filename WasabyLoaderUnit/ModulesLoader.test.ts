import { assert } from 'chai';
import { stub } from 'sinon';
import * as ModulesLoader from 'WasabyLoader/ModulesLoader';
import { ModulesManager }  from 'RequireJsLoader/conduct';
import TestModuleSync = require('WasabyLoaderUnit/resources/TestModuleSync');

const getModuleUrl = ModulesLoader.getModuleUrl;
const loadAsync = ModulesLoader.loadAsync;
const loadSync = ModulesLoader.loadSync;

describe('WasabyLoader/ModulesLoader', () => {
    let stubIsModule;

    beforeEach(() => {
        stubIsModule = stub(ModulesManager, 'isModule');
        stubIsModule.returns(true);
    });

    afterEach(() => {
        stubIsModule.restore();
        stubIsModule = undefined;
    });

    describe('getModuleUrl()', () => {
        it('should return valid module URL', () => {
            assert.include(getModuleUrl('WasabyLoaderUnit/Foo/bar'), '/WasabyLoaderUnit/Foo/bar.js');
        });

        it('should return valid module URL with its own extension', () => {
            assert.include(getModuleUrl('WasabyLoaderUnit/Foo/bar.svg'), '/WasabyLoaderUnit/Foo/bar.svg');
            assert.include(getModuleUrl('WS.Core/res/js/revive-controls'), '/WS.Core/res/js/revive-controls.js');
            assert.include(getModuleUrl('Types/lang/ru/ru.json'), '/Types/lang/ru/ru.json.js');
        });

        it('should return valid library URL', () => {
            assert.include(getModuleUrl('WasabyLoaderUnit/Foo:bar'), '/WasabyLoaderUnit/Foo.js');
        });

        it('should return valid module URL with debug cookie', () => {
            assert.include(getModuleUrl('WasabyLoaderUnit/Foo/bar', 'true'), '/WasabyLoaderUnit/Foo/bar.js');
        });

        it('should return valid library URL with debug cookie', () => {
            assert.include(getModuleUrl('WasabyLoaderUnit/Foo:bar', 'true'), '/WasabyLoaderUnit/Foo.js');
        });
    });

    describe('loadAsync()', () => {
        it('should load module', () => {
            return loadAsync('WasabyLoaderUnit/resources/TestLibraryAsync').then((res) => {
                assert.notEqual(res, undefined, 'Module not loaded async');
            });
        });

        it('should return an error for empty module name', () => {
            return loadAsync('').then((res) => {
                assert.fail('Shouldnt get here');
            }).catch((err) => {
                assert.include(err.message, 'Module name must be string and not empty');
            });
        });

        it('should load library', () => {
            return loadAsync<Function>(
                'WasabyLoaderUnit/resources/TestModuleAsync:exportFunction'
            ).then((exportFunction) => {
                assert.notEqual(exportFunction, undefined, 'Module not loaded async');
                assert.equal(exportFunction('test'), 'test', 'Import from module is broken');
            });
        });

        /**
         * Проверяем что повторный вызов тоже работает корректно.
         */
        it('should load library twice', () => {
            return loadAsync<Function>(
                'WasabyLoaderUnit/resources/TestModuleAsync:exportFunction'
            ).then((exportFunction) => {
                assert.notEqual(exportFunction, undefined, 'Module not loaded async');
                assert.equal(exportFunction('test'), 'test', 'Import from module is broken');
            });
        });

        /**
         * Проверяем что загрузка модуля по другому пути в библиотеке загружает корректный модуль.
         */
        it('should load different modules from same library', () => {
            const one = loadAsync<Function>(
                'WasabyLoaderUnit/resources/TestModuleAsyncTwice:exportFunction'
            ).then((exportFunction) => {
                assert.notEqual(exportFunction, undefined, 'Module not loaded async');
                assert.equal(exportFunction('test'), 'test', 'Import from module is broken');
            });
            const two =  loadAsync<Function>(
                'WasabyLoaderUnit/resources/TestModuleAsyncTwice:exportFunctionTwice'
            ).then((exportFunction) => {
                assert.notEqual(exportFunction, undefined, 'Module not loaded async');
                assert.equal(exportFunction('test'), 'testtest', 'Import from module is broken');
            });

            return Promise.all([one, two]);
        });

        it('should throw an error of module does not exist', () => {
            return loadAsync('WasabyLoaderUnit/resources/TestModuleAsyncFail').catch((err) => {
                assert.include(err.message, typeof window === 'undefined' ? 'Cannot find module' : 'Script error for');
            });
        });

        it('should throw an error if a path within the library is not exists', () => {
            return loadAsync('WasabyLoaderUnit/resources/TestModuleAsync:NotFound').then((res) => {
                assert.notEqual(res, null, 'Старое поведение, когда возвращался модуль, если е найдено свойство из библиотеки');
            }, (err) => {
                assert.include(
                    err.message,
                    'Cannot find module "NotFound" in library "WasabyLoaderUnit/resources/TestModuleAsync"',
                    'Error message is wrong'
                );
            });
        });
    });

    describe('loadSync()', () => {
        it('should return previously loaded module', () => {
            const syncModule = loadSync('WasabyLoaderUnit/resources/TestModuleSync');
            assert.strictEqual(syncModule, TestModuleSync, 'Loaded module is wrong');
        });

        it('should return a module from previously loaded library', () => {
            const syncFunction = loadSync<Function>('WasabyLoaderUnit/resources/TestModuleSync:exportSyncFunction');
            assert.equal(syncFunction('test'), 'test', 'Import from module is broken');
        });

        it('should return throw an Error if module does not exist', () => {
            assert.throws(() => {
                loadSync('WasabyLoaderUnit/resources/TestModuleSyncFail');
            }, typeof window === 'undefined' ? 'Cannot find module' : 'has not been loaded yet');
        });

        it('should return undefined on second require of not exists module', () => {
            assert.throws(() => {
                loadSync('WasabyLoaderUnit/resources/TestModuleSyncFailTwice');
            }, typeof window === 'undefined' ? 'Cannot find module' : 'has not been loaded yet' );

            if (typeof window === 'undefined') {
                assert.isUndefined(loadSync('WasabyLoaderUnit/resources/TestModuleSyncFailTwice'));
            }
        });
    });
});
