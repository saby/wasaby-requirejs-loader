/**
 * Серверный загрузчик для tmpl
 * @author Кудрявцев И.С.
 */
import type ServerRequire from '../../ServerRequire';
import jsLoader from './js';

/**
 * Загружает модули с именем tmpl!${ModuleName}
 * @param fileInfo
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context Require
 */
export default function (defineName: string, filePath: string, context: ServerRequire): unknown {
    return jsLoader(defineName, `${filePath}.tmpl`, context);
}
