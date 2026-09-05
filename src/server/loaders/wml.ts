/**
 * Серверный загрузчик для wml
 * @author Кудрявцев И.С.
 */
import type ServerRequire from '../../ServerRequire';
import jsLoader from './js';

/**
 * Загружает модули с именем wml!${ModuleName}
 * @param module Модуль
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context Require
 * @param ext Расширение файла
 * @param deps Доп зависмости, которые надо загрузить
 */
export default function (defineName: string, filePath: string, context: ServerRequire): unknown {
    return jsLoader(defineName, `${filePath}.wml`, context);
}
