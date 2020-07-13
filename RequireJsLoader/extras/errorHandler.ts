import {IRequire, IRequireContext, IRequireError, IRequireModule} from '../require';
import {global, getInstance} from './utils';

interface IErrLoad {
    (err: any): void;
    defaultHandler?: Function;
    isFired?: boolean;
}

const delayForUndefine = 5000;
let lastUndefinedModules: Map<string, number>;
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
export function undefineByError(err: IRequireError, require: IRequire): void {
    if (arguments.length < 2) {
        require = getInstance();
    }
    if (err.originalError) {
        undefineByError(err.originalError, require);
    }
    if (require && err.requireModules) {
        err.requireModules.forEach((moduleName) => {
            require.undef(moduleName);
        });
    }
}

/**
 * Undefines whole tree branches started from given modules list
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
 * Applies error to all ancestors of given module
 */
function undefineFailedAncestors(
    err: IRequireError,
    require: IRequire,
    context: IRequireContext
): void {
    const ids = err.requireModules;
    if (!ids || !ids.length) {
        return;
    }

    lastUndefinedModules = lastUndefinedModules || new Map<string, number>();
    skippedModules = skippedModules || new Set<string>();

    const failedModules = new Set<string>(skippedModules);
    for (let i = 0; i < ids.length; i++) {
        failedModules.add(ids[i]);
    }

    const now = Date.now();
    failedModules.forEach((id) => {
        // Here we can have multiple calls for the same modules set so let add some limitation on purpose of performance
        const lastCheck = lastUndefinedModules.get(id) || 0;
        if (now - lastCheck < delayForUndefine) {
            skippedModules.add(id);
        } else {
            skippedModules.delete(id);
            lastUndefinedModules.set(id, now);
            undefineFailedAncestorsInner(id, context, new Set<string>());
        }
    });

    undefineByError(err, require);
}

const REQUIRE_TIMEOUT_TYPE = 'timeout';

/**
 * Shows alert message in browser in case of module loading error
 */
const showAlertOnTimeoutInBrowser: IErrLoad = (err: IRequireError) => {
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
export default function errorHandler(require: IRequire, force?: boolean): () => void {
    const defaultHandler = require.onError;
    const defaultContext = require.s && require.s.contexts._;
    let defaultGet;
    let defaultEmit;

    if (force || typeof window === 'undefined') {
        // Translate error from failed module to all its ancestors
        if (defaultContext) {
            // Capture errors processed by module event handlers
            defaultEmit = defaultContext.Module.prototype.emit;
            defaultContext.Module.prototype.emit = function(name: string, evt: IRequireError): void {
                defaultEmit.call(this, name, evt);
                if (name === 'error') {
                    undefineFailedAncestors(evt, require, defaultContext);
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

            // Capture unhandled errors
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
