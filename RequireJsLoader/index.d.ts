/**
 * Define RequireJsLoader as UMD module
 * https://www.typescriptlang.org/docs/handbook/declaration-files/library-structures.html#identifying-a-umd-library
 */
export as namespace RequireJsLoader;

export { BuildMode, IStaticResourcesConfig, IWsConfig, IContents, IPatchedGlobal } from './wasaby';
export {
    IRequireExt,
    IRequireContext,
    IRequireMapExt,
    OnResourceLoadCallback,
    ITensorFunction
} from './require.ext';
