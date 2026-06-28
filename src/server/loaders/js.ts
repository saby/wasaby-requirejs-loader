/**
 * Серверный загрузчик для JS
 * @author Кудрявцев И.С.
 */
import type Module from '../../server/Module';
import type ModuleInfo from '../../main/ModuleInfo';

declare function importScripts(url: string): void;

let load: (module: Module) => void;

const filesOfWithoutDefine = [
    '/cdn/Punycode/1.0.0/punycode.js',
    '/cdn/JQuery/jquery-cookie/04-04-2014/jquery-cookie-min.js',
    '/cdn/JQuery/jquery-ui/1.12.1.3/jquery-ui-position-min.js',
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

if (typeof importScripts !== 'undefined') {
    load = (module) => {
        importScripts(module.url);

        if (!module.defined && filesOfWithoutDefine.includes(module.name)) {
            module.define([], () => null);
        }
    };
} else {
    const nodeRequire = require;

    load = (module) => {
        let result;

        try {
            result = nodeRequire(module.url);
        } catch (err) {
            try {
                // Если мы не смогли получить файл по вычисленому пути,
                // возможно это чисто node-ая зависимость, попробуем зарейкварить её по имени.
                result = nodeRequire(module.name);
            } catch (_e) {
                throw err;
            }
        }

        if (!module.defined) {
            module.exports = result;
            module.prepareExports();
            module.defined = true;
        }
    };
}

/**
 * Загружает модули с именем ${ModuleName}
 * @param module Модуль
 * @param buildPath Функция для формирования пути до файла
 */
export default (module: Module, { buildPath }: ModuleInfo) => {
    module.url = buildPath(module.path, 'js');

    load(module);
};
