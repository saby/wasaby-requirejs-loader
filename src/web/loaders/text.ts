import type Module from '../../web/Module';
import { IModuleInfo } from '../../main/BaseRequire';
import fetchLoader from './fetch';

export default async function (
    module: Module,
    { buildUrl, crossOrigin }: IModuleInfo
): Promise<void> {
    const splitName = module.path.split('.');
    const ext = splitName.pop() as string;
    const path = splitName.join('.');

    module.url = buildUrl(path, ext);

    const result = await fetchLoader(module.url, crossOrigin);

    module.define([], () => result);
}
