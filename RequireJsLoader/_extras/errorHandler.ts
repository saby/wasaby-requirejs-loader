import {IRequireContext, IRequireModule, IRequireExt} from '../require.ext';
import undefineAncestors, {undefine} from './undefineAncestors';
import ILogger from './ILogger';
import {global, getInstance} from './utils';

const cssPluginPrefixLength = 4;

// Delay to limit the frequency of modules undefining
const delayForUndefine = 5000;

// The last time when failed modules have been undefined
let lastUndefineTime: number = 0;

/**
 * Undefines failed modules on error to force RequireJS try again to load them and generate that error
 */
export function undefineByError(err: RequireError | Error, require: IRequireExt = getInstance()): void {
    if ((err as RequireError).originalError) {
        undefineByError((err as RequireError).originalError, require);
    }
    if (require && (err as RequireError).requireModules instanceof Array) {
        (err as RequireError).requireModules.forEach((moduleName) => {
            require.undef(moduleName);
        });
    }
}

/**
 * Undefines modules caused an error and whole branch of other modules which recursively depend on failed modules.
 * It's necessary in SSR environment when standalone process maintains many client requests. The goal is to reproduce
 * errors on each request (ideally) to see them in logs (otherwise we have to search for first error(s) since process
 * has started).
 */
function undefineFailedAncestors(
    err: RequireError,
    context: IRequireContext,
    logger: ILogger
): void {
    // Init set of failed modules with those which were skipped last time
    const failedModules = new Set<string>();

    // Add modules from error to the set of failed
    const requireModules = err && err.requireModules;
    if (requireModules) {
        for (let i = 0; i < requireModules.length; i++) {
            failedModules.add(requireModules[i]);
        }
    }

    // Undefine set of failed modules
    failedModules.forEach((id) => {
        undefineAncestors(id, context, new Set<string>(), logger);
    });
}

/**
 * Undefines modules which are not completely loaded
 * It's necessary in SSR environment when standalone process maintains many client requests. The goals is to revive
 * failed modules within alive process when they fail because of temporary network problems. It's good to back to
 * normal when those problems will had gone.
 */
function undefineFailedChains(context: IRequireContext, logger: ILogger): void {
    // Limit the frequency of checks
    if (Date.now() < lastUndefineTime + delayForUndefine) {
        return;
    }
    lastUndefineTime = Date.now();

    // Registry contains modules "in progress" include failed with error and defined but not required
    const registry = context.registry;
    const registryNames = Object.keys(registry);

    // Lookup for extrnal modules failed with error (temporarily only NoticeCenterBase/*, NoticeCenter/*)
    const hasError = registryNames.some((moduleName) => {
        const module = registry[moduleName];
        if (!module || !module.error) {
            return false;
        }
        return  moduleName.startsWith('NoticeCenterBase/') || moduleName.startsWith('NoticeCenter/');
    });

    // If there are any modules with error try to reload the whole registry
    if (hasError) {
        registryNames.forEach((moduleName) => {
            undefine(context.require, moduleName, logger);
        });
        context.require(
            registryNames.filter((moduleName) => !moduleName.startsWith('_@r')),
            () => null,
            (err: Error) => logger.log('RequireJsLoader/extras:errorHandler->undefineFailedChains()', err.message)
        );
    }
}

const REQUIRE_TIMEOUT_TYPE = 'timeout';

/**
 * Shows alert message in browser in case of module loading error
 */
function showAlertOnTimeoutInBrowser(defaultHandler: Function): (err: RequireError) => void {
    let isFired = false;

    return (err: RequireError): void => {
        if (!err) {
            return;
        }

        if (err.requireType !== REQUIRE_TIMEOUT_TYPE) {
            return defaultHandler(err);
        }
        if (!(err.requireModules instanceof Array)) {
            return defaultHandler(err);
        }
        if (global.wsConfig && global.wsConfig.showAlertOnTimeoutInBrowser === false) {
            return defaultHandler(err);
        }

        // Ignore timeout errors for CSS
        const importantModules = err.requireModules.filter(
            (moduleName) => moduleName.substr(0, cssPluginPrefixLength) !== 'css!'
        );
        if (importantModules.length === 0) {
            return;
        }

        if (!isFired) {
            alert('Произошла ошибка загрузки ресурса. Проверьте интернет соединение и повторите попытку.');
            isFired = true;
        }

        return defaultHandler(err);
    };
}

interface IErrorHandlerOptions {
    logger: ILogger;
    undefineFailedModules?: boolean;
    showAlertOnError?: boolean;
}

const defaultOptions: IErrorHandlerOptions = {
    logger: null,
    undefineFailedModules: typeof window === 'undefined',
    showAlertOnError:  typeof window !== 'undefined'
};

/**
 * Registers RequireJS errors hooks
 */
export default function errorHandler(require: IRequireExt, initialOptions?: IErrorHandlerOptions): () => void {
    const options = {...defaultOptions, ...initialOptions};
    const defaultHandler = require.onError;
    const defaultContext = require.s && require.s.contexts._;

    let defaultGet;
    let defaultEmit;

    if (options.undefineFailedModules) {
        if (defaultContext) {
            // Capture modules emitting include dynamic modules require([...names]) calls
            defaultEmit = defaultContext.Module.prototype.emit;
            defaultContext.Module.prototype.emit = function(name: string, evt: RequireError): void {
                defaultEmit.call(this, name, evt);
                if (name === 'error') {
                    undefineFailedAncestors(evt, defaultContext, options.logger);
                } else if (name === 'defined') {
                    undefineFailedChains(defaultContext, options.logger);
                }
            };

            // Call error handler on every failed module required via require.get
            if (require.get) {
                defaultGet = require.get;
                require.get = function<T>(
                    context: IRequireContext,
                    deps: string,
                    relMap: IRequireModule,
                    localRequire: Function
                ): T {
                    const result = defaultGet.call(this, context, deps, relMap, localRequire);
                    if (typeof deps === 'string') {
                        const module = context.registry[deps];
                        if (module && module.error) {
                            return context.onError(module.error) as unknown as T;
                        }
                    }
                    return result;
                };

            }

            // Deal with unhandled errors
            require.onError = (err, errback) => {
                undefineFailedAncestors(err, defaultContext, options.logger);

                if (defaultHandler) {
                    defaultHandler(err, errback);
                }
                throw err;
            };
        }
    }

    if (options.showAlertOnError) {
        // Show UI alert on error
        require.onError = showAlertOnTimeoutInBrowser(require.onError);
    }

    return () => {
        require.onError = defaultHandler;

        if (defaultGet) {
            require.get = defaultGet;
        }

        if (defaultEmit) {
            defaultContext.Module.prototype.emit = defaultEmit;
        }
    };
}
