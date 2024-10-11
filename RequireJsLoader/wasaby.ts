import { IRequireExt } from './requireTypes';

/**
 * @public
 */
export type BuildMode = 'release' | 'debug';

/**
 * @public
 */
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

/**
 * @public
 */
export interface IPatchedWindow extends Window, IPatchedGlobal {}

/**
 * @public
 */
export interface IStaticResourcesConfig {
    domains: string[];
    resources?: string[];
    types?: string[];
}

/**
 * @public
 */
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

/**
 * @public
 */
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

/**
 * @public
 */
export interface IModule {
    buildnumber?: string;
    contextVersion?: string;
    path?: string;
    dict?: string[];
    service?: string;
    staticServer?: string;
    mode?: BuildMode;
}

/**
 * @public
 */
export interface IStaticFile {
    prevConfig?: IStaticResourcesConfig;
    prevStaticDomains?: IStaticResourcesConfig | string[];
    getConfig(): IStaticResourcesConfig;
}

interface IGetModulePrefixes {
    (): string[][];
    invalidate(): void;
}

/**
 * @public
 */
export interface IHandlersInternal {
    config: IWsConfig;
    getModuleNameFromUrl: (url: string) => string | undefined;
    getModulesPrefixes: IGetModulePrefixes;
    checkModule: (url: string) => void;
    getWithDomain(url: string, debugCookieValue?: string, skipDomains?: boolean): string;
    getWithDomain(
        url?: string,
        debugCookieValue?: string,
        skipDomains?: boolean
    ): string | undefined;
    getWithSuffix(
        url: string,
        debugCookieValue?: string,
        _isIE?: boolean,
        direction?: string
    ): string;
    getWithSuffix(
        url?: string,
        debugCookieValue?: string,
        _isIE?: boolean,
        direction?: string
    ): string | undefined;
    getWithVersion(url: string, version?: boolean): string;
    getWithVersion(url?: string, version?: boolean): string | undefined;
    getWithResourceRoot(url: string): string;
    getWithResourceRoot(url?: string): string | undefined;
    getWithUserDefined: (url: string) => string;
}
