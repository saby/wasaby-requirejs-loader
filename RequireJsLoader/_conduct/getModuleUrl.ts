import getResourceUrl from './getResourceUrl';
import { getWsConfig } from 'RequireJsLoader/config';

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
    const config = getWsConfig();
    let url = loader.toUrl(info.basename + info.extension);

    if (
        config.IS_SERVER_SCRIPT &&
        config.APP_PATH &&
        !url.startsWith('//') &&
        url.startsWith(config.APP_PATH)
    ) {
        url = url.substr(config.APP_PATH.length);
        if (url && url[0] !== '/') {
            url = '/' + url;
        }
    }

    return getResourceUrl(url);
}
