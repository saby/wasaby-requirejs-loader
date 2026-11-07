/**
 * Браузерный загрузчик для wml
 * @author Кудрявцев И.С.
 */
import type WebRequire from '../../WebRequire';
import jsLoader from './js';

/**
 * Загружает и дефанит модули с именем wml!${ModuleName}
 * @param fileInfo
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context Require
 * @param ext Расширения шаблона.
 * @param deps Дополнительные зависимости.
 */
export default async function (
    defineName: string,
    filePath: string,
    context: WebRequire
): Promise<unknown> {
    return jsLoader(defineName, `${filePath}.wml`, context);
}
