import errorHandler from './errorHandler';
import {ILogger} from './undefineAncestors';
import resourceLoadHandler from './resourceLoadHandler';
import patchDefine from './patchDefine';
import {getInstance} from './utils';

let patchApplied = false;
let restoreErrorHandler;
let restoreResourceLoadCallback;
let restoreDefine;

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
    if (!patchApplied) {
        patchApplied = true;

        const require = getInstance();
        if (require) {
            restoreErrorHandler = errorHandler(require, {logger});
            restoreResourceLoadCallback = resourceLoadHandler(require);
        }

        restoreDefine = patchDefine();
    }

    return () => {
        if (restoreErrorHandler) {
            restoreErrorHandler();
            restoreErrorHandler = undefined;
        }
        if (restoreResourceLoadCallback) {
            restoreResourceLoadCallback();
            restoreResourceLoadCallback = undefined;
        }
        if (restoreDefine) {
            restoreDefine();
            restoreDefine = undefined;
        }

        patchApplied = false;
    };
}

export default autoload();
