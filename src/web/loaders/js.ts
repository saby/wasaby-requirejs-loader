/**
 * Браузерный загрузчик для JS
 * @author Кудрявцев И.С.
 */
import tagScript, { type RequireJsScriptElement } from './tagScript';
import fetchLoader from './fetch';
import { DEFINE_MODULE } from '../../main/BaseRequire';
import type WebRequire from '../../WebRequire';
import RequireError from '../../main/RequireError';

// TODO https://rollupjs.org/troubleshooting/#eval2-eval
// eslint-disable-next-line no-eval
const eval2 = eval;

const errors: Map<string, Error> = new Map();

window.onerror = (message, _filename, lineno, colno, error) => {
    const script = document.currentScript as RequireJsScriptElement;

    if (script) {
        const url = script.getAttribute('src');

        if (url && error) {
            if (typeof message === 'string' && message.includes('SyntaxError')) {
                error.message = `SyntaxError: ${message};  LINE: ${lineno}: COLUM: ${colno}`;
            }

            errors.set(url, error);
        }
    }
};

/**
 * Загружает и дефанит модули с именем ${ModuleName}
 * @param fileInfo
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context
 */
export default async function (
    defineName: string,
    filePath: string,
    context: WebRequire
): Promise<unknown> {
    const url = context.buildUrl(filePath, 'js');

    try {
        try {
            await tagScript(url, defineName);
        } catch (err) {
            eval2(await fetchLoader(url));
        }

        if (context.definedMap.has(defineName)) {
            return DEFINE_MODULE;
        }

        const error = errors.get(url);

        if (error) {
            errors.delete(url);

            throw error;
        }

        return null;
    } catch (err) {
        throw new RequireError(
            `Failed to load JavaScript module "${defineName}" file by url "${url}".`,
            {
                cause: err as Error,
                type: 'load',
            }
        );
    }
}
