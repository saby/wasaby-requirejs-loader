import type Module from '../../web/Module';
import type { IModuleInfo, IRequire } from '../../main/BaseRequire';
import wmlLoader from './wml';

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
