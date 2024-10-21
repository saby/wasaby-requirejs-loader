import { IRequireContext } from '../requireTypes';
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

function getAllAliasesIds(id: string): string[] {
    if (id.startsWith('_')) {
        return [id];
    }

    const [name, ...plugins] = id.split('!').reverse();
    let hasOptional = false;
    let withOptional = '';
    let withoutOptional = '';

    for (const plugin of plugins) {
        if (plugin.endsWith('optional')) {
            withOptional += 'optional!';
            hasOptional = true;
        } else {
            withoutOptional += `${plugin}!`;
            withOptional += `${plugin}!`;
        }
    }

    withoutOptional += name;
    withOptional += name;

    if (hasOptional) {
        return [
            withoutOptional,
            withOptional,
            withOptional.replace('optional!', 'RequireJsLoader/plugins/optional!'),
        ];
    }

    return [
        withoutOptional,
        `optional!${withoutOptional}`,
        `RequireJsLoader/plugins/optional!${withoutOptional}`,
    ];
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
    for (const name of getAllAliasesIds(id)) {
        if (processed.has(name)) {
            continue;
        }

        processed.add(name);

        getParents(name, context).forEach((parentId) => {
            undefineAncestors(parentId, context, processed, logger, err.toString());
        });

        undefine(context.require, name, logger, err.toString());
    }
}
