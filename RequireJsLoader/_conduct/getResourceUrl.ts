//@ts-ignore
import {handlers} from '../config';

/**
 * Возвращает обработанный URL ресураса с указанием домена и версии.
 *
 * <h2>Параметры функции</h2>
 * <ul>
 *     <li><b>url</b> {String} - URL для обработки.</li>
 * </ul>
 * <h2>Возвращает</h2>
 * {String} обработанный URL.
 * @class RequireJsLoader/getResourceUrl
 * @public
 * @author Мальцев А.А.
 */
export default function getResourceUrl(url: string): string {
    return handlers.getWithDomain(
        handlers.getWithSuffix(
            handlers.getWithVersion(url)
        )
    );
}
