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

// fake extensions that are actually parts of a module name
// For json there is a .json.js file
const NAME_PARTS = ['package', 'json'];

function getModuleInfo(module: string): IModuleInfo {
    const plugins = module.split(/[!?]/);
    let basename = plugins.pop();
    const isThirdParty = THIRD_PARTY.test(basename);
    let extension = '';

    // if there is a plugin, get it as an extension
    if (plugins.length > 0) {
        // if there is a dot in a plugin name,
        // it's a file path that was taken by mistake
        // e.g. MyModule/file.js?someHeaders
        if (plugins[0].includes('.')) {
            basename = plugins[0];
        } else {
            extension = "." + plugins[0];
        }
    } else {
        const fileName = basename.split('/').pop();
        const basenameParts = fileName.split('.');

        // use an actual extension only if it's not a part of current module name
        if (basenameParts.length === 1 || NAME_PARTS.includes(basenameParts.pop())) {
            extension = '.js';
        }
    }
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
export default function getModuleUrl(module: string, loader: Require = requirejs, debugCookieValue?: string): string {
    const info = getModuleInfo(module);
    const config = getWsConfig();
    let url = loader.toUrl(info.basename + info.extension);

    if (config.IS_BUILDER) {
        url = url.substr(config.APP_PATH.length);

        // remove leading slash to get correct url with appRoot without any
        // double slashes in it.
        if (url && url.startsWith('/')) {
            url = url.substr(1);
        }

        url = `${config.RESOURCES_PATH}${url}`
    }

    if (
        config.IS_SERVER_SCRIPT &&
        !url.startsWith('//') &&
        url.startsWith(config.APP_PATH)
    ) {
        url = url.substr(config.APP_PATH.length);

        // cut off x_module parameter on a server side because on a server it has a global version because
        // of an absolute path to current resource.
        const versionHeaderIndex = url.indexOf('?x_module');
        if (versionHeaderIndex !== -1) {
            url = url.substr(0, versionHeaderIndex);
        }

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

    return getResourceUrl(url, debugCookieValue);
}
