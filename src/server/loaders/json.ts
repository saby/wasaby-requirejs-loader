/**
 * Серверный загрузчик для json
 * @author Кудрявцев И.С.
 */
import type Module from '../../server/Module';
import type { IModuleInfo } from '../../main/BaseRequire';
import loadString from './loadString';

/**
 * Загружает модули с именем json!${ModuleName}
 * @param module Модуль
 * @param buildPath Функция для формирования пути до файла
 */
export default function (module: Module, { buildPath }: IModuleInfo): void {
    module.url = buildPath(module.path, 'json');

    const result = JSON.parse(loadString(module.url));

    module.define([], () => result);
}
