/**
 * Загрузчик для модулей и библиотек.
 * @module
 * @public
 * @author Колбешин Ф.А.
 */
import {
    getModuleUrl as getModuleUrlBase,
    ModulesManager,
    ModuleLoadCallback,
} from 'RequireJsLoader/conduct';
import { getCookie } from 'RequireJsLoader/config';
import { IRequireExt } from 'RequireJsLoader/requireTypes';
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

// список модулей для отложенной загрузки.
const modulesForWarmup = new Set<string>([]);

function getModulesManager(): ModulesManager {
    if (!modulesManager) {
        modulesManager = new ModulesManager(requirejs);
    }

    return modulesManager;
}

// функция, которая экспортирует метод подписки на событие о загрузке конкретного модуля
// и позволяет выполнять пользовательский callback после загрузки определённого модуля
export function onModuleLoaded(callback: ModuleLoadCallback) {
    getModulesManager().onModuleLoaded(callback);
}

// функция, которая экспортирует метод отписки от события о загрузке конкретного модуля
export function offModuleLoaded(callback: ModuleLoadCallback) {
    if (modulesManager) {
        modulesManager.offModuleLoaded(callback);
    }
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
 * @param name Имя модуля в обычном (Foo/bar) или библиотечном (Foo/bar:baz) синтаксисе
 * @protected
 */
export function isLoaded(name: string): boolean {
    const parsedInfo: IParsedName = parse(name);

    return getModulesManager().isLoaded(parsedInfo.name);
}

/**
 * Возвращает URL местоположения модуля
 * @param name Имя модуля в обычном (Foo/bar) или библиотечном (Foo/bar:baz) синтаксисе
 */
export function getModuleUrl(
    name: string,
    debugCookieValue?: string,
    isIE?: boolean,
    direction?: string,
    version?: boolean
): string {
    const parsedInfo: IParsedName = parse(name);

    return getModuleUrlBase(
        parsedInfo.name,
        undefined,
        debugCookieValue,
        undefined,
        isIE,
        direction,
        version
    );
}

// возвращает значение таймаута для старта прогрева модулей после инициализации.
function getWarmupTimeout(): number {
    const cookie = getCookie();
    const matches = cookie.match(/s3WarmupTimeout=([^;]+)[;]?/);

    if (matches) {
        return Number(matches[1]);
    }

    return 2000;
}

// инициализирует старт прогрева модулей.
export async function initWarmup(): Promise<void> {
    return new Promise((resolve, reject) => {
        const warmupTimeout = getWarmupTimeout();

        setTimeout(async () => {
            const promises: Promise<unknown>[] = [];
            const errors: string[] = [];

            // формируем список промисов на асинхронную загрузку каждого модуля прогрева
            [...modulesForWarmup].forEach((module) => {
                promises.push(loadAsync(module));
            });

            // чистим список модулей для прогрева, поскольку они уже добавлены в очередь на загрузку
            modulesForWarmup.clear();

            // грузим асинхронно все модули прогрева через allSettled, чтобы получить список всех результатов
            // и сформировать список всех ошибок, которые возникли в процессе выполнения прогрева
            Promise.allSettled(promises).then((results) => {
                results.forEach((currentResult) => {
                    // формируем список модулей с ошибками и кидаем исключение со
                    // списком всех упавших модулей и ошибкой со стеком для каждого из них
                    if (currentResult.status === 'rejected') {
                        errors.push(currentResult.reason);
                    }
                });

                if (errors.length > 0) {
                    reject(
                        `Во время прогрева некоторые модули не смогли загрузиться:\n${errors.join(
                            '\n------------------------\n'
                        )}`
                    );
                } else {
                    resolve();
                }
            });
        }, warmupTimeout);
    });
}

/**
 * Добавляет модуль или массив модулей в список для прогрева
 * @param modules - модуль или массив модулей для прогрева
 */
export function addToWarmup(modules: string | string[]): void {
    if (modules instanceof Array) {
        modules.forEach((module) => modulesForWarmup.add(module));
    }

    if (typeof modules === 'string') {
        modulesForWarmup.add(modules);
    }
}

/**
 * Асинхронно загружает модуль. Возвращает промис, но умеет рабоать и через колбеки.
 * @param name Имя модуля в обычном (Foo/bar) или библиотечном (Foo/bar:baz) синтаксисе
 * @param callback Колбек на успех, возврашает загруженный модуль.
 * @param errback Колбек на ошибку, возврашает ошибку.
 */
export async function loadAsync<T>(
    name: string,
    callback?: (module: T) => void,
    errback?: (err: Error) => void
): Promise<T> {
    if (!(name && typeof name === 'string')) {
        const err = new Error('Module name must be string and not empty');

        errback?.(err);

        throw err;
    }

    if (cache[name]) {
        callback?.(cache[name]);

        return cache[name];
    }

    if (!ModulesManager.isModule(name)) {
        const err = new Error(`UI module ${name} not found in contents.json`);

        errback?.(err);

        throw err;
    }

    const parsedInfo: IParsedName = parse(name);
    const modulesManager = getModulesManager();

    if (modulesManager.isLoaded(name)) {
        cache[name] = getFromLib(modulesManager.loadSync(name), parsedInfo);

        callback?.(cache[name]);

        return cache[name];
    }

    const callStack = new Error().stack;

    try {
        const module = await modulesManager.loadModule<[T]>(parsedInfo.name);

        cache[name] = getFromLib(module, parsedInfo);

        callback?.(cache[name]);

        return cache[name];
    } catch (err) {
        if (err instanceof Error) {
            const callStackMessage = `"loadAsync" function call stack: ${callStack}`;
            const url = (requirejs as IRequireExt).s.contexts._.nameToUrl(parsedInfo.name);

            err.message = `${err.message}\n URL: ${url}\n ${callStackMessage}\n Original error stack:`;
        }

        errback?.(err as Error);

        throw err;
    }
}

/**
 * Возвращает загруженный модуль
 * @param name Имя модуля в обычном (Foo/bar) или библиотечном (Foo/bar:baz) синтаксисе
 */
export function loadSync<T>(name: string): T {
    if (!cache[name]) {
        if (!ModulesManager.isModule(name)) {
            throw new Error(`UI module ${name} not found in contents.json`);
        }

        const parsedInfo = parse(name);

        cache[name] = getFromLib(getModulesManager().loadSync<T>(parsedInfo.name), parsedInfo);
    }

    return cache[name];
}

/**
 * Синхронно выгружает модуль
 * @param module Имя модуля в обычном (Foo/bar) или библиотечном (Foo/bar:baz) синтаксисе
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
