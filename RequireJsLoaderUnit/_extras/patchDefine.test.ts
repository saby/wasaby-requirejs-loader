import {
    getCircularDependencies,
    addForeignServiceDependencies,
} from 'RequireJsLoader/_extras/patchDefine';
import { getInstance } from 'RequireJsLoader/_extras/utils';
import { IModule } from 'RequireJsLoader/wasaby';

type ModulesList = { [name: string]: IModule };

describe('RequireJsLoader/_extras/patchDefine', () => {
    const requirejs = getInstance();

    describe('getCircularDependencies()', () => {
        test('should return circular path', () => {
            const deps = {
                ModuleA: ['ModuleB'],
                ModuleB: ['ModuleC'],
                ModuleC: ['ModuleA'],
            };

            expect(getCircularDependencies('ModuleA', deps)).toEqual([
                'ModuleA',
                'ModuleB',
                'ModuleC',
                'ModuleA',
            ]);
        });

        test('should return circular path even for another module', () => {
            const deps = {
                ModuleA: ['ModuleB'],
                ModuleB: ['ModuleC'],
                ModuleC: ['ModuleB'],
            };

            expect(getCircularDependencies('ModuleA', deps)).toEqual([
                'ModuleA',
                'ModuleB',
                'ModuleC',
                'ModuleB',
            ]);
        });

        test('should return undefined if there is no circular path', () => {
            const deps = {
                ModuleA: ['ModuleB'],
                ModuleB: ['ModuleC'],
                ModuleC: [],
            };

            expect(getCircularDependencies('ModuleA', deps)).toBeUndefined();
        });
    });

    describe('addForeignServiceDependencies()', () => {
        test('should add unknown module requested by foreign service to the modules list', () => {
            const modules: ModulesList = {
                ForeignModule1: {
                    service: 'foo',
                    path: '/foo-service/assests/ForeignModule1',
                    buildnumber: '1.2.3',
                    contextVersion: '4.5',
                },
            };

            addForeignServiceDependencies(requirejs, modules, 'ForeignModule1/A', [
                'UnknownModule1/B',
            ]);

            expect(modules.UnknownModule1).toEqual({
                initializer: 'ForeignModule1/A',
                path: '/foo-service/assests/UnknownModule1',
                service: 'foo',
                buildnumber: '1.2.3',
                contextVersion: '4.5',
            });
        });

        test("shouldn't add service module to the modules list", () => {
            const modules: ModulesList = {
                ForeignModule1: {
                    service: 'foo',
                    path: '/foo-service/assests/ForeignModule1',
                    buildnumber: '1.2.3',
                    contextVersion: '4.5',
                },
            };

            addForeignServiceDependencies(requirejs, modules, 'ForeignModule1/A', [
                'ServiceModule1',
            ]);

            expect(modules.ServiceModule1).toBeUndefined();
        });

        test("shouldn't add unknown module to the modules list in common case", () => {
            const modules: ModulesList = {
                ForeignModule2: {
                    buildnumber: '1.2.3',
                },
            };

            addForeignServiceDependencies(requirejs, modules, 'ForeignModule2/A', [
                'UnknownModule2/B',
            ]);

            expect(modules.UnknownModule2).toBeUndefined();
        });

        test("shouldn't add unknown module to the modules list if initial module is not defined", () => {
            const modules: ModulesList = {};

            addForeignServiceDependencies(requirejs, modules, 'ForeignModule3/A', [
                'UnknownModule3/B',
            ]);

            expect(modules.UnknownModule3).toBeUndefined();
        });
    });
});
