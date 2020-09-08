import {IRequireContext} from '../require.ext';

export interface ILogger {
    log(tag: string, message: string): void;
}

/**
 * Undefines module with given name
 */
export function undefine(require: Require, name: string, logger: ILogger): void {
    require.undef(name);
    logger.log('RequireJsLoader/extras/undefineAncestors:undefine()', `Module "${name}" has been undefined.`);
}

/**
 * Returns module ids which depend on module with given id
 */
function getParents(id: string, context: IRequireContext): string[] {
    const registry = context.registry;
    return Object.keys(registry).filter((name) => {
        const module = registry[name];
        const depMaps = module.depMaps;
        return depMaps && depMaps.some((depModule) => depModule.id === id);
    });
}

/**
 * Undefines the whole tree ancestors branch started from given module
 */
export default function undefineAncestors(
    id: string,
    context: IRequireContext,
    processed: Set<string>
): void {
    if (processed.has(id)) {
        return;
    }
    processed.add(id);

    getParents(id, context).forEach((parentId) => {
        undefineAncestors(
            parentId,
            context,
            processed
        );
    });

    undefine(context.require, id);
}
