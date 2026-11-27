import type { IPatchedWindow } from './wasaby';
import { getModuleGraphForModule } from 'RequireJsLoader/getResourcesList';

// @ts-ignore
const globalEnv: IPatchedWindow = globalThis;

export default function (moduleName: string): boolean {
    const req = globalEnv.requirejs.instance;
    const filePath = req.getModulePath(moduleName);
    const rootDir = req.getRootDir(filePath);

    if (!req.modules.hasOwnProperty(rootDir)) {
        return false;
    }

    const moduleDeps = getModuleGraphForModule(rootDir);

    return moduleDeps.hasOwnProperty(moduleName);
}
