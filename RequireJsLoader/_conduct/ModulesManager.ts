import { IRequireContext, IRequireExt, IRequireMapExt } from '../require.ext';
import IModulesManager from './IModulesManager';
import IModulesManagerSync from './IModulesManagerSync';
import IModulesHandler, { ModuleLoadCallback } from './IModulesHandler';
import { undefineAncestors, isModuleDefined } from '../extras';
import { handlers, getContents } from 'RequireJsLoader/config';

// @ts-ignore FIXME: https://online.sbis.ru/opendoc.html?guid=5f628dd9-1a60-47ac-9afe-02f54b6a138b&client=3
type OnResourceLoadCallback = typeof require.onResourceLoad;

interface IOptions {
    loader?: Require;
    urlModifier?: (url: string) => string;
}

interface ICache {
    [moduleName: string]: any;
}

const contents = getContents();
const MODULE_NAME = /^(?:\w+!(?:\w+\?)?)?([\w.-]+)(?:\/|$)/;
const REQUIREJS_ALIASES: string[] = [
    // WS.Core и WS.Deprecated могут реаквайрить по другим именам, которых нет в оглавление.
    'Core',
    'Lib',
    'Ext',
    'Helpers',
    'Transport',
    'WS',
    'Deprecated',

    // Корневые метафайлы не попадают в оглавление их придётся описать здесь.
    'router',
    'pages-info',
    'navx-towarmup-info',
    'wasaby-routes',
    'routes-info',

    // react библиотеки реквайрят по короткому имени, которых нет в оглавление.
    'react',
    'react-dom',
    'react-test-renderer',
];

function hasUrlModifier(obj: object): obj is IOptions {
    return 'urlModifier' in obj;
}

/**
 * Менеджер модулей на основе RequireJS
 * @private
 */
export default class ModulesManager
    implements IModulesManager, IModulesManagerSync, IModulesHandler
{
    protected _moduleLoadCallbacks: ModuleLoadCallback[] = [];

    protected _onModuleLoad: [OnResourceLoadCallback] | null;

    protected _loader: Require;

    protected _urlModifier: (url: string) => string;

    protected cache: ICache = {};
    /**
     * Конструктор
     * @param options Опции
     */
    constructor(options: IOptions | Require = {}) {
        this._loader = (options as IOptions).loader || requirejs;

        if (hasUrlModifier(options) && options.urlModifier) {
            handlers.getWithUserDefined = options.urlModifier;
        }
    }

    // region IModulesManager

    isLoaded(module: string): boolean {
        return isModuleDefined(this._loader, module.replace('optional!', ''));
    }

    loadModule<T>(name: string): Promise<T> {
        if (this.cache[name]) {
            return Promise.resolve(this.cache[name]);
        }

        return new Promise((resolve, reject) => {
            this._loader(
                [name],
                (...module: [T]) => {
                    this.cache[name] = module[0];

                    resolve(module[0]);
                },
                (err: Error) => {
                    this._loader.undef(name);

                    reject(err);
                }
            );
        });
    }

    load<T>(modules: string[]): Promise<T> {
        const loadingModules: Promise<T>[] = [];

        for (const moduleName of modules) {
            loadingModules.push(this.loadModule<T>(moduleName));
        }

        return Promise.all(loadingModules) as unknown as Promise<T>;
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
        const moduleName = module.replace('optional!', '');

        if (!this.cache[moduleName]) {
            this.cache[moduleName] = this._loader(moduleName);
        }

        return this.cache[moduleName];
    }

    unloadSync(module: string): void {
        const defaultContext: IRequireContext = (this._loader as IRequireExt).s.contexts._;
        const processed = new Set<string>();

        delete this.cache[module];

        undefineAncestors(
            module,
            defaultContext,
            processed,
            console,
            `Called unloadSync for module ${module}`
        );
    }

    // endregion

    // region IModulesHandler

    onModuleLoaded(callback: ModuleLoadCallback): void {
        this._moduleLoadCallbacks.push(callback);
        this._setModuleLoadHook();
    }

    offModuleLoaded(callback: ModuleLoadCallback): void {
        this._moduleLoadCallbacks = this._moduleLoadCallbacks.filter(
            (foundCallback) => foundCallback !== callback
        );

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

        this._loader.onResourceLoad = (
            context: IRequireContext,
            map: IRequireMapExt,
            depArray: RequireMap[]
        ) => {
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

    static isModule(name: string): boolean {
        if (contents && contents.modules) {
            const moduleNameMatch = name.match(MODULE_NAME);

            if (moduleNameMatch) {
                const moduleName = moduleNameMatch[1];

                return (
                    contents.modules.hasOwnProperty(moduleName) ||
                    REQUIREJS_ALIASES.includes(moduleName)
                );
            }

            return false;
        }

        return true;
    }
}
