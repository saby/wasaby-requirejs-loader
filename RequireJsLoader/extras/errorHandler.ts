import {IRequireContext, IRequireModule, IRequireExt} from '../require.ext';
import {global, getInstance} from './utils';

interface IErrLoad {
    (err: any): void;
    defaultHandler?: Function;
    isFired?: boolean;
}

// Delay to limit the frequency of modules undefining
const delayForUndefine = 5000;
// The map which holds the last time when certain module has been undefined
let lastUndefinedModules: Map<string, number>;
// The set of modules id which have failed with error but haven't been undefined due to frequency limitation
let skippedModules: Set<string>;

/**
 * Returns module ids which depend on module with given id
 */
function getParents(id: string, context: IRequireContext): string[] {
    const registry = context.registry;
    return Object.keys(registry).filter((name) => {
        const module = registry[name];
        const depMaps = module.depMaps;
        return depMaps && depMaps.some((depModule) => depModule.id === id);
    });
}

/**
 * Undefines failed modules on error to force RequireJS try again to load them and generate that error
 */
export function undefineByError(err: RequireError | Error, require: IRequireExt): void {
    if (arguments.length < 2) {
        require = getInstance();
    }
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
 * Undefines whole tree branch started from given modules list
 */
function undefineFailedAncestorsInner(
    id: string,
    context: IRequireContext,
    processed: Set<string>
): void {
    if (processed.has(id)) {
        return;
    }
    processed.add(id);

    getParents(id, context).forEach((parentId) => {
        undefineFailedAncestorsInner(
            parentId,
            context,
            processed
        );
    });

    context.require.undef(id);
}

/**
 * * Undefines modules caused an error and whole branch of other modules which recursively depend on failed modules.
 * It's necessary in SSR environment when standalone process maintains many client requests. The goals are:
 * 1. To reproduce errors on each request (ideally) to see them in logs (otherwise we have to search for first error(s) since process has started).
 * 2. To revive failed modules within alive process when they fail because of temporary network problems. It's good to back to normal when those problems will had gone.
 */
function undefineFailedAncestors(
    err: RequireError,
    require: IRequireExt,
    context: IRequireContext
): void {
    // Init the map with modules last undefine time
    lastUndefinedModules = lastUndefinedModules || new Map<string, number>();
    // Init the set of modules id which failed with error but were skipped from undefine
    skippedModules = skippedModules || new Set<string>();

    // Init set of failed modules with those which were skipped last time
    const failedModules = new Set<string>(skippedModules);

    // Add modules from error to the set of failed
    const requireModules = err && err.requireModules;
    if (requireModules) {
        for (let i = 0; i < requireModules.length; i++) {
            failedModules.add(requireModules[i]);
        }
    }

    // Undefine set of failed modules
    const now = Date.now();
    failedModules.forEach((id) => {
        // Add some limitation on purpose of performance
        const lastCheck = lastUndefinedModules.get(id) || 0;
        if (now - lastCheck < delayForUndefine) {
            // Skip this time and do it later
            skippedModules.add(id);
        } else {
            skippedModules.delete(id);
            lastUndefinedModules.set(id, now);
            undefineFailedAncestorsInner(id, context, new Set<string>());
        }
    });

    // In case of error also undefine failed modules in general manner
    if (requireModules) {
        undefineByError(err, require);
    }
}

const REQUIRE_TIMEOUT_TYPE = 'timeout';

/**
 * Shows alert message in browser in case of module loading error
 */
const showAlertOnTimeoutInBrowser: IErrLoad = (err: RequireError) => {
    if (!err) {
        return;
    }

    const defaultHandler = showAlertOnTimeoutInBrowser.defaultHandler;

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
    const importantModules = err.requireModules.filter((moduleName) => moduleName.substr(0, 4) !== 'css!');
    if (importantModules.length === 0) {
        return;
    }

    if (!showAlertOnTimeoutInBrowser.isFired) {
        alert('Произошла ошибка загрузки ресурса. Проверьте интернет соединение и повторите попытку.');
        showAlertOnTimeoutInBrowser.isFired = true;
    }

    return defaultHandler(err);
};

/**
 * Registers RequireJS errors hooks
 */
export default function errorHandler(require: IRequireExt, force?: boolean): () => void {
    const defaultHandler = require.onError;
    const defaultContext = require.s && require.s.contexts._;
    let defaultGet;
    let defaultEmit;

    if (force || typeof window === 'undefined') {
        // Translate error from failed module to all its ancestors
        if (defaultContext) {
            // Capture errors processed by module event handlers include dynamic modules require([...names]) calls
            defaultEmit = defaultContext.Module.prototype.emit;
            defaultContext.Module.prototype.emit = function(name: string, evt: RequireError): void {
                defaultEmit.call(this, name, evt);
                if (name === 'error') {
                    undefineFailedAncestors(evt, require, defaultContext);
                } else if (name === 'defined') {
                    undefineFailedAncestors(null, require, defaultContext);
                }
            };

            // Call error handler on every failed module required via require.get
            if (require.get) {
                defaultGet = require.get;
                require.get = function(
                    context: IRequireContext,
                    deps: string,
                    relMap: IRequireModule,
                    localRequire: Function
                ): any {
                    const result = defaultGet.call(this, context, deps, relMap, localRequire);
                    if (typeof deps === 'string') {
                        const module = context.registry[deps];
                        if (module && module.error) {
                            return context.onError(module.error);
                        }
                    }
                    return result;
                };

            }

            // Deal with unhandled errors
            require.onError = (err, errback) => {
                undefineFailedAncestors(err, require, defaultContext);

                if (defaultHandler) {
                    defaultHandler(err, errback);
                }
                throw err;
            };
        }
    } else {
        // Show UI notification in browser
        showAlertOnTimeoutInBrowser.defaultHandler = defaultHandler;
        require.onError = showAlertOnTimeoutInBrowser;
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
