/**
 * Набор вспомогательных функций для работы с библиотечными именами.
 * @module
 * @public
 * @author Колбешин Ф.А.
 */

const RETRIEVABLE_TYPES: string[] = ['object', 'function'];

/**
 * Библиотека.
 * @typedef { Object } ILibrary
 * @property {any} propName Экспорт из библиотеки.
 */
export interface ILibrary<T> {
    [propName: string]: T | ILibrary<T>;
}

/**
 * Описание экспорта библиотеки.
 * @typedef {Object} IParsed
 * @property {String} name Имя библиотеки.
 * @property {String[]} path Цепочка имён экспортов.
 */
export interface IParsed {
    name: string;
    path: string[];
}

function isObjLibrary<T>(lib: T | ILibrary<T>): lib is ILibrary<T> {
    return lib && typeof lib === 'object';
}

function getExportNames<T>(library: T | ILibrary<T>): T | string[] {
    if (isObjLibrary<T>(library)) {
        return Object.keys(library).filter((exp) => {
            return !exp.includes('/');
        });
    }

    return library;
}

export function load<T>(name: string): Promise<T> {
    return import('WasabyLoader/ModulesLoader').then(({ loadAsync }) => {
        return loadAsync(name);
    });
}

function isILibrary<T>(module: unknown): module is ILibrary<T> {
    return !!module && RETRIEVABLE_TYPES.includes(typeof module);
}

/**
 * Извлекает модуль из библиотеки.
 * @param exports {WasabyLoader/Library/ILibrary.typedef} Имплементация библиотеки.
 * @param info {WasabyLoader/Library/IParsed.typedef} Информация об извлекаемом экспорте.
 * @return Значение экспорта.
 * @public
 */
export function extract<T>(exports: T | ILibrary<T>, info: IParsed): T | ReferenceError {
    let module = exports;

    if (info.path.length) {
        // Extract module by the path
        const processed = [];

        for (let i = 0; i < info.path.length; i++) {
            const property = info.path[i];

            processed.push(property);

            if (isILibrary<T>(module) && property in module) {
                module = module[property];

                continue;
            }

            const availableExportMsg = `Available export names: ${getExportNames<T>(module)}`;
            const msg = `Cannot find module "${processed.join('.')}" in library "${info.name}".`;

            return new ReferenceError(`${msg} ${availableExportMsg}`);
        }
    } else {
        // The library is module itself. But mind the default export for ES6 modules.
        if (module && (module as ILibrary<T>).__esModule && (module as ILibrary<T>).default) {
            module = (module as ILibrary<T>).default;
        }
    }

    return module as T;
}

/**
 * Парсит имя модуля в объект.
 * @param name {String} Имя модуля. Например 'Library/Name:Path.To.Module' или 'Module/Name'.
 * @return {WasabyLoader/Library/IParsed.typedef} Описание экспорта библиотеки.
 * @public
 */
export function parse(name: string): IParsed {
    const parts = String(name || '').split(':', 2);
    return {
        name: parts[0],
        path: parts[1] ? parts[1].split('.') : [],
    };
}
