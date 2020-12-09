import { IRequireContext, IRequireExt, IRequireMapExt } from '../require.ext';
import IModulesManager from './IModulesManager';
import IModulesManagerSync from './IModulesManagerSync';
import IModulesHandler, { ModuleLoadCallback } from './IModulesHandler';
import isModuleDefined from './isModuleDefined';
import { undefineAncestors } from '../extras';
import { handlers } from 'RequireJsLoader/config';

type OnResourceLoadCallback = typeof require.onResourceLoad;

interface IOptions {
    loader?: Require;
    urlModifier?: (url: string) => string;
}

/**
 * Менеджер модулей на основе RequireJS
 */
export default class ModulesManager implements IModulesManager, IModulesManagerSync, IModulesHandler {
    protected _moduleLoadCallbacks: Array<ModuleLoadCallback<unknown>> = [];

    protected _onModuleLoad: [OnResourceLoadCallback];

    protected _loader: Require;

    protected _urlModifier: (url: string) => string;

    /**
     * Конструктор
     * @param options Опции
     */
    constructor(options: IOptions | Require = {}) {
        this._loader = (options as IOptions).loader || requirejs;

        if ((options as IOptions).urlModifier) {
            handlers.getWithUserDefined = (options as IOptions).urlModifier;
        }
    }

    // region IModulesManager

    isLoaded(module: string): boolean {
        return isModuleDefined(this._loader, module);
    }

    load<T>(modules: string[]): Promise<T> {
        return new Promise((resolve, reject) => {
            this._loader(modules, (...loadedModules) => {
                resolve(loadedModules as unknown as T);
            }, (err) => {
                modules.forEach((name) => {
                    this._loader.undef(name);
                });

                reject(err);
            });
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
        return this._loader(module);
    }

    unloadSync(module: string): void {
        const defaultContext: IRequireContext = (this._loader as IRequireExt).s.contexts._;
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

        const originalLoad = this._loader.onResourceLoad;

        this._loader.onResourceLoad = (context: IRequireContext, map: IRequireMapExt, depArray: RequireMap[]) => {
            const moduleId = map.id;
            const exports = context.defined[moduleId];
            this._moduleLoadCallbacks.forEach((callback) => {
                const overrided = callback(moduleId, exports);
                if (overrided !== undefined) {
                    context.defined[moduleId] = overrided;

                    const mod = context.registry[moduleId];
                    if (mod) {
                        mod.exports = overrided as object;
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

        this._loader.onResourceLoad = this._onModuleLoad[0];
        this._onModuleLoad = null;
    }
}
