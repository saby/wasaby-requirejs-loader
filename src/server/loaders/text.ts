/**
 * Серверный загрузчик для текстовых данных
 * @author Кудрявцев И.С.
 */
import type Module from '../../server/Module';
import { IModuleInfo } from '../../main/BaseRequire';
import loadString from './loadString';

/**
 * Загружает модули с именем text!${ModuleName}
 * @param module Модуль
 * @param buildPath Функция для формирования пути до файла
 */
export default function (module: Module, { buildPath }: IModuleInfo): void {
    const splitName = module.path.split('.');
    const ext = splitName.pop() as string;
    const path = splitName.join('.');

    module.url = buildPath(path, ext);

    const result = loadString(module.url);

    module.define([], () => result);
}
