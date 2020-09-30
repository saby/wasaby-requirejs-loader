import {IRequireContext, IRequireExt, IRequireMapExt} from '../require.ext';
import IModulesManager from './IModulesManager';
import IModulesManagerSync from './IModulesManagerSync';
import IModulesHandler, { ModuleLoadCallback } from './IModulesHandler';
import undefineAncestors from '../_extras/undefineAncestors';

type OnResourceLoadCallback = typeof require.onResourceLoad;

/**
 * Менеджер модулей на основе RequireJS
 */
export default class ModulesManager implements IModulesManager, IModulesManagerSync, IModulesHandler {
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
            this.loader(modules, (...loadedModules) => {
                resolve(loadedModules as unknown as T);
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

    // region IModulesHandler

    onModuleLoaded<T>(callback: ModuleLoadCallback<T>): void {
        this._moduleLoadCallbacks.push(callback);
        this._setModuleLoadHook();
    }

    offModuleLoaded<T>(callback: ModuleLoadCallback<T>): void {
        this._moduleLoadCallbacks = this._moduleLoadCallbacks.filter((foundCallback) => foundCallback !== callback);
        if (this._moduleLoadCallbacks.length === 0) {
            this._unsetModuleLoadHook();
        }
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
            const moduleId = map.id;
            const exports = context.defined[moduleId];
            this._moduleLoadCallbacks.forEach((callback) => {
                const overrided = callback(moduleId, exports);
                if (overrided !== undefined) {
                    context.defined[moduleId] = overrided;

                    const mod = context.registry[moduleId];
                    if (mod) {
                        mod.exports = overrided;
                    }
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
    protected _unsetModuleLoadHook(): void {
        if (!this._onModuleLoad) {
            return;
        }

        this.loader.onResourceLoad = this._onModuleLoad[0];
        this._onModuleLoad = null;
    }
}
