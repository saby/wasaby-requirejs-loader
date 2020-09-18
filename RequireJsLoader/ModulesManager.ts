import {IRequireContext, IRequireExt, IRequireMapExt} from './require.ext';
import IModulesManager, { ModuleLoadCallback } from './IModulesManager';
import IModulesManagerSync from './IModulesManagerSync';
import undefineAncestors from './extras/undefineAncestors';

type OnResourceLoadCallback = typeof require.onResourceLoad;

/**
 * Менеджер модулей на основе RequireJS
 */
export default class ModulesManager implements IModulesManager, IModulesManagerSync {
    protected _moduleLoadCallbacks: Array<ModuleLoadCallback<unknown>> = [];

    protected _onModuleLoad: [OnResourceLoadCallback];

    /**
     * Конструктор
     * @param loader Корневой экземпляр RequireJS
     */
    constructor(protected loader: Require = requirejs) {
    }

    // region IModulesManager

    isLoaded(module: string): boolean {
        return this.loader.defined(module);
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
                modules.forEach((module) => this.unloadSync(module));
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

    // endregion

    // region IModulesManagerSync

    loadSync<T>(module: string): T {
        return this.loader(module);
    }

    unloadSync(module: string): void {
        const defaultContext: IRequireContext = (this.loader as IRequireExt).s.contexts._;
        const processed = new Set<string>();

        undefineAncestors(module, defaultContext, processed, console);
    }

    // endregion

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
                const overrided = callback(moduleName, exports);
                if (overrided !== undefined) {
                    context.defined[map.id] = overrided;
                }
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
