import { IRequireExt, preDefine, preRequire } from './requireTypes';

/**
 * @public
 */
export type BuildMode = 'release' | 'debug';

/**
 * @public
 */
export type ReactVersion = 17 | 19;

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
    initRequire?: () => void;
    preDefineModules?: IPredefinedModules;
    preRequiredModules?: IPreRequiredModules;
}

/**
 * @public
 */
export interface IPatchedWindow extends Window, IPatchedGlobal {}

/**
 * @public
 */
export interface IStaticResourcesConfig {
    domains?: string[];
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
    cdnRoot?: string;
    resourceRoot?: string;
    staticDomains?: IStaticResourcesConfig | string[];
    shardDomain?: string;
    showAlertOnTimeoutInBrowser?: boolean;
    wsRoot?: string;
    versioning?: boolean;
    defaultServiceUrl?: string;
    pagexPackages?: boolean;
    compatible?: boolean;
    loadCss?: boolean;
    themeName?: string;
    isDebugReact?: boolean;
}

/**
 * @public
 */
export interface IContents {
    ESVersion?: number;
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
    packedFilesRemoved?: boolean;
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
    version?: ReactVersion;
    features?: Record<string, string>;
    from_ps?: string;
    hasBundles?: boolean;
    hasTailwind?: boolean;
    ESVersion?: number;
}

/**
 * @public
 */
export interface IStaticFile {
    prevConfig?: IStaticResourcesConfig;
    prevStaticDomains?: IStaticResourcesConfig | string[];
    getShardDomain(): string;
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
    getWithSuffix(url: string, debugCookieValue?: string, direction?: string): string;
    getWithVersion(url: string, version?: boolean): string;
    getWithResourceRoot(url: string): string;
}

export type IPredefinedModules = Set<preDefine>;

export type IPreRequiredModules = Set<preRequire>;
