// Extensions for @types/requirejs

/**
 * @public
 */
export type ContextEnableFunction = (depMap: IRequireModule) => void;

/**
 * @public
 */
export type OnResourceLoadCallback = (
    context: IRequireContext,
    map: IRequireMapExt,
    depArray: RequireMap[]
) => void;

/**
 * @public
 */
export interface IPluginLoadFunction {
    (module: unknown): void;
    error(err: Error): void;
}

/**
 * @public
 */
export interface IXhrRequireError extends RequireError {
    xhr: XMLHttpRequest;
}

/**
 * @public
 */
export interface ITensorFunction extends Function {
    _moduleName?: string;
    _isPrivateModule?: boolean;
}

/**
 * @public
 */
export interface IRequireMapExt extends RequireMap {
    id: string;
}

/**
 * @public
 */
export interface IRequireModule {
    id: string;
}

/**
 * @public
 */
export interface IRequireModuleHolder {
    emit: (name: string, evt: RequireError) => void;
}

/**
 * @public
 */
export interface IRequireModuleHolderConstructor {
    prototype: IRequireModuleHolder;
    new (): IRequireModuleHolder;
}

/**
 * @public
 */
export interface IRegistryModule {
    depMaps: string[] | IRequireMapExt[];
    error?: RequireError;
    exports: object;
    factory: Function;
    map: IRequireMapExt;
}

/**
 * @public
 */
export interface IRequireContext {
    config: RequireConfig;
    defined: Record<string, unknown>;
    enable: ContextEnableFunction;
    load: (id: string, url: string, disableLoader?: boolean) => void;
    Module: IRequireModuleHolderConstructor;
    nameToUrl: (name: string, ext?: string, skipExt?: boolean) => string;
    onError: (err: RequireError, errback?: Function) => void;
    isPatchedByWs?: boolean;
    require: Require;
    registry: Record<string, IRegistryModule>;
    exec: (text: string) => unknown;
}

/**
 * @public
 */
export interface IRequireApi {
    contexts: Record<string, IRequireContext>;
}

/**
 * @public
 */
export interface IRequireExt extends Require {
    get: <T>(
        context: IRequireContext,
        deps: string,
        relMap: IRequireModule,
        localRequire: Function
    ) => T;
    isWasaby?: boolean;
    s: IRequireApi;
}

/**
 * @public
 */
export interface IDebug {
    MODULES: string[];
    EXTERNAL_MODULES_ROOT: string[];
    IS_OVERALL?: boolean;
    RESOURCE_ROOT: string | undefined;
    isEnabled(): boolean;
    isDebuggingModule(url: string): boolean;
}

/**
 * @public
 */
export interface ILoader {
    load: (name: string, require: IRequireContext, load: () => void) => void;
}

/**
 * @public
 */
export interface IRTPackage {
    MODULES_NAMES: Record<string, string> | undefined;
    getModules(): Record<string, string> | undefined;
    isPacked(moduleName: string): boolean | undefined;
}
