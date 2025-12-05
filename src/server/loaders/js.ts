import type Module from '../../server/Module';
import type { IModuleInfo } from '../../main/BaseRequire';

import importSript from './importScript';

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
];

export default (module: Module, { buildPath }: IModuleInfo) => {
    module.url = buildPath(module.path, 'js');

    importSript(module.url);

    if (filesOfWithoutDdefine.includes(module.name)) {
        module.define([], () => null);
    }
};
