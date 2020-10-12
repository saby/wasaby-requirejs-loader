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
 * Returns a sign that module is really defined.
 * This function aims to cover implicit RequireJS behaviour when it creates an empty object as module exports in case when
 * module uses 'exports' handler:
 * https://github.com/saby/wasaby-requirejs-loader/blob/a15a8c6126a3525682d047b858c4344319ff9607/RequireJsLoader/require.js#L586
 * It happens before module factory call therefore we can get an empty module instead of its real body.
 * @param name Module name
 */
export function isModuleDefined(require: Require, name: string): boolean {
    if (!require.defined(name)) {
        return false;
    }
    const mod = require(name);

    return mod && (typeof mod !== 'object' || Object.keys(mod).length > 1);
}

/**
 * Returns UI module name from AMD module name
 * @param amdModuleName Module name in AMD format
 * @param removePlugin Remove plugin names from module name
 */
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
