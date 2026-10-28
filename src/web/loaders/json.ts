/**
 * Браузерный загрузчик для json
 * @author Кудрявцев И.С.
 */
import fetchLoader from './fetch';
import RequireError from '../../main/RequireError';
import type WebRequire from '../../WebRequire';

/**
 * Загружает и дефанит модули с именем json!${ModuleName}
 * @param module Модуль
 * @param buildUrl Функция для формирования URL
 * @param crossOrigin Являеться запрос cross origin
 */
export default async function (
    defineName: string,
    filePath: string,
    context: WebRequire
): Promise<Object> {
    const url = context.buildUrl(filePath, 'json');

    try {
        return JSON.parse(await fetchLoader(url));
    } catch (err) {
        throw new RequireError(`Failed to load JSON module "${defineName}" file by url "${url}".`, {
            cause: err as Error,
            type: 'load',
        });
    }
}
