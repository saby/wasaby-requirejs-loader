import {IRequire, IDefineFunction} from '../require';
import {IContents, IWsConfig} from '../../../_declarations';

export interface IPatchedGlobal {
    contents: IContents;
    define: IDefineFunction;
    require: IRequire;
    requirejs: IRequire;
    wsConfig: IWsConfig;
}

export interface IPatchedWindow extends Window, IPatchedGlobal {
}

export const global = (function(): IPatchedGlobal {
    // tslint:disable-next-line:ban-comma-operator
    return this || (0, eval)('this');
}());

export function getInstance(): IRequire {
    return global.requirejs;
}

// Returns UI module name from AMD module name
export function getInterfaceModuleName(amdModuleName: string, removePlugin?: boolean): string {
    if (removePlugin) {
        const pluginSeparatorPosition = amdModuleName.lastIndexOf('!');
        if (pluginSeparatorPosition !== -1) {
            amdModuleName = amdModuleName.substr(1 + pluginSeparatorPosition);

            const pluginParamsPosition = amdModuleName.indexOf('?');
            if (pluginParamsPosition !== -1) {
                amdModuleName = amdModuleName.substr(1 + pluginParamsPosition);
            }
        }
    }

    return amdModuleName.split('/')[0];
}
