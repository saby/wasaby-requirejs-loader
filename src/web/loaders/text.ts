/**
 * Браузерный загрузчик для текстового представления
 * @author Кудрявцев И.С.
 */
import type Module from '../../web/Module';
import type ModuleInfo from '../../main/ModuleInfo';
import fetchLoader from './fetch';

/**
 * Загружает и дефанит модули с именем text!${ModuleName}
 * @param module Модуль
 * @param buildUrl Функция для формирования URL
 * @param crossOrigin Являеться запрос cross origin
 */
export default async function (
    module: Module,
    { buildUrl, crossOrigin }: ModuleInfo
): Promise<void> {
    const splitName = module.path.split('.');
    const ext = splitName.pop() as string;
    const path = splitName.join('.');

    module.url = buildUrl(path, ext);

    const result = await fetchLoader(module.url, crossOrigin);

    module.define([], () => result);
}
