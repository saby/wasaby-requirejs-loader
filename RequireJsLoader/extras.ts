/**
 * Library that provides extra functionalities for RequireJS
 * @library RequireJsLoader/extras
 */

import errorHandler from './_extras/errorHandler';
import resourceLoadHandler from './_extras/resourceLoadHandler';
import patchDefine from './_extras/patchDefine';
import hotReload from './_extras/hotReload';
import {getInstance} from './_extras/utils';
import ILogger from './_extras/ILogger';
import './_extras/dynamicConfig';

let patchApplied = false;

interface IIoC {
    resolve<T>(name: string): T;
}

// Module which supplies logger
const logSupplierModule = 'Env/Env';
const defaultLogger = console;

const logger: ILogger = {
    log(tag: string, message: string): void {
        import(logSupplierModule).then(({IoC}: {IoC: IIoC}) => {
            IoC.resolve<ILogger>('ILogger').log(tag, message);
        }).catch(() => {
            defaultLogger.log(tag, message);
        });
    }
};

/**
 * Provides a few patches for RequireJS through official and semi-official API
 * @author Мальцев А.А.
 */
function autoload(): () => void {
    if (patchApplied) {
        return () => undefined;
    }
    patchApplied = true;

    const require = getInstance();

    let restoreErrorHandler = require ? errorHandler(require, {logger}) : null;
    let restoreResourceLoadCallback = require ? resourceLoadHandler(require) : null;
    let restoreDefine = patchDefine();
    let restorehotReload = hotReload(logger);

    return () => {
        if (restoreErrorHandler) {
            restoreErrorHandler();
            restoreErrorHandler = undefined;
        }

        if (restoreResourceLoadCallback) {
            restoreResourceLoadCallback();
            restoreResourceLoadCallback = undefined;
        }

        restoreDefine();
        restoreDefine = undefined;

        restorehotReload();
        restorehotReload = undefined;

        patchApplied = false;
    };
}

export default autoload();

export {patchDefine};
