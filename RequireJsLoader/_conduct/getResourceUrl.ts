import {handlers} from 'RequireJsLoader/config';

/**
 * Возвращает обработанный URL ресурса с указанием домена и версии.
 * <h2>Пример использования</h2>
 * <pre>
 *    import { getResourceUrl } from 'RequireJsLoader/conduct';
 *
 *    // '//cdn.sbis.ru/RequireJsLoader/conduct.min.js?x_module=21.2220-75'
 *    console.log(getResourceUrl('/RequireJsLoader/conduct.js'));
 * </pre>
 * @param {string} url URL для обработки
 * @returns {string} обработанный URL с доменом и версией
 * @author Колбешин Ф.А.
 * @public
 */
export default function getResourceUrl(url: string, debugCookieValue?: string, skipDomains?: boolean): string {
    return handlers.getWithDomain(
        handlers.getWithSuffix(
            handlers.getWithVersion(url),
            debugCookieValue
        ),
        skipDomains
    );
}
