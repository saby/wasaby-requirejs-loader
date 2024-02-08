/**
 * kaizen_zone da98e741-0b59-480a-82b2-a83669ab3167
 */
/**
 * Autoloader of workaround provided for RequireJS
 */

import {
    errorHandler,
    hotReload,
    ILogger,
    patchDefine,
    resourceLoadHandler,
    utils,
} from './extras';

let patchApplied = false;

interface IIoC {
    resolve<T>(name: string): T;
}

// Module which supplies logger
const logSupplierModule = 'Env/Env';
const defaultLogger = console;

const logger: ILogger = {
    log(tag: string, message: string): void {
        require([logSupplierModule], ({ IoC }: { IoC: IIoC }) => {
            IoC.resolve<ILogger>('ILogger').log(tag, message);
        }, () => {
            defaultLogger.log(tag, message);
        });
    },
};

/**
 * Provides a few patches for RequireJS through official and semi-official API
 */
function autoload(): () => void {
    if (patchApplied) {
        return () => undefined;
    }
    patchApplied = true;

    const require = utils.getInstance();

    let restoreErrorHandler = require ? errorHandler(require, { logger }) : undefined;
    let restoreResourceLoadCallback = require ? resourceLoadHandler(require) : undefined;
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
        // @ts-ignore
        restoreDefine = undefined;

        restorehotReload();
        // @ts-ignore
        restorehotReload = undefined;

        patchApplied = false;
    };
}

export default autoload();
