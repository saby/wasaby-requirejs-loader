import { IRequireExt } from '../require.ext';

interface IModuleInfo {
    plugin: string;
    basename: string;
    extension: string;
}

function getModuleInfo(module: string): IModuleInfo {
    const plugins = module.split(/[!?]/);
    const basename = plugins.pop();
    return {
        plugin: plugins.join(','),
        basename,
        extension: '.' + (plugins[0] || 'js')
    };
}

/**
 * Возвращает URL местоположения модуля
 * @param module Имя модуля
 * @public
 */
export default function getModuleUrl(module: string, loader: Require = requirejs): string {
    const info = getModuleInfo(module);
    return loader.toUrl(info.basename + info.extension);
}
