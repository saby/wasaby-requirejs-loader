// Extensions for @types/requirejs

export type ContextEnableFunction = (depMap: IRequireModule) => void;

interface IRequireConfig {
    paths?: Record<string, string>;
    waitSeconds?: number;
}

export interface IRequireModule {
    id: string;
}

interface IRequireModuleHolder {
    emit: (name: string, evt: RequireError) => void;
}

interface IRequireModuleHolderConstructor {
    prototype: IRequireModuleHolder;
    new(): IRequireModuleHolder;
}

export interface IRequireContext {
    config: IRequireConfig;
    enable: ContextEnableFunction;
    Module: IRequireModuleHolderConstructor;
    onError: (err: RequireError, errback?: Function) => void;
    require: Require;
    registry: Record<string, any>;
}

interface IRequireApi {
    contexts: Record<string, IRequireContext>;
}

export interface IRequireExt extends Require {
    get: (context: IRequireContext, deps: string, relMap: IRequireModule, localRequire: Function) => any;
    s: IRequireApi;
}
