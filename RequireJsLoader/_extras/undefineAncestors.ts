import { IRequireContext } from '../require.ext';
import ILogger from './ILogger';

/**
 * Undefines module with given name
 */
export function undefine(require: Require, name: string, logger: ILogger, err: string = ''): void {
    require.undef(name);
    logger.log(
        'RequireJsLoader/extras:undefineAncestors->undefine()',
        `Module "${name}" has been undefined.` + `${err ? `Reason: ${err}` : ''}`
    );
}

/**
 * Returns module ids which depend on module with given id
 */
function getParents(id: string, context: IRequireContext): string[] {
    const registry = context.registry;

    return Object.keys(registry).filter((name) => {
        const module = registry[name];
        const depMaps = module.depMaps;

        return (
            depMaps &&
            depMaps.some((depModule) => typeof depModule !== 'string' && depModule.id === id)
        );
    });
}

/**
 * Undefines the whole tree ancestors branch started from given module
 */
export default function undefineAncestors(
    id: string,
    context: IRequireContext,
    processed: Set<string>,
    logger: ILogger,
    err: String
): void {
    if (processed.has(id)) {
        return;
    }
    processed.add(id);

    getParents(id, context).forEach((parentId) => {
        undefineAncestors(parentId, context, processed, logger, err.toString());
    });

    undefine(context.require, id, logger, err.toString());
}
