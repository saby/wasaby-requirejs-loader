/**
 * Браузерный загрузчик для JS
 * @author Кудрявцев И.С.
 */
import type Module from '../../web/Module';
import type ModuleInfo from '../../main/ModuleInfo';

import tagScript, { type RequireJsScriptElement } from './tagScript';
import fetchLoader from './fetch';

const filesOfWithoutDefine = [
    '/cdn/Punycode/1.0.0/punycode.js',
    '/cdn/JQuery/jquery-cookie/04-04-2014/jquery-cookie-min.js',
    '/cdn/JQuery/jquery-ui/1.12.1.3/jquery-ui-position-min.js',
    '/cdn/JQuery/jquery-jcrop/1.0.0/jquery-Jcrop.js',
    'Controls-Calculator/_view/third-party/big',
    '/cdn/AceEditor/1.2.3/src-min/ace.js',
    '/cdn/StaffCDN/PixiSpine/v1/spine-pixi-v8.min.js',
    '/cdn/AudioPlayerCDN/libs/id3-reader/v1.0.0-patched/id3-minimized.js',
    '/cdn/Codemirror/5.58.1.15/diff-min.js',
    '/cdn/Codemirror/5.58.1.14/linters-min.js',
    'SBIS3.CONTROLS/ColorPicker/resources/colpick',
    '/cdn/BankCDN/qr-code-styling/1.5.0/source.min.js',
    '/cdn/BankCDN/21.01.21/qrcode.js',
    'SbisUI/polyfill/polyfill-ioBundle',
];

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
 * @param module Модуль
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 */
export default async function (module: Module, moduleInfo: ModuleInfo): Promise<void> {
    const { buildUrl, crossOrigin } = moduleInfo;

    module.url = buildUrl(module.path, 'js');

    try {
        await tagScript(module.url, module.name, crossOrigin);
    } catch (err) {
        eval2(await fetchLoader(module.url, crossOrigin));
    }

    if (module.defined) {
        return;
    }

    const error = errors.get(module.url);

    if (error) {
        errors.delete(module.url);

        throw error;
    }

    if (filesOfWithoutDefine.includes(module.name)) {
        module.define([], () => null);

        return;
    }
}
