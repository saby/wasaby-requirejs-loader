/**
 * Браузерный загрузчик для текстового представления
 * @author Кудрявцев И.С.
 */
import fetchLoader from './fetch';
import RequireError from '../../main/RequireError';
import type WebRequire from '../../WebRequire';

/**
 * Загружает и дефанит модули с именем text!${ModuleName}
 * @param module Модуль
 * @param buildUrl Функция для формирования URL
 * @param crossOrigin Являеться запрос cross origin
 * @param context
 */
export default async function (
    defineName: string,
    filePath: string,
    context: WebRequire
): Promise<string> {
    const splitName = filePath.split('.');
    const ext = splitName.pop() as string;
    const path = splitName.join('.');

    const url = context.buildUrl(path, ext);

    try {
        return await fetchLoader(url);
    } catch (err) {
        throw new RequireError(`Failed to load TEXT module "${defineName}" file by url "${url}".`, {
            cause: err as Error,
            type: 'load',
        });
    }
}
