import type { IModuleInfo, IRequire } from '../../main/BaseRequire';
import type { TLoader } from '../../main/Module';
import type Module from '../../web/Module';

import cssLoader from './css';
import jsLoader from './js';

const PACKABLE_EXTENSION = ['js', 'css', 'wml', 'tmpl', 'html'];
const BUNDLE_EXTENSION = '.package';
const BUNDLE_MAP_NAME = 'packageMap.json';

function isPackableExtension(extension: string): boolean {
    return PACKABLE_EXTENSION.includes(extension);
}

function isBundle(path: string): boolean {
    return path.endsWith(BUNDLE_EXTENSION);
}

function isBundlesMap(path: string): boolean {
    return path.endsWith(BUNDLE_MAP_NAME);
}

export default async function (
    module: Module,
    moduleInfo: IModuleInfo,
    context: IRequire<Module>,
    defaultLoader: TLoader<Promise<void>, Module>
): Promise<void> {
    if (
        isBundle(module.path) ||
        !isPackableExtension(module.extension) ||
        isBundlesMap(module.path)
    ) {
        return defaultLoader(module, moduleInfo, context);
    }

    const [maps] = (await context.require([moduleInfo.packageMap as string])) as [
        Record<string, string>,
    ];

    if (maps.hasOwnProperty(module.name)) {
        // TODO Надо чтобы билдер возрвщал без min
        const [packagePath] = maps[module.name].split('.min.');

        module.path = packagePath;

        // TODO модуль может быть упакован в пакет из другого модуля.
        //  Поэтому необхоимо взяить moduleInfo по модулю, где живёт пакет, чтобы мы корректно построили url.
        //  Кастомные пакеты должны умереть с приходом паковки по pagex.
        const packageInfo = context.modulesInfo.get(packagePath.split('/')[0]) as IModuleInfo;

        if (module.extension === 'css') {
            return cssLoader(module, packageInfo);
        }

        return jsLoader(module, packageInfo);
    }

    return defaultLoader(module, moduleInfo, context);
}
