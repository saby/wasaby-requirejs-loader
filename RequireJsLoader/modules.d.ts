/**
 * Not standard module definitions
 */

declare module 'RequireJsLoader/config' {
    interface IGetModulePrefixes {
        (): string[][];
        invalidate(): void;
    }

    interface IHandlers {
        getModulesPrefixes?: IGetModulePrefixes;
        checkModule?: (url: string) => void;
        getWithDomain?: (url: string) => string;
        getWithSuffix?: (url: string) => string;
        getWithVersion?: (url: string) => string;
    }

    interface IDebug {
        enabled: boolean;
        modules: string[];
        isOverall(): boolean;
        isDebuggingModule(url: string): boolean;
    }

    export const BUILD_MODE: RequireJsLoader.BuildMode;

    export const RELEASE_MODE: RequireJsLoader.BuildMode;

    export const DEBUG_MODE: RequireJsLoader.BuildMode;

    export const debug: IDebug;

    export const handlers: IHandlers;

    export function patchContext(
        context: RequireJsLoader.IRequireContext,
        {checkModule, getWithSuffix, getWithVersion, getWithDomain}: IHandlers
    ): () => void;

    export function getWsConfig(): RequireJsLoader.IWsConfig;

    export function createConfig(
        baseUrl: string,
        wsPath?: string,
        resourcesPath?: string,
        initialContents?: RequireJsLoader.IContents
    ): RequireConfig;

    export function applyConfig(
        require: Require,
        wsConfig: RequireJsLoader.IWsConfig,
        context?: string
    ): Require;

    export function prepareEnvironment(
        require: RequireJsLoader.IRequireExt,
        withHandlers: IHandlers
    ): void;
}
