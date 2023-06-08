import {IRequireExt} from '../require.ext';
import {global, getInterfaceModuleName} from './utils';
import {IContents} from '../wasaby';

interface IDependenciesMap {
    [propName: string]: string[];
}

/**
 * Need to check circular dependencies only when debug mode is on
 */
const needCheckCircularDependencies = global.wsConfig && Boolean(
    global.wsConfig.IS_OVERALL_DEBUG ||
    (global.wsConfig.DEBUGGING_MODULES && global.wsConfig.DEBUGGING_MODULES.length)
);

const moduleDependencies: Record<string, string[]> = {};

/**
 * Checks if there is a circular dependency for given module.
 * @param name Module name for RequireJS
 * @param map Module dependencies map
 * @return Circular path if detected
 */
export function getCircularDependencies(name: string, map: IDependenciesMap): string[] {
    const maxDepth = 5;

    function checkModule(module: string, path: string[]): string[] {
        if (path.length > maxDepth) {
            return;
        }

        // Check for circularity
        if (path.indexOf(module) > -1) {
            path.push(module);
            return path.slice();
        }

        path.push(module);

        // Go deep with each module dependency
        const deps = map[module];
        if (deps) {
            for (let i = 0; i < deps.length; i++) {
                const circularPath = checkModule(deps[i], path);
                if (circularPath) {
                    return circularPath;
                }
            }
        }

        path.pop();
    }

    return checkModule(name, []);
}

/**
 * Creates decorator for enable() method in given RequireJS context due the aim of collecting dependencies and control
 * circularity.
 * @param name Module name for RequireJS
 * @param dependencies Module dependencies
 */
export function checkCircularDependencies(name: string, dependencies: string[]): void {
    if (!needCheckCircularDependencies) {
        return;
    }

    if (typeof name !== 'string' || !(dependencies instanceof Array)) {
        return;
    }

    moduleDependencies[name] = dependencies.slice();

    const circularPath = getCircularDependencies(name, moduleDependencies);
    if (circularPath) {
        throw new Error(
            `Circular dependency detected for module "${name}": ${circularPath.join(' -> ')}`
        );
    }
}

/**
 * Resolves unregistered modules if they requested by foreign service
 * @param require Root RequireJS instance
 * @param modules UI modules list
 * @param name Defined module name
 * @param deps Defined module dependencies
 */
export function addForeignServiceDependencies(
    require: IRequireExt,
    modules: object,
    name: string,
    deps: string[]
): void {
    if (typeof name === 'string' && deps instanceof Array) {
        const context = require.s.contexts._;
        const paths = context.config.paths || {};
        let moduleName;
        let moduleConfig;
        let servicePath;

        // Check dependencies for unknown modules cause probably they are should be requested from foreign service
        const extraPaths = deps.map((depName: string): string => {
            // Skip service names like 'require', 'exports', 'module' etc. which don't have slash in them
            // Also skip optional modules, because it's ok if they are not available
            return depName.indexOf('/') === -1 || depName.indexOf('optional!') > -1 ?
                null :
                getInterfaceModuleName(depName, true);
        }).filter((depModuleName: string): boolean => {
            // Process only modules that are unknown
            return depModuleName && !(depModuleName in paths);
        }).reduce((memo: Record<string, string>, depModuleName: string): Record<string, string> => {
            let result = memo;

            // Resolve module path relative to the requesting module
            if (moduleConfig === undefined) {
                moduleName = getInterfaceModuleName(name, true);
                moduleConfig = modules[moduleName];
                const modulePath = moduleConfig ? moduleConfig.path : '';
                servicePath = modulePath ? modulePath.substr(0, modulePath.length - moduleName.length) : '';
            }

            // Add only modules requested by foreign service
            if (moduleConfig && moduleConfig.service && servicePath) {
                result = result || {};

                const depModulePath = servicePath + depModuleName;
                result[depModuleName] = depModulePath;

                // Add UI module to the modules list
                if (!modules[depModuleName]) {
                    const depModule = {
                        initializer: name,
                        path: depModulePath,
                        service: moduleConfig.service,
                        buildnumber: undefined,
                        contextVersion: undefined
                    };
                    if (moduleConfig.buildnumber) {
                        depModule.buildnumber = moduleConfig.buildnumber;
                    }
                    if (moduleConfig.contextVersion) {
                        depModule.contextVersion = moduleConfig.contextVersion;
                    }
                    modules[depModuleName] = depModule;
                }
            }

            return result;
        }, null);

        // If there are some modules from foreign services let's add them to the config
        if (extraPaths) {
            require.config({
                paths: extraPaths
            });
        }
    }
}

let lastDefinedModule: number = 0;

/**
 * Wraps global define() function of RequireJS
 * @param require Root RequireJS instance
 * @param original Original define() function
 * @param contents Application config
 * @return Wrapped function
 */
function getPatchedDefine(require: IRequireExt, original: RequireDefine, contents: IContents): RequireDefine {
    const modules = contents && contents.modules;

    function patchedDefine(name: string, deps?: string[], callback?: Function): void {
        if (typeof name === 'string' && name) {
            lastDefinedModule = Date.now();
        }

        checkCircularDependencies(name, deps);

        if (modules && contents.buildnumber) {
            addForeignServiceDependencies(require, modules, name, deps);
        }

        // Call original define() function
        return original.call(this, name, deps, callback);
    }
    patchedDefine.amd = original.amd;

    return patchedDefine as RequireDefine;
}

export function getLastDefinedModule(): number {
    return lastDefinedModule;
}

export default function patchDefine(): () => void {
    // Patch define() function
    let defaultDefine;
    if (global.define) {
        defaultDefine = global.define;
        global.define = getPatchedDefine(global.requirejs, global.define, global.contents);
    }

    return () => {
        if (defaultDefine) {
            global.define = defaultDefine;
        }
    };
}
