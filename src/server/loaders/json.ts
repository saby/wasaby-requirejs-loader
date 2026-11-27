/**
 * Серверный загрузчик для json
 * @author Кудрявцев И.С.
 */
import type ServerRequire from '../../ServerRequire';
import loadString from './loadString';
import RequireError from '../../main/RequireError';

/**
 * Загружает модули с именем json!${ModuleName}
 * @param module Модуль
 * @param name
 * @param buildPath Функция для формирования пути до файла
 */
export default function (defineName: string, filePath: string, context: ServerRequire): Object {
    const path = context.buildPath(filePath, 'json');

    try {
        return JSON.parse(loadString(path));
    } catch (err) {
        throw new RequireError(
            `Failed to load JSON module "${defineName}" file by path "${path}".`,
            {
                cause: err as Error,
                type: 'load',
            }
        );
    }
}
