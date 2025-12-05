import type { IModuleInfo } from '../../main/BaseRequire';
import type Module from '../../web/Module';

import tagScript from './tagScript';

const filesOfWithoutDdefine = [
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
];

export default async function (module: Module, moduleInfo: IModuleInfo): Promise<void> {
    const { buildUrl, crossOrigin } = moduleInfo;

    module.url = buildUrl(module.path, 'js');

    await tagScript(module.url, module.name, crossOrigin);

    if (filesOfWithoutDdefine.includes(module.name)) {
        module.define([], () => null);
    }
}
