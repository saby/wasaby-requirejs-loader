/**
 * Library that provides extra functionalities for RequireJS
 * @library
 * @public
 * @module
 */

import errorHandler, { undefineByError, IErrorHandlerOptions } from './_extras/errorHandler';
import resourceLoadHandler from './_extras/resourceLoadHandler';
import hotReload from './_extras/hotReload';
import ILogger from './_extras/ILogger';
import patchDefine, { checkCircularDependencies } from './_extras/patchDefine';
import undefineAncestors from './_extras/undefineAncestors';
import * as utils from './_extras/utils';
import './_extras/dynamicConfig';
import { default as isModuleDefined } from './_extras/isModuleDefined';

export {
    checkCircularDependencies,
    errorHandler,
    hotReload,
    ILogger,
    patchDefine,
    resourceLoadHandler,
    IErrorHandlerOptions,
    undefineAncestors,
    undefineByError,
    utils,
    isModuleDefined,
};
