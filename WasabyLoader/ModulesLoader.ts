/**
 * Загрузчик для модулей и библиотек.
 * @module
 * @public
 * @author Колбешин Ф.А.
 */
import { getModuleUrl as getModuleUrlBase, ModulesManager } from 'RequireJsLoader/conduct';
import { IRequireExt } from 'RequireJsLoader/require.ext';
import { extract, parse } from './Library';

interface IParsedName {
    name: string;
    path: string[];
}

interface ICache {
    [moduleName: string]: any;
}

let cache: ICache = {};

let modulesManager: ModulesManager;

function getModulesManager(): ModulesManager {
    if (!modulesManager) {
        modulesManager = new ModulesManager(requirejs);
    }

    return modulesManager;
}

function getFromLib<T>(lib: T, parsedName: IParsedName): T {
    const mod = extract<T>(lib, parsedName);

    if (mod instanceof Error) {
        throw new Error(mod.message);
    }

    return mod as T;
}

/**
 * Возвращает признак, что модуль загружен
 * @param name {String} Имя модуля в обычном (Foo/bar) или библиотечном (Foo/bar:baz) синтаксисе
 * @protected
 */
export function isLoaded(name: string): boolean {
    const parsedInfo: IParsedName = parse(name);

    return getModulesManager().isLoaded(parsedInfo.name);
}

/**
 * Возвращает URL местоположения модуля
 * @param name {String} Имя модуля в обычном (Foo/bar) или библиотечном (Foo/bar:baz) синтаксисе
 */
export function getModuleUrl(name: string, debugCookieValue?: string, isIE?: boolean, direction?: string): string {
    const parsedInfo: IParsedName = parse(name);

    return getModuleUrlBase(parsedInfo.name, undefined, debugCookieValue, undefined, isIE, direction);
}

/**
 * Асинхронно загружает модуль
 * @param name {String} Имя модуля в обычном (Foo/bar) или библиотечном (Foo/bar:baz) синтаксисе
 */
export async function loadAsync<T>(name: string): Promise<T> {
    if (!(name && typeof name === 'string')) {
        throw new Error('Module name must be string and not empty');
    }

    if (cache[name]) {
        return cache[name];
    }

    if (!ModulesManager.isModule(name)) {
        throw new Error(`UI module ${name} not found in contents.json`);
    }

    const parsedInfo: IParsedName = parse(name);
    const modulesManager = getModulesManager();

    if (modulesManager.isLoaded(name)) {
        cache[name] = getFromLib(modulesManager.loadSync(name), parsedInfo);

        return cache[name];
    }

    const callStack = new Error().stack;

    try {
        const module = await modulesManager.loadModule<[T]>(parsedInfo.name);

        cache[name] = getFromLib(module, parsedInfo);

        return cache[name];
    } catch (err) {
        const callStackMessage = `"loadAsync" function call stack: ${callStack}`;
        const url = (requirejs as IRequireExt).s.contexts._.nameToUrl('Controls/popup');

        err.message = `${err.message}\n URL: ${url}\n ${callStackMessage}\n Original error stack:`;

        throw err;
    }
}

/**
 * Возвращает загруженный модуль
 * @param name {String} Имя модуля в обычном (Foo/bar) или библиотечном (Foo/bar:baz) синтаксисе
 */
export function loadSync<T>(name: string): T {
    if (!cache[name]) {
        if (!ModulesManager.isModule(name)) {
            throw new Error(`UI module ${name} not found in contents.json`)
        }

        const parsedInfo = parse(name);

        cache[name] = getFromLib(getModulesManager().loadSync<T>(parsedInfo.name), parsedInfo);
    }

    return cache[name];
}

/**
 * Синхронно выгружает модуль
 * @param module {String} Имя модуля в обычном (Foo/bar) или библиотечном (Foo/bar:baz) синтаксисе
 * @protected
 */
export function unloadSync(module: string): void {
    const parsedInfo: IParsedName = parse(module);

    delete cache[module];

    getModulesManager().unloadSync(parsedInfo.name);
}

export function clearCache(): void {
    cache = {};
}
