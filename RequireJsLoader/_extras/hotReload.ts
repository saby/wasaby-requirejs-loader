import { global } from './utils';
import ILogger from './ILogger';
// @ts-ignore
import { BUILD_MODE, DEBUG_MODE } from '../config';

const ENTRY_POINT = 'HotReload/eventStream/client/runner';

/**
 * Initializes "Hot Reload" module
 */
export default function hotReload(logger: ILogger): () => void {
    if (
        typeof window !== 'undefined' &&
        BUILD_MODE === DEBUG_MODE &&
        global.contents?.modules?.HotReload
    ) {
        import(ENTRY_POINT).catch((err) => logger.log('RequireJsLoader/extras:hotReload', err));
    }

    return () => undefined;
}
