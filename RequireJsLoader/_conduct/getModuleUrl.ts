import getResourceUrl from './getResourceUrl';
import { getWsConfig } from 'RequireJsLoader/config';

interface IModuleInfo {
    plugin: string;
    basename: string;
    extension: string;
}

// regex for third-party libraries
const THIRD_PARTY = /^\/(cdn|rtpack|demo_src)\//;

// list of plugins for third-party modules
const CDN_PLUGINS = ['css', 'js'];

function getModuleInfo(module: string): IModuleInfo {
    const plugins = module.split(/[!?]/);
    const basename = plugins.pop();
    const isThirdParty = THIRD_PARTY.test(basename);
    let extension = `.${plugins[0] || 'js'}`;
    if (isThirdParty) {
        if (!CDN_PLUGINS.includes(plugins[0])) {
            extension = '.js';
        }

        if (basename.endsWith(extension)) {
            extension = '';
        }
    }
    return {
        plugin: plugins.join(','),
        basename,
        extension
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
        !url.startsWith('//') &&
        url.startsWith(config.APP_PATH)
    ) {
        url = url.substr(config.APP_PATH.length);

        // remove leading slash to get correct url with appRoot without any
        // double slashes in it.
        if (url && url.startsWith('/')) {
            url = url.substr(1);
        }

        // On a server side APP_PATH and baseUrl are equal, so a current service
        // name would be missed if APP_PATH is cut off. Therefore we should
        // add any service name but '/'
        if (url && config.appRoot !== '/' &&  config.appRoot.startsWith('/')) {
            url = `${config.appRoot}${url}`;
        }
        if (url && url[0] !== '/') {
            url = `/${url}`;
        }
    }

    return getResourceUrl(url);
}
