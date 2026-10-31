/**
 * Браузерный загрузчик для tmpl
 * @author Кудрявцев И.С.
 */
import type WebRequire from '../../WebRequire';
import jsLoader from './js';

/**
 * Загружает и дефанит модули с именем tmpl!${ModuleName}
 * @param fileInfo
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context Require
 */
export default function (
    defineName: string,
    filePath: string,
    context: WebRequire
): Promise<unknown> {
    return jsLoader(defineName, `${filePath}.tmpl`, context);
}
