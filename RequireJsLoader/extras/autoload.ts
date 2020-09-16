import errorHandler from './errorHandler';
import resourceLoadHandler from './resourceLoadHandler';
import patchDefine from './patchDefine';
import {getInstance} from './utils';
import ILogger from './ILogger';
export * from './dynamicConfig';

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

        patchApplied = false;
    };
}

export default autoload();
