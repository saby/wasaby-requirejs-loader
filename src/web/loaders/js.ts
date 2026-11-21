/**
 * Браузерный загрузчик для JS
 * @author Кудрявцев И.С.
 */
import { DEFINE_MODULE } from '../../main/BaseRequire';
import type WebRequire from '../../WebRequire';
import RequireError from '../../main/RequireError';

/**
 * Загружает и дефанит модули с именем ${ModuleName}
 * @param fileInfo
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context
 */
export default async function (
    defineName: string,
    filePath: string,
    context: WebRequire
): Promise<unknown> {
    const url = context.buildUrl(filePath, 'js');

    try {
        await context.loader.script(url);

        if (context.definedMap.has(defineName)) {
            return DEFINE_MODULE;
        }

        return null;
    } catch (err) {
        throw new RequireError(
            `Failed to load JavaScript module "${defineName}" file by url "${url}".`,
            {
                cause: err as Error,
                type: 'load',
            }
        );
    }
}
