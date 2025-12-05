import type Module from '../../server/Module';
import type { IModuleInfo } from '../../main/BaseRequire';
import loadString from './loadString';

export default function (module: Module, { buildPath }: IModuleInfo): void {
    module.url = buildPath(module.path, 'json');

    const result = JSON.parse(loadString(module.url));

    module.define([], () => result);
}
