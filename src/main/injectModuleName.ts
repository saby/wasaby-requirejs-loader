/**
 * Внедряет имя модуля в поле _moduleName в экспортируюмую сущность.
 * @author Кудрявцев И.С.
 */
import { ITensorFunction } from 'RequireJsLoader/requireTypes';

type isObjectChecker = (exports: object) => boolean;

/**
 * Внедряет имя модуля в поле _moduleName в экспортируюмую сущность.
 * @param obj Экспортируемая сущность
 * @param moduleName Имя модуля.
 * @param isObject
 */
export default function injectModuleName(
    obj: any,
    moduleName: string,
    isObject: isObjectChecker
): void {
    const exports = obj.__esModule && obj.default ? (obj.default as Record<string, unknown>) : obj;

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
        isObject(exports) &&
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
