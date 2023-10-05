/**
 * kaizen_zone da98e741-0b59-480a-82b2-a83669ab3167
 */
import {handlers} from 'RequireJsLoader/config';

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
 * @param {string} url URL адрес для обработки.
 * @param {string} debugCookieValue текущее значение куки debug. Необходимо, чтобы получить url для загрузки в режиме debug.
 * @param {string} skipDomains параметр, определяющий, проставлять ли cdn-домен в готовый URL или нет.
 * @param {string} isIE параметр, определяющий, что мы находимся в окружении браузера IE
 * @param {string} direction параметр, определяющий, направления контента ltr или rtl.
 * @returns {string} обработанный URL с доменом и версией
 * @public
 */
export default function getResourceUrl(
    url: string,
    debugCookieValue?: string,
    skipDomains?: boolean,
    isIE?: boolean,
    direction?: string
): string {
    return handlers.getWithDomain(
        handlers.getWithSuffix(
            handlers.getWithVersion(
                handlers.getWithResourceRoot(url)
            ),
            debugCookieValue,
            isIE,
            direction
        ),
        debugCookieValue,
        skipDomains
    );
}
