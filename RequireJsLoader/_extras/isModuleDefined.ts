/**
 * Returns a sign that module is really defined.
 * This function aims to cover implicit RequireJS behaviour when it creates an empty object as module exports in case when
 * module uses 'exports' handler:
 * https://github.com/saby/wasaby-requirejs-loader/blob/a15a8c6126a3525682d047b858c4344319ff9607/RequireJsLoader/require.js#L586
 * It happens before module factory call therefore we can get an empty module instead of its real body.
 * @param name Module name
 */
export default function isModuleDefined(require: Require, name: string): boolean {
    if (!require.defined || !require.defined(name)) {
        return false;
    }

    const mod = require(name);

    // defined css module returns empty string as its callback
    if (name.indexOf('css!') === 0 && mod === '') {
        return true;
    }

    return mod && (typeof mod !== 'object' || Object.keys(mod).length > 0);
}
