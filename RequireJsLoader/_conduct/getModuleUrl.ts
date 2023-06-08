import getResourceUrl from './getResourceUrl';
import { getWsConfig, getDirection, getRequireJsPaths } from 'RequireJsLoader/config';

interface IModuleInfo {
    plugin: string;
    basename: string;
    extension: string;
    isRootModule: boolean;
}

// regex for third-party libraries
const THIRD_PARTY = /^\/(cdn|rtpack|demo_src)\//;

// list of plugins for third-party modules
const CDN_PLUGINS = ['css', 'js'];

// fake extensions that are actually parts of a module name
// For json there is a .json.js file
const NAME_PARTS = ['compatible', 'compatibility', 'package', 'json'];

const REQUIRE_JS_PATHS = getRequireJsPaths();

function getModuleInfo(module: string, isIE: boolean, direction: string): IModuleInfo {
    const plugins = module.split(/[!?]/);
    let basename = plugins.pop();
    const basenameParts = basename.split('/');
    const isRootModule = basenameParts.length === 1 && !REQUIRE_JS_PATHS.hasOwnProperty(basename);
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
            extension = `.${plugins[0]}`;
        }
    } else {
        const fileName = basenameParts.pop();
        const fileNameParts = fileName.split('.');

        // use an actual extension only if it's not a part of current module name
        if (fileNameParts.length === 1 || NAME_PARTS.includes(fileNameParts.pop())) {
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

    const plugin = plugins.join(',');

    // add _ie postfix in all css for IE environment, except root themes css
    // because they have only css variables in itself and don't have special ie version
    if (plugin === 'css' && !isThirdParty) {
        if (isIE && !basename.startsWith('ThemesModule/') && basename.indexOf('_ie') === -1) {
            basename = basename + '_ie';
        }

        if ((direction || getDirection()) === 'rtl' && basename.indexOf('.rtl') === -1) {
            basename = basename + '.rtl';
        }
    }

    return {
        plugin: plugins.join(','),
        basename,
        extension,
        isRootModule
    };
}

// gets application root with selected url based on current meta from wsConfig
function getApplicationRoot(urlInfo, config) {
    let applicationRoot = '';
    // metaRoot is needed only for root urls, for module urls use resourceRoot as always
    if (config.metaRoot && config.metaRoot !== '/' && config.metaRoot.startsWith('/') && urlInfo.isRootModule) {
        applicationRoot = config.metaRoot.replace('resources/', '');
    } else {
        applicationRoot = config.resourceRoot.replace('resources/', '');
    }
    return applicationRoot;
}

/**
 * Возвращает URL местоположения модуля
 * @param module Имя модуля
 * @public
 */
export default function getModuleUrl(
    module: string,
    loader: Require = requirejs,
    debugCookieValue?: string,
    skipDomains?: boolean,
    isIE?: boolean,
    direction?: string
): string {
    const info = getModuleInfo(module, !!isIE, direction);
    const config = getWsConfig();
    let url = loader.toUrl(info.basename + info.extension);

    if (config.IS_BUILDER) {
        url = url.substr(config.APP_PATH.length);

        // remove leading slash to get correct url with appRoot without any
        // double slashes in it.
        if (url && url.startsWith('/')) {
            url = url.substr(1);
        }

        url = `${config.RESOURCES_PATH}${url}`;
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

        /**
         * On a server side APP_PATH and baseUrl are equal, so a current service
         * name would be missed if APP_PATH is cut off. Therefore we should
         * add any service name but '/', use resourceRoot for it because appRoot
         * contains name of a service, when resourceRoot could contain different name
         * that uses specific static name for interface resources
         * if meta root is selected, we should cut it off instead of resourceRoot because
         * resourceRoot in this case is incorrect and cant be used for url formatting on
         * server side
         */
        if (url && config.resourceRoot !== '/' &&  config.resourceRoot.startsWith('/')) {
            const applicationRoot = getApplicationRoot(info, config);
            url = `${applicationRoot}${url}`;
        }

        if (url && url[0] !== '/') {
            url = `/${url}`;
        }
    }

    return getResourceUrl(url, debugCookieValue, skipDomains);
}
