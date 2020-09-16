import {IRequireContext, IRequireExt, IRequireMapExt} from './require.ext';
import IModulesManager, { ModuleLoadCallback } from './IModulesManager';
import undefineAncestors from './extras/undefineAncestors';

type OnResourceLoadCallback = typeof require.onResourceLoad;

/**
 * Менеджер модулей на основе RequireJS
 */
export default class ModulesManager implements IModulesManager {
    protected _moduleLoadCallbacks: Array<ModuleLoadCallback<unknown>> = [];

    protected _onModuleLoad: [OnResourceLoadCallback];

    /**
     * Конструктор
     * @param loader Корневой экземпляр RequireJS
     */
    constructor(protected loader: IRequireExt = requirejs as IRequireExt) {
    }

    load<T>(modules: string[]): Promise<T> {
        return new Promise((resolve, reject) => {
            this.loader(modules, (loadedModules) => {
                resolve(loadedModules);
            }, reject);
        });
    }

    unload(modules: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const defaultContext: IRequireContext = this.loader.s.contexts._;
                const processed = new Set<string>();

                modules.forEach((module) => {
                    undefineAncestors(module, defaultContext, processed, console);
                });
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    onModuleLoaded<T>(callback: ModuleLoadCallback<T>): void {
        this._moduleLoadCallbacks.push(callback);
        this._setModuleLoadHook();
    }

    offModuleLoaded<T>(callback: ModuleLoadCallback<T>): void {
        this._moduleLoadCallbacks = this._moduleLoadCallbacks.filter((foundCallback) => foundCallback !== callback);
        if (this._moduleLoadCallbacks.length === 0) {
            this._removeModuleLoadHook();
        }
    }

    /**
     * Sets a hook to the RequireJS to catch loaded modules
     */
    protected _setModuleLoadHook(): void {
        if (this._onModuleLoad) {
            return;
        }

        const originalLoad = this.loader.onResourceLoad;

        this.loader.onResourceLoad = (context: IRequireContext, map: IRequireMapExt, depArray: RequireMap[]) => {
            const exports = context.defined[map.id];
            const moduleName = map.name;
            this._moduleLoadCallbacks.forEach((callback) => {
                callback(moduleName, exports);
            });

            if (originalLoad) {
                originalLoad(context, map, depArray);
            }
        };

        this._onModuleLoad = [originalLoad];
    }

    /**
     * Removes a hook from RequireJS
     */
    protected _removeModuleLoadHook(): void {
        if (!this._onModuleLoad) {
            return;
        }

        this.loader.onResourceLoad = this._onModuleLoad[0];
        this._onModuleLoad = null;
    }
}
