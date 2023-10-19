import { IRequireContext, IRequireMapExt } from '../require.ext';

const MAX_SERIALIZATION_LOOKUP_DEPTH = 4;

interface ISerializableFunction extends Function {
    toJSON: Function;
}

/**
 * Does some stuff with loaded modules: makes functions serializable for example
 */
export default function resourceLoadHandler(require: Require, force?: boolean): () => void {
    // https://github.com/requirejs/requirejs/wiki/Internal-API:-onResourceLoad
    const originalOnResourceLoad = require.onResourceLoad;

    if (force || typeof window === 'undefined') {
        require.onResourceLoad = ((source) => {
            const makeFunctionSerializable = (
                func: ISerializableFunction,
                resolver: Function
            ): void => {
                func.toJSON = () => {
                    const [moduleName, path]: string[] = resolver(func);
                    return  {
                        $serialized$: 'func',
                        module: moduleName,
                        path: path || undefined
                    };
                };
            };

            const makeArraySerializable = (
                arr: object[],
                moduleName: string,
                initialPrefix: string,
                depth?: number
            ): void => {
                const arrLength = arr.length;
                const prefix = initialPrefix ? `${initialPrefix}.` : '';
                for (let i = 0; i < arrLength; i++) {
                    makeSerializable(depth, arr[i], moduleName, prefix + i);
                }
            };

            const makeObjectSerializable = (obj: object, resolver: Function, depth?: number): void => {
                const [moduleName, resolvedPrefix]: string[] = resolver(obj);
                const prefix = resolvedPrefix ? `${resolvedPrefix}.` : '';
                Object.keys(obj).forEach((prop) => {
                    // Go through data descriptors only
                    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
                    if (!('value' in descriptor)) {
                        return;
                    }

                    try {
                        makeSerializable(depth, obj[prop], moduleName, prefix + prop);
                    } catch (err) {
                        const envModule = 'Env/Env';
                        import(envModule).then(({IoC}) => {
                            IoC.resolve('ILogger').error(
                                `resourceLoadHandler: something went wrong during '${prefix + prop}' property serialization in module '${moduleName}'`,
                                err.message,
                                err
                            );
                        }).catch((err) => {
                            require.onError(err);
                        });
                    }
                });
            };

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
             */
            const makeSerializable = (
                initialDepth: number,
                obj: object | Function,
                moduleName: string,
                prefix?: string
            ): void => {
                if (initialDepth === 0) {
                    return;
                }
                const depth = initialDepth - 1;

                switch (obj && typeof obj) {
                    case 'function':
                        const getNameAndPath = (func) => {
                            let name = moduleName;
                            let path = prefix;
                            let moduleNameFromProto = func.prototype &&
                                func.prototype.hasOwnProperty('_moduleName') &&
                                func.prototype._moduleName;

                            if (moduleNameFromProto) {
                                moduleNameFromProto = String(moduleNameFromProto);
                                if (moduleNameFromProto.indexOf(':') > -1) {
                                    [name, path] = moduleNameFromProto.split(':', 2);
                                }
                            }
                            return [name, path];
                        };

                        // Firstly go through the original function/class properties
                        if (obj.constructor) {
                            makeObjectSerializable(obj, getNameAndPath, depth);
                        }

                        // Secondly add a new property and this way prevent to go through it
                        if (!obj.hasOwnProperty('toJSON')) {
                            makeFunctionSerializable(obj as ISerializableFunction, getNameAndPath);
                        }
                        break;

                    case 'object':
                        if (Array.isArray(obj)) {
                            makeArraySerializable(obj, moduleName, prefix, depth);
                        } else if (Object.getPrototypeOf(obj) === Object.prototype) {
                            // is plain Object
                            makeObjectSerializable(obj, () => [moduleName, prefix], depth);
                        }
                        break;
                }
            };

            return function(context: IRequireContext, map: IRequireMapExt): void {
                let prefix = map.prefix || '';
                if (!prefix || prefix === 'js') {
                    const exports = context.defined[map.id];
                    const moduleName = map.name;

                    if (prefix) {
                        prefix += '!';
                    }

                    makeSerializable(MAX_SERIALIZATION_LOOKUP_DEPTH, exports as object, prefix + moduleName);
                }

                if (source) {
                    source.apply(this, arguments);
                }
            };
        })(originalOnResourceLoad);
    }

    return () => {
        require.onResourceLoad = originalOnResourceLoad;
    };
}
