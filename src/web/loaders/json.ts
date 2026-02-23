import type Module from '../../web/Module';
import type { IModuleInfo } from '../../main/BaseRequire';
import fetchLoader from './fetch';

export default async function (
    module: Module,
    { buildUrl, crossOrigin }: IModuleInfo
): Promise<void> {
    module.url = buildUrl(module.path, 'json');

    const result = JSON.parse(await fetchLoader(module.url, crossOrigin));

    module.define([], () => result);
}
