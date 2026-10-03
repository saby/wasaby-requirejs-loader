/**
 * Браузерный загрузчик для css
 * @author Кудрявцев И.С.
 */
import type { IPatchedGlobal } from 'RequireJsLoader/wasaby';
import type WebRequire from '../../WebRequire';
import RequireError from '../../main/RequireError';

// @ts-ignore
const globalEnv: IPatchedGlobal = globalThis;
const disableLoadCss = !(globalEnv.wsConfig?.loadCss === undefined
    ? true
    : globalEnv.wsConfig.loadCss);
const IGNORE_MODULE = 'SBIS3.CONTROLS';

/**
 * Старые страницы хранят имя темы в wsConfig.themeName
 * Достаём из конфигурации тему. Если конфигурация отсутствует или
 * отсутствует свойство themeName, значит считаем, что работаем с онлайном и
 * позволяем грузить онлайновские контролы.
 * @param name Имя модуля
 */
function resolveSuffix(name: string) {
    return globalEnv.wsConfig?.themeName && name === IGNORE_MODULE;
}

/**
 * Загружает и дефанит модули с именем css!${ModuleName}
 * @param module Модуль
 * @param buildUrl Функция для формирования URL
 * @param crossOrigin Являеться запрос cross origin
 */
export default async function (
    defineName: string,
    filePath: string,
    context: WebRequire
): Promise<unknown> {
    if (disableLoadCss || resolveSuffix(context.getRootDir(filePath))) {
        return null;
    }

    const url = context.buildUrl(filePath, 'css');

    try {
        await context.loader.link(url);

        return null;
    } catch (err) {
        throw new RequireError(`Failed to load CSS module "${defineName}" file by url "${url}".`, {
            cause: err as Error,
            type: 'load',
        });
    }
}
