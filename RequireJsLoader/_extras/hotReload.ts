import ILogger from './ILogger';
import { BuildMode, IPatchedGlobal } from '../wasaby';

const globalEnv = globalThis as unknown as IPatchedGlobal;
const ENTRY_POINT = 'HotReload/eventStream/client/runner';
const DEBUG_MODE: BuildMode = 'debug';

/**
 * Initializes "Hot Reload" module
 */
export default function hotReload(logger: ILogger): () => void {
    const requireInstance = globalEnv.requirejs.instance;

    if (
        typeof window !== 'undefined' &&
        globalEnv.contents?.modules?.HotReload &&
        (requireInstance?.buildMode === DEBUG_MODE || requireInstance?.getDebugCookie())
    ) {
        import(ENTRY_POINT).catch((err) => logger.log('RequireJsLoader/extras:hotReload', err));
    }

    return () => undefined;
}
