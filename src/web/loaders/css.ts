/**
 * Браузерный загрузчик для css
 * @author Кудрявцев И.С.
 */
import type Module from '../../web/Module';
import type { IModuleInfo } from '../../main/BaseRequire';
import type { IPatchedGlobal } from 'RequireJsLoader/wasaby';
import tagLink, { detectLinks } from './tagLink';

// @ts-ignore
const globalEnv: IPatchedGlobal = globalThis;
const disableLoadCss = !(globalEnv.wsConfig?.loadCss === undefined
    ? true
    : globalEnv.wsConfig.loadCss);
const IGNORE_MODULE = 'SBIS3.CONTROLS';
const regExp = /(.min)?(.css)$/;

function defineLoadedLink(link: HTMLLinkElement) {
    const url = new URL(link.href).pathname;
    const resourcesRoot = globalEnv.wsConfig.resourceRoot || '/resources/';

    if (url.endsWith('.css') && url.startsWith(resourcesRoot)) {
        const defineName = `css!${url.replace(resourcesRoot, '').replace(regExp, '')}`;

        define(defineName, [], () => null);
    }
}

export function startWatchLinks(): void {
    detectLinks(defineLoadedLink);
}

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
    module: Module,
    { buildUrl, crossOrigin }: IModuleInfo
): Promise<void> {
    if (disableLoadCss || resolveSuffix(module.rootDir)) {
        module.define([], () => null);

        return;
    }

    module.url = buildUrl(module.path, 'css');

    await tagLink(module.url, crossOrigin);

    module.define([], () => null);
}
