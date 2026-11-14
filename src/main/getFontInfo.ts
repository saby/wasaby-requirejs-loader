export interface IFontEnvironment {
    constants: {
        browser: {
            chrome: boolean;
            userAgent: string;
        };
    };
    detection: {
        chrome: boolean;
        chromeVersion: number;
    };
}

const FONT_SIZES = ['s', 'st', 'm'];
const DEFAULT_SIZE = 's';
const OLD_VERSION_CHROME = 80;
const CEF_CONVERTER_BROWSER_NAME = 'SbisCefConverter';

export default function getFontInfo(
    filePath: string,
    env?: IFontEnvironment
): { path: string; family: string } {
    const [name, requestedSize] = filePath.split('?').reverse();
    const size = FONT_SIZES.includes(requestedSize) ? requestedSize : DEFAULT_SIZE;
    let compatible = true;

    try {
        compatible =
            (env.constants.browser.chrome &&
                env.constants.browser.userAgent.includes(CEF_CONVERTER_BROWSER_NAME)) ||
            (env.detection.chrome && env.detection.chromeVersion < OLD_VERSION_CHROME);
    } catch {
        compatible = true;
    }

    const path = `${name}_${size}${compatible ? '_compatible' : ''}`;
    const family = path.slice(path.lastIndexOf('/') + 1);

    return {
        path,
        family: name.endsWith('/common') ? `${name.split('/')[0]}__${family}` : family,
    };
}
