import errorHandler from './errorHandler';
import resourceLoadHandler from './resourceLoadHandler';
import patchDefine from './patchDefine';
import {getInstance} from './utils';

let patchApplied = false;
let restoreErrorHandler;
let restoreResourceLoadCallback;
let restoreDefine;

/**
 * Provides a few patches for RequireJS through official and semi-official API
 * @author Мальцев А.А.
 */
function autoload(force?: boolean): () => void {
    if (!patchApplied) {
        patchApplied = true;

        const require = getInstance();
        if (require) {
            restoreErrorHandler = errorHandler(require, force);
            restoreResourceLoadCallback = resourceLoadHandler(require, force);
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
