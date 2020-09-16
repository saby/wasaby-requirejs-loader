import { IRequireExt } from './require.ext';

export type BuildMode = 'release' | 'debug';

export interface IPatchedGlobal {
    bundles: string[];
    contents: IContents;
    define: RequireDefine;
    require: Require;
    requirejs: IRequireExt;
    wsConfig: IWsConfig;
    rtpackModuleNames: string;
}

export interface IPatchedWindow extends Window, IPatchedGlobal {
}

export interface IStaticResourcesConfig {
    domains: string[];
    resources?: string[];
    types: string[];
 }

export interface IWsConfig {
    APP_PATH?: string;
    BUILD_MODE?: string;
    DEBUGGING_MODULES?: string[];
    IS_OVERALL_DEBUG?: boolean;
    IS_SERVER_SCRIPT?: boolean;
    RESOURCES_PATH?: string;
    appRoot?: string;
    debug?: boolean;
    product?: string;
    moduleLoadingTimeout?: number;
    resourceRoot?: string;
    staticDomains?: IStaticResourcesConfig;
    showAlertOnTimeoutInBrowser?: boolean;
    wsRoot?: string;
    versioning?: boolean;
}

export interface IContents {
    availableLanguage?: object;
    bundles?: object;
    buildMode?: BuildMode;
    buildnumber?: string;
    contextVersion?: string;
    loadedServices?: Record<string, boolean>;
    modules: {
       [key: string]: IModule;
    };
}

interface IModule {
    buildnumber?: string;
    path?: string;
    dict?: string[];
    service?: string;
}
