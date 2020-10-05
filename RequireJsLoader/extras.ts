/**
 * Library that provides extra functionalities for RequireJS
 * @library RequireJsLoader/extras
 */

import errorHandler, {undefineByError} from './_extras/errorHandler';
import resourceLoadHandler from './_extras/resourceLoadHandler';
import hotReload from './_extras/hotReload';
import ILogger from './_extras/ILogger';
import patchDefine, {checkCircularDependencies} from './_extras/patchDefine';
import * as utils from './_extras/utils';
import './_extras/dynamicConfig';

export {
    checkCircularDependencies,
    errorHandler,
    hotReload,
    ILogger,
    patchDefine,
    resourceLoadHandler,
    undefineByError,
    utils
};
