// Extensions for @types/requirejs

export type ContextEnableFunction = (depMap: IRequireModule) => void;
export type OnResourceLoadCallback = (
    context: IRequireContext,
    map: IRequireMapExt,
    depArray: RequireMap[]
) => void;

export interface IPluginLoadFunction {
    (module: unknown): void;
    error(err: Error): void;
}

// An error with XMLHttpRequest instance injected
export interface IXhrRequireError extends RequireError {
    xhr: XMLHttpRequest;
}

export interface IRequireMapExt extends RequireMap {
    id: string;
}

export interface IRequireModule {
    id: string;
}

interface IRequireModuleHolder {
    emit: (name: string, evt: RequireError) => void;
}

interface IRequireModuleHolderConstructor {
    prototype: IRequireModuleHolder;
    new (): IRequireModuleHolder;
}

interface IRegistryModule {
    depMaps: string[] | IRequireMapExt[];
    error?: RequireError;
    exports: object;
    factory: Function;
    map: IRequireMapExt;
}

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

interface IRequireApi {
    contexts: Record<string, IRequireContext>;
}

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
