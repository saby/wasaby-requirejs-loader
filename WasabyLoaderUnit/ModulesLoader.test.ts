//@ts-ignore
import * as TestModuleSync from 'WasabyLoaderUnit/resources/TestModuleSync';
import { getModuleUrl, loadAsync, loadSync } from 'WasabyLoader/ModulesLoader';
import { ModulesManager } from 'RequireJsLoader/conduct';

describe('WasabyLoader/ModulesLoader', () => {
    beforeEach(() => {
        jest.spyOn(ModulesManager, 'isModule').mockReturnValue(true);
    });

    describe('getModuleUrl()', () => {
        test('should return valid module URL', () => {
            expect(getModuleUrl('WasabyLoaderUnit/Foo/bar')).toMatch(
                '/WasabyLoaderUnit/Foo/bar.js'
            );
        });

        test('should return valid module URL with its own extension', () => {
            expect(getModuleUrl('WasabyLoaderUnit/Foo/bar.svg')).toMatch(
                '/WasabyLoaderUnit/Foo/bar.svg'
            );
            expect(getModuleUrl('WS.Core/res/js/revive-controls')).toMatch(
                '/WS.Core/res/js/revive-controls.js'
            );
            expect(getModuleUrl('Types/lang/ru/ru.json')).toMatch('/Types/lang/ru/ru.json.js');
        });

        test('should return valid library URL', () => {
            expect(getModuleUrl('WasabyLoaderUnit/Foo:bar')).toMatch('/WasabyLoaderUnit/Foo.js');
        });

        test('should return valid module URL with debug cookie', () => {
            expect(getModuleUrl('WasabyLoaderUnit/Foo/bar', 'true')).toMatch(
                '/WasabyLoaderUnit/Foo/bar.js'
            );
        });

        test('should return valid library URL with debug cookie', () => {
            expect(getModuleUrl('WasabyLoaderUnit/Foo:bar', 'true')).toMatch(
                '/WasabyLoaderUnit/Foo.js'
            );
        });
    });

    describe('loadAsync()', () => {
        test('should load module', () => {
            return loadAsync('WasabyLoaderUnit/resources/TestLibraryAsync').then((res) => {
                expect(res).not.toBeUndefined();
            });
        });

        test('should return an error for empty module name', () => {
            expect.assertions(1);

            return loadAsync('').catch((err) => {
                expect(err.message).toMatch('Module name must be string and not empty');
            });
        });

        test('should load library', () => {
            return loadAsync<Function>(
                'WasabyLoaderUnit/resources/TestModuleAsync:exportFunction'
            ).then((exportFunction) => {
                expect(exportFunction).not.toBeUndefined();
                expect(exportFunction('test')).toStrictEqual('test');
            });
        });

        /**
         * Проверяем что повторный вызов тоже работает корректно.
         */
        test('should load library twice', () => {
            return loadAsync<Function>(
                'WasabyLoaderUnit/resources/TestModuleAsync:exportFunction'
            ).then((exportFunction) => {
                expect(exportFunction).not.toBeUndefined();
                expect(exportFunction('test')).toStrictEqual('test');
            });
        });

        /**
         * Проверяем что загрузка модуля по другому пути в библиотеке загружает корректный модуль.
         */
        test('should load different modules from same library', () => {
            const one = loadAsync<Function>(
                'WasabyLoaderUnit/resources/TestModuleAsyncTwice:exportFunction'
            ).then((exportFunction) => {
                expect(exportFunction).not.toBeUndefined();
                expect(exportFunction('test')).toStrictEqual('test');
            });
            const two = loadAsync<Function>(
                'WasabyLoaderUnit/resources/TestModuleAsyncTwice:exportFunctionTwice'
            ).then((exportFunction) => {
                expect(exportFunction).not.toBeUndefined();
                expect(exportFunction('test')).toStrictEqual('testtest');
            });

            return Promise.all([one, two]);
        });

        test('should throw an error of module does not exist', () => {
            expect.assertions(1);

            return loadAsync('WasabyLoaderUnit/resources/TestModuleAsyncFail').catch((err) => {
                expect(err.message).toMatch(
                    typeof window === 'undefined' ? 'Cannot find module' : 'Script error for'
                );
            });
        });

        test('should throw an error if a path within the library is not exists', () => {
            return loadAsync('WasabyLoaderUnit/resources/TestModuleAsync:NotFound').then(
                (res) => {
                    expect(res).not.toBeNull();
                },
                (err) => {
                    expect(err.message).toMatch(
                        'Cannot find module "NotFound" in library "WasabyLoaderUnit/resources/TestModuleAsync"'
                    );
                }
            );
        });
    });

    describe('loadSync()', () => {
        test('should return previously loaded module', () => {
            const syncModule = loadSync('WasabyLoaderUnit/resources/TestModuleSync');

            expect(syncModule).toStrictEqual(TestModuleSync);
        });

        test('should return a module from previously loaded library', () => {
            const syncFunction = loadSync<Function>(
                'WasabyLoaderUnit/resources/TestModuleSync:exportSyncFunction'
            );

            expect(syncFunction('test')).toStrictEqual('test');
        });

        test('should return throw an Error if module does not exist', () => {
            expect.assertions(1);

            try {
                loadSync('WasabyLoaderUnit/resources/TestModuleSyncFail');
            } catch (err) {
                if (err instanceof Error) {
                    expect(err.message).toMatch(
                        typeof window === 'undefined'
                            ? 'Cannot find module'
                            : 'has not been loaded yet'
                    );
                }
            }
        });

        test('should return undefined on second require of not exists module', () => {
            expect.assertions(typeof window === 'undefined' ? 2 : 1);

            try {
                loadSync('WasabyLoaderUnit/resources/TestModuleSyncFailTwice');
            } catch (err) {
                if (err instanceof Error) {
                    expect(err.message).toMatch(
                        typeof window === 'undefined'
                            ? 'Cannot find module'
                            : 'has not been loaded yet'
                    );
                }
            }

            if (typeof window === 'undefined') {
                expect(
                    loadSync('WasabyLoaderUnit/resources/TestModuleSyncFailTwice')
                ).toBeUndefined();
            }
        });
    });
});
