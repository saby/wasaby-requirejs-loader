/**
 * Сервеный функционал для работы с модулем.
 * @author Кудрявцев И.С.
 */
import { ITensorFunction, requireCallback } from 'RequireJsLoader/requireTypes';
import type { IRequire } from '../main/BaseRequire';
import BaseModule, { TLoader, NO_EXPORTS } from '../main/Module';
import RequireError from '../main/RequireError';
import logger from './logger';
import type ModuleInfo from '../main/ModuleInfo';
import type { availableLoaders } from '../main/FileInfo';

import wml from './loaders/wml';
import js from './loaders/js';
import tmpl from './loaders/tmpl';
import css from './loaders/css';
import i18n from './loaders/i18n';
import json from './loaders/json';
import text from './loaders/text';
import html from './loaders/html';

interface ISerializableFunction extends Function {
    toJSON: Function;
}

const MAX_SERIALIZATION_LOOKUP_DEPTH = 4;
const loaders: Record<availableLoaders, TLoader<void, Module>> = {
    wml,
    js,
    tmpl,
    css,
    i18n,
    json,
    text,
    html,
};

const nodeJSExportProto =
    // @ts-ignore убрать когда придумаю кк подцепить Node.js типы
    typeof module !== 'undefined' ? Object.getPrototypeOf(module.exports) : null;

function isClass(objt: object): objt is Record<string, object> {
    return !!objt.constructor;
}

/**
 * Серверный класс модуля
 */
export default class Module extends BaseModule {
    protected loader: IRequire<Module>;

    constructor(name: string, loader: IRequire<Module>) {
        super(name);

        this.loader = loader;
    }

    /**
     * Загрузка модуля
     */
    load() {
        try {
            const moduleInfo =
                this.loader.modulesInfo.get(this.rootDir) ||
                (this.loader.modulesInfo.get('$default$') as ModuleInfo);

            loaders[this.extension](this, moduleInfo, this.loader);
        } catch (err) {
            if (RequireError.isRequireError(err)) {
                throw err;
            }

            throw new RequireError(
                `Failed to load module "${this.name}" file by url "${this.url}".`,
                {
                    cause: err as Error,
                    type: 'load',
                }
            );
        }
    }

    /**
     * Получить экспорты для зависимостей
     */
    getDepsExports() {
        const result = [];

        for (const dep of this.deps) {
            // Необходма для того чтобы require смог разрещить относительные пути.
            this.loader.context = this;

            result.push(this.loader.require(dep));
        }

        return result;
    }

    /**
     * Производит модификацию экспорта.
     */
    prepareExports() {
        if (this.extension === 'js' && this.exports) {
            this.injectModuleName(this.exports, this.name);
            Module.injectToJson(this.exports, this.name);
        }
    }

    /**
     * Получить экспорт модуля
     */
    getExports() {
        if (this.exports !== NO_EXPORTS) {
            return this.exports;
        }

        try {
            if ((this.deps as string[]).length === 0) {
                this.executeCallback();
            } else {
                const depsExport = this.getDepsExports();

                this.executeCallback(depsExport);

                if (!this.exports) {
                    this.exports = this.extractExports(depsExport);
                }
            }

            this.prepareExports();

            return this.exports;
        } catch (err) {
            if (RequireError.isRequireError(err)) {
                throw err;
            }

            throw new RequireError(
                `Failed to execute  callback function for module "${this.name}" loaded by url "${this.url}".`,
                {
                    cause: err as Error,
                    type: 'Executing callback',
                }
            );
        }
    }

    /**
     * Выполяем обработчик из define, чтобы получит жкспорт модуля.
     * @param depsExports
     */
    executeCallback(depsExports: unknown[] = []): void {
        // В этой точке конетекст может быть перебить зависимостями, поэтому выставялем его снова.
        // Внутри колбека могут вызывать синхроный require с относительным именем.
        this.loader.context = this;

        this.exports = (this.callback as requireCallback)(...depsExports);

        // В этой точке конетекст может быть перебить зависимостями, поэтому выставялем его снова.
        // Внутри колбека могут вызывать синхроный require с относительным именем.
        this.loader.context = null;

        this.clearCallback();
    }

    /**
     * Проверяет, что экспорт это объект
     * @param exports
     */
    isObject(exports: object): boolean {
        if (super.isObject(exports)) {
            return true;
        }

        return nodeJSExportProto && nodeJSExportProto === Object.getPrototypeOf(exports);
    }

    /**
     * Добавялем в функцию метод toJSON, чтобы она сериализовывалась
     * @param func Функция
     * @param resolver Резолвер для toJSON
     */
    static makeFunctionSerializable(func: ISerializableFunction, resolver: Function): void {
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
    static makeArraySerializable(
        arr: object[],
        moduleName: string,
        initialPrefix?: string,
        depth?: number
    ): void {
        const arrLength = arr.length;
        const prefix = initialPrefix ? `${initialPrefix}.` : '';

        for (let i = 0; i < arrLength; i++) {
            Module.makeSerializable(depth || 0, arr[i], moduleName, prefix + i);
        }
    }

    /**
     * Делает объект сериализуемым
     * @param obj
     * @param resolver
     * @param depth
     */
    static makeObjectSerializable(
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
                Module.makeSerializable(depth || 0, obj[prop], moduleName, prefix + prop);
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
    static makeSerializable(
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
                            func.prototype.hasOwnProperty('_moduleName') &&
                            func.prototype._moduleName;
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
                    Module.makeObjectSerializable(obj, getNameAndPath, depth);
                }

                // Secondly add a new property and this way prevent to go through it
                if (!obj.hasOwnProperty('toJSON')) {
                    Module.makeFunctionSerializable(obj as ISerializableFunction, getNameAndPath);
                }

                break;
            }
            case 'object': {
                const isObject = (objt: object): objt is Record<string, object> => {
                    return objt && Object.getPrototypeOf(objt) === Object.prototype;
                };

                if (Array.isArray(obj)) {
                    Module.makeArraySerializable(obj, moduleName, prefix, depth);
                } else if (isObject(obj)) {
                    // is plain Object
                    Module.makeObjectSerializable(obj, () => [moduleName, prefix], depth);
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
    static injectToJson(exports: unknown, moduleName: string): void {
        Module.makeSerializable(MAX_SERIALIZATION_LOOKUP_DEPTH, exports as object, moduleName);
    }
}
