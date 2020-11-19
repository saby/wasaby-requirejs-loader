import { global } from './utils';
import ILogger from './ILogger';
import { BUILD_MODE, DEBUG_MODE, debug } from 'RequireJsLoader/config';

const ENTRY_POINT = 'HotReload/eventStream/client/runner';

/**
 * Initializes "Hot Reload" module
 */
export default function hotReload(logger: ILogger): () => void {
    if (
        typeof window !== 'undefined' &&
        (BUILD_MODE === DEBUG_MODE || debug.isEnabled()) &&
        global.contents?.modules?.HotReload
    ) {
        import(ENTRY_POINT).catch((err) => logger.log('RequireJsLoader/extras:hotReload', err));
    }

    return () => undefined;
}
