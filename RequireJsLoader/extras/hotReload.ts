import ILogger from './ILogger';

// Superglobal root
const GLOBAL: RequireJsLoader.IPatchedGlobal = (function(): RequireJsLoader.IPatchedGlobal {
    // tslint:disable-next-line:ban-comma-operator
    return this || (0, eval)('this');
}());

const ENTRY_POINT = 'HotReload/eventStream/client/runner';

/**
 * Initializes "Hot Reload" module
 */
export default function hotReload(logger: ILogger): () => void {
    if (typeof window !== 'undefined') {
        if (GLOBAL.contents?.modules?.HotReload) {
            import(ENTRY_POINT).catch((err) => logger.log('RequireJsLoader/extras/hotReload', err));
        }
    }

    return () => undefined;
}
