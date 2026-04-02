/**
 * Браузерный загрузчик для tmpl
 * @author Кудрявцев И.С.
 */
import type Module from '../../web/Module';
import type { IModuleInfo, IRequire } from '../../main/BaseRequire';
import wmlLoader from './wml';

/**
 * Загружает и дефанит модули с именем tmpl!${ModuleName}
 * @param module Модуль
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context Require
 */
export default function (
    module: Module,
    moduleInfo: IModuleInfo,
    context: IRequire<Module>
): Promise<void> {
    return wmlLoader(module, moduleInfo, context, 'tmpl', [
        'is!compatibleLayer?Lib/Control/Control.compatible',
        'is!compatibleLayer?Lib/Control/AreaAbstract/AreaAbstract.compatible',
    ]);
}
