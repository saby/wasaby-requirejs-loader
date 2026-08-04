/**
 * @module
 * @public
 */
import { handlers } from 'RequireJsLoader/config';
import { IPatchedGlobal } from 'RequireJsLoader/wasaby';

const IS_SERVER = typeof window === undefined;
let staticDomain = '';
const META_NAME = new Set(['contents.js', 'router.js', 'contents', 'router']);

function getStaticsDomain(skipDomains?: boolean): string | undefined {
    if (skipDomains) {
        return '';
    }

    if (IS_SERVER || !staticDomain) {
        // @ts-ignore
        const globalEnv: IPatchedGlobal = globalThis;
        let domain = '';

        if (Array.isArray(globalEnv.wsConfig.staticDomains)) {
            domain = globalEnv.wsConfig.staticDomains[0];
        } else {
            // @ts-ignore
            domain = globalEnv.wsConfig.staticDomains?.domains?.[0];
        }

        staticDomain = domain ? `//${domain}` : '';
    }

    return staticDomain;
}

function buildUrl(url: string): string {
    // @ts-ignore
    const globalEnv: IPatchedGlobal = globalThis;
    const loader = globalEnv.requirejs.instance;
    const resourceRoot = globalEnv.wsConfig.resourceRoot || '/resources/';
    const defineName = loader.getDefineName(
        url.startsWith(resourceRoot) ? url.replace(resourceRoot, '') : url
    );
    const filePath = loader.getModulePath(defineName);
    const rootDir = loader.getRootDir(filePath);
    const extension = filePath.split('.').pop();

    if (rootDir === 'cdn') {
        return loader.buildUrl(filePath.replace(`.${extension}`, ''), extension);
    }

    if (loader.modules.hasOwnProperty(rootDir)) {
        // TODO совместимость под get_package у спецификаций, там суют ссылку уже с min расширением.
        const normName = filePath.replace('.min.', '.').replace(`.${extension}`, '');

        return loader.buildUrl(normName, extension);
    }

    if (META_NAME.has(defineName)) {
        return loader.buildUrl(filePath.replace(`.${extension}`, ''), extension);
    }

    const build = globalEnv?.contents?.buildnumber;

    return `${url}${build ? `?x_module=${build}` : ''}`;
}

/**
 * Возвращает обработанный URL ресурса с указанием домена и версии, при необходимости добавляет resourceRoot
 * <h2>Пример использования</h2>
 * <pre>
 *    import { getResourceUrl } from 'RequireJsLoader/conduct';
 *
 *    // '//cdn.sbis.ru/static/resources/RequireJsLoader/conduct.min.js?x_module=714d07a54f50d933fabcd52004e2b408'
 *    console.log(getResourceUrl('/RequireJsLoader/conduct.js'));
 * </pre>
 * Данную функцию следует применять, когда у вас есть URL, но требуется проставить
 * заголовки версионирования и cdn-домен для правильного кеширования вашего запроса.
 * @param url URL адрес для обработки.
 * @param debugCookieValue текущее значение куки debug. Необходимо, чтобы получить url для загрузки в режиме debug.
 * @param skipDomains параметр, определяющий, проставлять ли cdn-домен в готовый URL или нет.
 * @param direction параметр, определяющий, направления контента ltr или rtl.
 * @returns обработанный URL с доменом и версией
 * @public
 */
export default function getResourceUrl(
    url: string,
    debugCookieValue?: string,
    skipDomains?: boolean,
    direction?: string,
    version?: boolean
): string {
    // TODO Полная дикуха, но к сожалению люди реально умудрилдись на это заложитсья и передают сюда undefined.
    //  В 26.1000 после внедрения везде нового require, надо будет сносить это и идти испралять тех кто это творит.
    if (!url) {
        return url;
    }

    // @ts-ignore
    const globalEnv: IPatchedGlobal = globalThis;

    if (globalEnv.requirejs.isNewRequire) {
        const cdnRoot = globalEnv.wsConfig.cdnRoot || '/cdn/';

        // TODO Совместимость. Нам могут сунуть готовый или полуготовый url, так быть не должно,
        //  но для временой соместимости будем возращать из как есть.
        //  В 26.1000 после внедрения везде нового require, надо будет сносить это и идти испралять тех кто это творит.
        if (url.includes('//') || url.includes('?') || url.includes('#')) {
            return url;
        }

        // TODO совместимость со старым require.
        if (url.startsWith(cdnRoot) && cdnRoot !== '/cdn/') {
            return `${getStaticsDomain(skipDomains)}${url}`;
        }

        // TODO Совместимость. Оказываеться нам сюда суют даже БЛ get-запросы и мы даже им зачем-то клеим домен на статику.
        //  Пример, /disk/api/v1/***
        if (!url.includes('.')) {
            return `${getStaticsDomain(skipDomains)}${url}`;
        }

        const result = buildUrl(url);

        if (skipDomains && result.includes('//')) {
            return result.replace(/^\/\/[^\/]+/, '');
        }

        return result;
    }

    return handlers.getWithDomain(
        handlers.getWithSuffix(
            handlers.getWithVersion(handlers.getWithResourceRoot(url), version),
            debugCookieValue,
            direction
        ),
        debugCookieValue,
        skipDomains
    );
}
