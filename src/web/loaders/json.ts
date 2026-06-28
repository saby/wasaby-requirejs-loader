/**
 * Браузерный загрузчик для json
 * @author Кудрявцев И.С.
 */
import type Module from '../../web/Module';
import type ModuleInfo from '../../main/ModuleInfo';
import fetchLoader from './fetch';

/**
 * Загружает и дефанит модули с именем json!${ModuleName}
 * @param module Модуль
 * @param buildUrl Функция для формирования URL
 * @param crossOrigin Являеться запрос cross origin
 */
export default async function (
    module: Module,
    { buildUrl, crossOrigin }: ModuleInfo
): Promise<void> {
    module.url = buildUrl(module.path, 'json');

    const result = JSON.parse(await fetchLoader(module.url, crossOrigin));

    module.define([], () => result);
}
