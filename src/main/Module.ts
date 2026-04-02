/**
 * Базовые функционал для работы с модулем.
 * @author Кудрявцев И.С.
 */
import { ITensorFunction, requireCallback } from 'RequireJsLoader/requireTypes';
import { availableLoaders, IModuleInfo, IRequire } from './BaseRequire';

const EMPTY_FUNC: requireCallback = function () {};

export const NO_EXPORTS = Symbol('no-exports');

export type TLoader<ReturnValue, ModuleType extends Module> = (
    module: ModuleType,
    moduleInfo: IModuleInfo,
    context: IRequire<ModuleType>,
    ...addParams: any[]
) => ReturnValue;

/**
 * Базовый класс модуля
 */
export default class Module {
    readonly name: string;

    deps: string[];

    callback: requireCallback;

    defined: boolean;

    exports: unknown;

    extension: availableLoaders;

    path: string;

    rootDir: string;

    url: string;

    onDefine: Function | null;

    protected loading: Promise<void> | null;

    constructor(name: string) {
        this.name = name;
        this.defined = false;
        this.url = '';
        this.rootDir = '';
        this.extension = 'js';
        this.path = '';
        this.deps = [];
        this.callback = EMPTY_FUNC;
        this.exports = NO_EXPORTS;
        this.onDefine = null;
        this.loading = null;
    }

    /**
     * Дефайнит модуль
     */
    define(callback: requireCallback): void;
    define(deps: string[], callback: requireCallback): void;
    define(deps: string[] | requireCallback, callback?: requireCallback): void {
        if (this.defined) {
            return;
        }

        this.defined = true;

        if (typeof deps === 'function') {
            this.callback = deps;
        } else {
            this.callback = callback || EMPTY_FUNC;
            this.deps = deps;
        }

        this.onDefine?.();

        this.loading = null;
        this.onDefine = null;
    }

    /**
     * Извлекает экспортируюмую сущность из модуля.
     * @param depsValue Экспорты зависимостей
     */
    extractExports(depsValue: unknown[]): unknown {
        const module = depsValue[(this.deps as string[]).indexOf('module')];
        const exports = depsValue[(this.deps as string[]).indexOf('exports')];

        if (exports) {
            if (module && Object.keys(exports).length === 0) {
                // @ts-ignore
                return module.exports;
            }

            return exports;
        }

        // TODO Сомвестимсоть со старым.
        //  В архи старых модулях юзат зависимость "module", которая возвращает в объект с полем export,
        //  в него и склыдвают, что должен возрвращать модуль.
        //  Поэтому придёться обработь сия кейс и забирать от туда результат.
        //  Чтобы откатазать от этого кейса надо все переписать на просто return
        if (module) {
            // @ts-ignore
            return module.exports;
        }
    }

    /**
     * Резолвит относительную зависимость до полноценного имени модуля.
     * @param relName
     */
    getRelName(relName: string) {
        const result = this.name.split('/');
        const splitRelName = relName.split('/');

        result.pop();

        for (const dirName of splitRelName) {
            if (dirName === '.') {
                continue;
            }

            if (dirName === '..') {
                result.pop();

                continue;
            }

            result.push(dirName);
        }

        return result.join('/');
    }

    /**
     * Проверяет, что экспортируюмая сущность это объект.
     * @param exports
     */
    isObject(exports: object): boolean {
        return Object.getPrototypeOf(exports) === Object.prototype;
    }

    /**
     * Внедряет имя модуля в поле _moduleName в экспортируюмую сущность.
     * @param obj Экспортируемая сущность
     * @param moduleName Имя модуля.
     */
    injectModuleName(obj: any, moduleName: string): void {
        const exports =
            obj.__esModule && obj.default ? (obj.default as Record<string, unknown>) : obj;

        if (typeof exports === 'function') {
            // Give _moduleName to each class and BTW mark private classes
            const proto = (exports as ITensorFunction).prototype;
            const isPrivateModule = moduleName.indexOf('/_') !== -1;

            if (proto) {
                if (!proto.hasOwnProperty('_moduleName')) {
                    proto._moduleName = moduleName;
                    proto._isPrivateModule = isPrivateModule || undefined;
                }

                // arrow function has no prototype
            } else {
                if (!(exports as ITensorFunction).hasOwnProperty('_moduleName')) {
                    (exports as ITensorFunction)._moduleName = moduleName;
                    (exports as ITensorFunction)._isPrivateModule = isPrivateModule || undefined;
                }
            }
        } else if (
            // Give _moduleName to each private or unnamed class in public library
            typeof exports === 'object' &&
            this.isObject(exports) &&
            moduleName.indexOf('/_') === -1
        ) {
            Object.keys(exports).forEach((name) => {
                const module = (exports as Record<string, unknown>)[name];

                if (typeof module === 'function') {
                    const proto = module.prototype;

                    if (proto) {
                        if (proto._isPrivateModule || !proto.hasOwnProperty('_moduleName')) {
                            proto._moduleName = moduleName + ':' + name;
                        }

                        // arrow function has no prototype
                    } else {
                        if (
                            (module as ITensorFunction)._isPrivateModule ||
                            !module.hasOwnProperty('_moduleName')
                        ) {
                            (module as ITensorFunction)._moduleName = moduleName + ':' + name;
                        }
                    }
                }
            });
        }
    }
}
