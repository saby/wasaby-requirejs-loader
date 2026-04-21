/**
 * Серверный загрузчик для css
 * @author Кудрявцев И.С.
 */
import type Module from '../../main/Module';

/**
 * Загружает и дефанит модули с именем css!${ModuleName}
 * @param module Модуль
 */
export default async function (module: Module): Promise<void> {
    module.define([], () => null);
}
