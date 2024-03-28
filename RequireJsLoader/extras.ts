/**
 * Library that provides extra functionalities for RequireJS
 * @library RequireJsLoader/extras
 * @public
 */

import errorHandler, { undefineByError } from './_extras/errorHandler';
import resourceLoadHandler from './_extras/resourceLoadHandler';
import hotReload from './_extras/hotReload';
import ILogger from './_extras/ILogger';
import patchDefine, { checkCircularDependencies } from './_extras/patchDefine';
import undefineAncestors from './_extras/undefineAncestors';
import * as utils from './_extras/utils';
import './_extras/dynamicConfig';

export {
    checkCircularDependencies,
    errorHandler,
    hotReload,
    ILogger,
    patchDefine,
    resourceLoadHandler,
    undefineAncestors,
    undefineByError,
    utils,
};
