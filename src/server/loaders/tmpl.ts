/**
 * Серверный загрузчик для tmpl
 * @author Кудрявцев И.С.
 */
import type Module from '../../server/Module';
import type { IRequire } from '../../main/BaseRequire';
import type ModuleInfo from '../../main/ModuleInfo';
import wmlLoader from './wml';

/**
 * Загружает модули с именем tmpl!${ModuleName}
 * @param module Модуль
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context Require
 */
export default function (module: Module, moduleInfo: ModuleInfo, context: IRequire<Module>): void {
    return wmlLoader(module, moduleInfo, context, 'tmpl', [
        'is!compatibleLayer?Lib/Control/Control.compatible',
        'is!compatibleLayer?Lib/Control/AreaAbstract/AreaAbstract.compatible',
    ]);
}
