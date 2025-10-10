import { IRequireExt } from '../requireTypes';

/**
 * Returns a sign that module is really defined.
 * This function aims to cover implicit RequireJS behaviour when it creates an empty object as module exports in case when
 * module uses 'exports' handler:
 * https://github.com/saby/wasaby-requirejs-loader/blob/a15a8c6126a3525682d047b858c4344319ff9607/RequireJsLoader/require.js#L586
 * It happens before module factory call therefore we can get an empty module instead of its real body.
 * @param name Module name
 */
export default function isModuleDefined(require: IRequireExt | Require, name: string): boolean {
    if (!require.defined) {
        return false;
    }

    let mod;

    // если мы смогли получить доступ к контексту require, вытаскиваем проверяемый модуль
    // напрямую из кеша require вместо того, чтобы вызывать синхронный require, потому что
    // при тысячах вызовов метода isModuleDefined синхронный require очень дорогой по времени
    // исполнения
    if ('s' in require) {
        const context = require.s.contexts._;
        mod = context.defined[name];
    } else {
        // сначала проверим, был ли данный модуль задефайнен, данная проверка быстрее, чем
        // синхронный require
        if (!require.defined(name)) {
            return false;
        }

        // если модуль был задефайнен, нам нужно получить его содержимое, чтобы проверить, что
        // модуль был не просто задефайнен, а ещё и исполнен, поскольку require сперва пишет
        // пустой обьект в свой кеш, а содержимое этого модуля будет исполнено и записано в
        // кеш позже.
        mod = require(name);
    }

    // defined css module returns empty string as its callback
    if (name.indexOf('css!') === 0 && mod === '') {
        return true;
    }

    return !!mod && (typeof mod !== 'object' || Object.keys(mod).length > 0);
}
