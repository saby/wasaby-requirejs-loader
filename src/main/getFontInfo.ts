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

function detectCompatible(env?: IFontEnvironment): boolean {
    try {
        if (!env) {
            return true;
        }

        const isCEF =
            env.constants.browser.chrome &&
            env.constants.browser.userAgent.includes(CEF_CONVERTER_BROWSER_NAME);

        if (isCEF) {
            return true;
        }

        const isOldChrome =
            env.detection.chrome && env.detection.chromeVersion < OLD_VERSION_CHROME;

        if (isOldChrome) {
            return true;
        }

        return false;
    } catch {
        return true;
    }
}

export default function getFontInfo(
    filePath: string,
    env?: IFontEnvironment
): { path: string; fontFamilySpec: string } {
    const [name, requestedSize] = filePath.split('?').reverse();
    const size = FONT_SIZES.includes(requestedSize) ? requestedSize : DEFAULT_SIZE;
    const compatible = detectCompatible(env);
    const path = `${name}_${size}${compatible ? '_compatible' : ''}`;
    const family = path.slice(path.lastIndexOf('/') + 1);

    return {
        path,
        fontFamilySpec: `"${name.split('/')[0]}__${family}", "${family}"`,
    };
}
