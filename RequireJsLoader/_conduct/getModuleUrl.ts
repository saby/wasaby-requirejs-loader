/**
 * @module
 * @public
 */
import getResourceUrl from './getResourceUrl';
import { getWsConfig, getDirection, getRequireJsPaths } from 'RequireJsLoader/config';
import { IWsConfig } from '../wasaby';

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

// расширения, которые могут быть прописаны без плагинов requirejs
const COMMON_EXTENSIONS = ['svg', 'js', 'png', 'jpg', 'css', 'woff2', 'webp'];

const REQUIRE_JS_PATHS = getRequireJsPaths();

function getModuleInfo(module: string, direction?: string): IModuleInfo {
    const plugins = module.split(/[!?]/);
    let basename = plugins.pop() || '';
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
        const fileName = basenameParts.pop() || '';
        const fileNameParts = fileName.split('.');

        // если в имени модуля имеются точки, то это может быть признаком расширения, но только
        // если это .js и .svg например, поскольку они прописываются без плагинов при загрузке
        if (fileNameParts.length === 1 || !COMMON_EXTENSIONS.includes(fileNameParts.pop() || '')) {
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

    if (plugin === 'css' && !isThirdParty) {
        if ((direction || getDirection()) === 'rtl' && basename.indexOf('.rtl') === -1) {
            basename = basename + '.rtl';
        }
    }

    return {
        plugin: plugins.join(','),
        basename,
        extension,
        isRootModule,
    };
}

// gets application root with selected url based on current meta from wsConfig
function getApplicationRoot(urlInfo: IModuleInfo, config: IWsConfig): string {
    // metaRoot is needed only for root urls, for module urls use resourceRoot as always
    if (
        config.metaRoot &&
        config.metaRoot !== '/' &&
        config.metaRoot.startsWith('/') &&
        urlInfo.isRootModule
    ) {
        return config.metaRoot.replace('resources/', '');
    }

    if (config.resourceRoot) {
        return config.resourceRoot.replace('resources/', '');
    }

    return '';
}

/**
 * Возвращает обработанный URL модуля с указанием домена и версии.
 * <h2>Пример использования</h2>
 * <pre>
 *    import { getModuleUrl } from 'RequireJsLoader/conduct';
 *
 *    // '//cdn.sbis.ru/static/resources/RequireJsLoader/testModule.min.js?x_module=714d07a54f50d933fabcd52004e2b408'
 *    console.log(getModuleUrl('RequireJsLoader/testModule'));
 * </pre>
 * Данную функцию следует применять, когда у вас есть имя модуля и вам необходимо вычислить его полный URL-адрес с указанием
 * домена и заголовков кеширования
 * заголовки версионирования и cdn-домен для правильного кеширования вашего запроса.
 * @param module Имя модуля
 * @param loader текущий загрузчик модулей(requirejs)
 * @param debugCookieValue текущее значение куки debug. Необходимо, чтобы получить url для загрузки в режиме debug.
 * @param skipDomains параметр, определяющий, проставлять ли cdn-домен в готовый URL или нет.
 * @param direction параметр, определяющий, направления контента ltr или rtl.
 * @param version параметр, определяющий, нужно ли вставлять заголовок версионирования
 * @returns обработанный URL с доменом и версией
 * @public
 */
export default function getModuleUrl(
    module: string,
    loader: Require = requirejs,
    debugCookieValue?: string,
    skipDomains?: boolean,
    direction?: string,
    version?: boolean
): string {
    const info = getModuleInfo(module, direction);
    const config = getWsConfig();
    let url = loader.toUrl(info.basename + info.extension);

    if (config.IS_BUILDER && config.APP_PATH) {
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
        typeof config.APP_PATH === 'string' &&
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

        /*
         * On a server side APP_PATH and baseUrl are equal, so a current service
         * name would be missed if APP_PATH is cut off. Therefore we should
         * add any service name but '/', use resourceRoot for it because appRoot
         * contains name of a service, when resourceRoot could contain different name
         * that uses specific static name for interface resources
         * if meta root is selected, we should cut it off instead of resourceRoot because
         * resourceRoot in this case is incorrect and cant be used for url formatting on
         * server side
         */
        if (url && config.resourceRoot !== '/' && config.resourceRoot?.startsWith('/')) {
            const applicationRoot = getApplicationRoot(info, config);

            url = `${applicationRoot}${url}`;
        }

        if (url && url[0] !== '/') {
            url = `/${url}`;
        }
    }

    return getResourceUrl(url, debugCookieValue, skipDomains, direction, version);
}
