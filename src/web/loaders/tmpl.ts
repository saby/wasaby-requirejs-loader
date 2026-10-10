/**
 * Браузерный загрузчик для tmpl
 * @author Кудрявцев И.С.
 */
import type WebRequire from '../../WebRequire';
import wmlLoader from './wml';

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
    return wmlLoader(defineName, filePath, context, 'tmpl', [
        'is!compatibleLayer?Lib/Control/Control.compatible',
        'is!compatibleLayer?Lib/Control/AreaAbstract/AreaAbstract.compatible',
    ]);
}
