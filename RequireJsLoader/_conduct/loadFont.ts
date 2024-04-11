import { Head as HeadAPI } from 'Application/Page';
import { location } from 'Application/Env';
import { constants, detection } from 'Env/Env';
import getModuleUrl from './getModuleUrl';

const CEF_CONVERTER_BROWSER_NAME = 'SbisCefConverter';
const OLD_VERSION_CHROME = 80;

function isCefConverterBrowser(): boolean {
    return constants.browser.chrome
        ? constants.browser.userAgent.includes(CEF_CONVERTER_BROWSER_NAME)
        : false;
}

export function isCompatibleMode(): boolean {
    try {
        return (
            constants.browser.isIE ||
            location.hostname.endsWith('ie.saby.ru') ||
            location.hostname.endsWith('ie-sap.saby.ru') ||
            location.hostname.endsWith('ie-1c.saby.ru') ||
            isCefConverterBrowser() ||
            (detection.chrome && detection.chromeVersion < OLD_VERSION_CHROME)
        );
    } catch (e) {
        return true;
    }
}

function getResourcesPaths(name: string): string[] {
    const nameFont = isCompatibleMode() ? `${name}_compatible` : name;

    return [getModuleUrl(`${nameFont}.woff2`), getModuleUrl(`${nameFont}.css`)];
}

/**
 * Функция загрузку шрифта.
 * @param { String } name Имя шрифта. Пример, Controls-icons/actions
 * @param { Function } [onLoad] Колбек на успешную загрузку.
 * @param { Function } [onError] Колбек на ошибку.
 */
export default function loadFont(
    name: string,
    onLoad?: () => void,
    onError?: (err: Error) => void
): void {
    const callback = onLoad || (() => {});
    const [fontHref, cssHref] = getResourcesPaths(name);

    HeadAPI.getInstance().createTag(
        'link',
        {
            rel: 'preload',
            type: 'font/woff2',
            as: 'font',
            href: fontHref,
            crossorigin: 'anonymous',
        },
        null,
        {
            load: () => {
                HeadAPI.getInstance().createTag(
                    'link',
                    {
                        rel: 'stylesheet',
                        type: 'text/css',
                        href: cssHref,
                        crossorigin: 'anonymous',
                    },
                    null,
                    {
                        load: callback,
                        error: onError,
                    }
                );
            },
            error: onError,
        }
    );
}