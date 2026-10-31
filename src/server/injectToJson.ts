import logger from './logger';
import { ITensorFunction } from 'RequireJsLoader/requireTypes';

interface ISerializableFunction extends Function {
    toJSON: Function;
}

const MAX_SERIALIZATION_LOOKUP_DEPTH = 4;

function isClass(objt: object): objt is Record<string, object> {
    return !!objt.constructor;
}

/**
 * Добавялем в функцию метод toJSON, чтобы она сериализовывалась
 * @param func Функция
 * @param resolver Резолвер для toJSON
 */
function makeFunctionSerializable(func: ISerializableFunction, resolver: Function): void {
    func.toJSON = () => {
        const [moduleName, path]: string[] = resolver(func);
        return {
            $serialized$: 'func',
            module: moduleName,
            path: path || undefined,
        };
    };
}

/**
 * Делает массив сериализуемым
 * @param arr Массив
 * @param moduleName Имя модуля
 * @param initialPrefix
 * @param depth Глубина
 */
function makeArraySerializable(
    arr: object[],
    moduleName: string,
    initialPrefix?: string,
    depth?: number
): void {
    const arrLength = arr.length;
    const prefix = initialPrefix ? `${initialPrefix}.` : '';

    for (let i = 0; i < arrLength; i++) {
        makeSerializable(depth || 0, arr[i], moduleName, prefix + i);
    }
}

/**
 * Делает объект сериализуемым
 * @param obj
 * @param resolver
 * @param depth
 */
function makeObjectSerializable(
    obj: Record<string, object>,
    resolver: Function,
    depth?: number
): void {
    const [moduleName, resolvedPrefix]: string[] = resolver(obj);
    const prefix = resolvedPrefix ? `${resolvedPrefix}.` : '';

    Object.keys(obj).forEach((prop) => {
        // Go through data descriptors only
        const descriptor = Object.getOwnPropertyDescriptor(obj, prop) || {};

        if (!('value' in descriptor)) {
            return;
        }

        try {
            makeSerializable(depth || 0, obj[prop], moduleName, prefix + prop);
        } catch (err) {
            logger.error(
                `resourceLoadHandler: something went wrong during '${
                    prefix + prop
                }' property serialization in module '${moduleName}'`,
                (err as Error).message,
                err as string
            );
        }
    });
}

/**
 * После require js модуля на все функции навешивается toJSON
 * функции ищутся рекурсивно вглубь объектов.
 * Модуль А: { f1 : function(){} }
 * Модуль В: { K :  {
 *                          someFunction: A.f1
 *                        }
 *                }
 * При require модуля B с зависимостью модулем А сначала toJSON будет вызван для
 * функции f1 от объекта А (при загрузке зависимостей)
 * А при загрузке самого модуля В, toJSON для f1 будет вызван от объекта B.K
 * соответственно правильная ссылка будет потеряна.
 * @param initialDepth
 * @param obj
 * @param moduleName
 * @param prefix
 */
function makeSerializable(
    initialDepth: number,
    obj: object | Function,
    moduleName: string,
    prefix?: string
): void {
    if (initialDepth === 0) {
        return;
    }

    const depth = initialDepth - 1;

    switch (typeof obj) {
        case 'function': {
            const getNameAndPath = (func: ITensorFunction) => {
                let name = moduleName;
                let path = prefix;
                let moduleNameFromProto;

                if (func.prototype) {
                    moduleNameFromProto =
                        func.prototype.hasOwnProperty('_moduleName') && func.prototype._moduleName;
                } else {
                    moduleNameFromProto = func._moduleName;
                }

                if (moduleNameFromProto) {
                    moduleNameFromProto = String(moduleNameFromProto);

                    if (moduleNameFromProto.indexOf(':') > -1) {
                        [name, path] = moduleNameFromProto.split(':', 2);
                    }
                }

                return [name, path];
            };

            // Firstly go through the original function/class properties
            if (isClass(obj)) {
                makeObjectSerializable(obj, getNameAndPath, depth);
            }

            // Secondly add a new property and this way prevent to go through it
            if (!obj.hasOwnProperty('toJSON')) {
                makeFunctionSerializable(obj as ISerializableFunction, getNameAndPath);
            }

            break;
        }
        case 'object': {
            const isObject = (objt: object): objt is Record<string, object> => {
                return objt && Object.getPrototypeOf(objt) === Object.prototype;
            };

            if (Array.isArray(obj)) {
                makeArraySerializable(obj, moduleName, prefix, depth);
            } else if (isObject(obj)) {
                // is plain Object
                makeObjectSerializable(obj, () => [moduleName, prefix], depth);
            }

            break;
        }
    }
}

/**
 * Внедряет в экспорт toJSON чтобы он серализовывался
 * @param exports Экспорт
 * @param moduleName Имя модуля
 */
export default function injectToJson(exports: unknown, moduleName: string): void {
    makeSerializable(MAX_SERIALIZATION_LOOKUP_DEPTH, exports as object, moduleName);
}
