/**
 * Серверный загрузчик для текстовых данных
 * @author Кудрявцев И.С.
 */
import type ServerRequire from '../../ServerRequire';
import loadString from './loadString';
import RequireError from '../../main/RequireError';

/**
 * Загружает модули с именем text!${ModuleName}
 * @param module Модуль
 * @param name
 * @param buildPath Функция для формирования пути до файла
 */
export default function (defineName: string, filePath: string, context: ServerRequire): string {
    const splitName = filePath.split('.');
    const ext = splitName.pop() as string;
    const path = context.buildPath(splitName.join('.'), ext);

    try {
        return loadString(path);
    } catch (err) {
        throw new RequireError(
            `Failed to load JavaScript modules "${defineName}" file by path "${path}".`,
            {
                cause: err as Error,
                type: 'load',
            }
        );
    }
}
