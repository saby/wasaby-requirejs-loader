import {IRequireExt} from '../require.ext';
import {IPatchedGlobal} from '../wasaby';

export const global = (function(): IPatchedGlobal {
    // tslint:disable-next-line:ban-comma-operator
    return this || (0, eval)('this');
}());

/**
 * Returns global RequireJS instance
 */
export function getInstance(): IRequireExt {
    return global.requirejs;
}

/**
 * Returns UI module name from AMD module name
 * @param inititalAmdModuleName Module name in AMD format
 * @param removePlugin Remove plugin names from module name
 */
export function getInterfaceModuleName(inititalAmdModuleName: string, removePlugin?: boolean): string {
    let amdModuleName = inititalAmdModuleName;
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
