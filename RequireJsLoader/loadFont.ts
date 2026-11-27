import { Head as HeadAPI } from 'Application/Page';
import Env = require('optional!Env/Env');
import { getModuleUrl } from 'RequireJsLoader/conduct';

const CEF_CONVERTER_BROWSER_NAME = 'SbisCefConverter';
const OLD_VERSION_CHROME = 80;

const DEFAULT_SIZE = 's';
const FONT_SIZES = ['s', 'st', 'm'];

function detectSize(size?: string) {
    if (size && FONT_SIZES.indexOf(size) !== -1) {
        return size;
    }

    return DEFAULT_SIZE;
}

function isCefConverterBrowser(): boolean {
    return Env.constants.browser.chrome
        ? Env.constants.browser.userAgent.includes(CEF_CONVERTER_BROWSER_NAME)
        : false;
}

/**
 * Определяет нужно ли грузить шрифты совместимости.
 */
export function isCompatibleMode(): boolean {
    try {
        return (
            isCefConverterBrowser() ||
            (Env.detection.chrome && Env.detection.chromeVersion < OLD_VERSION_CHROME)
        );
    } catch (e) {
        return true;
    }
}

function getResourcesPaths(name: string, size: string): string[] {
    const nameFont = isCompatibleMode() ? `${name}_${size}_compatible` : `${name}_${size}`;

    return [getModuleUrl(`${nameFont}.woff2`), getModuleUrl(`${nameFont}.css`), nameFont];
}

/**
 * Функция загрузку шрифта.
 * @param name Имя шрифта. Пример, Controls-icons/actions
 * @param size Размер шрифта.
 * @param onLoad Колбек на успешную загрузку.
 * @param onError Колбек на ошибку.
 */
export default function loadFont(
    name: string,
    size?: string,
    onLoad?: () => void,
    onError?: (err: Error) => void
): void {
    const callback = onLoad || (() => {});
    const [fontHref, cssHref, nameFont] = getResourcesPaths(name, detectSize(size));

    if (typeof window !== 'undefined') {
        require([`css!${nameFont}`], () => {
            const family = nameFont.slice(nameFont.lastIndexOf('/') + 1);
            const fontFamily = `${name.split('/')[0]}__${family}`;

            // в JSDOM нет реализации fonts на документе,
            // если кто-то в тестах попытается загузить шрифт в окружении JSDOM
            // то такой тест упадет
            const fonts = document.fonts;
            if (!fonts) {
                onError?.(new Error('Font Loading API is unavailable'));
                return;
            }

            fonts.load(`16px "${fontFamily}"`).then(callback, onError);
        }, onError || (() => {}));
        return;
    }

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
