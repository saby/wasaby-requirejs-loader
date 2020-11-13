import { handlers } from 'RequireJsLoader/config';

/**
 * Возвращает обработанный URL ресураса с указанием домена и версии.
 * @param url URL для обработки
 * @public
 */
export default function getResourceUrl(url: string): string {
    return handlers.getWithDomain(
        handlers.getWithSuffix(
            handlers.getWithVersion(url)
        )
    );
}
