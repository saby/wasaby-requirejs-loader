import { IRequireExt } from './requireTypes';

export type BuildMode = 'release' | 'debug';

export interface IPatchedGlobal {
    bundles: { [namePackage: string]: string[] };
    contents?: IContents;
    define: RequireDefine;
    require: Require;
    requirejs: IRequireExt;
    wsConfig: IWsConfig;
    rtpackModuleNames: string;
    product?: string;
    metaRoot?: string;
}

export interface IPatchedWindow extends Window, IPatchedGlobal {}

export interface IStaticResourcesConfig {
    domains: string[];
    resources?: string[];
    types?: string[];
}

export interface IWsConfig {
    APP_PATH?: string;
    BUILD_MODE?: string;
    DEBUGGING_MODULES?: string[];
    IS_OVERALL_DEBUG?: boolean;
    IS_SERVER_SCRIPT?: boolean;
    IS_INITIALIZED?: boolean;
    IS_BUILDER?: boolean;
    RESOURCES_PATH?: string;
    appRoot?: string;
    debug?: boolean;
    product?: string;
    moduleLoadingTimeout?: number;
    metaRoot?: string;
    resourceRoot?: string;
    staticDomains?: IStaticResourcesConfig | string[];
    showAlertOnTimeoutInBrowser?: boolean;
    wsRoot?: string;
    versioning?: boolean;
    defaultServiceUrl?: string;
}

export interface IContents {
    availableLanguage?: object;
    bundles?: object;
    buildMode?: BuildMode;
    buildnumber?: string;
    contextVersion?: string;
    loadedServices?: Record<string, boolean>;
    modules?: {
        [key: string]: IModule;
    };
    extensionForTemplate?: string;
}

interface IModule {
    buildnumber?: string;
    contextVersion?: string;
    path?: string;
    dict?: string[];
    service?: string;
    staticServer?: string;
    mode?: BuildMode;
}
