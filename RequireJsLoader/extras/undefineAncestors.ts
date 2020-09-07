import {IRequireContext} from '../require.ext';

interface IIoC {
    resolve<T>(name: string): T;
}

interface ILogger {
    log(tag: string, message: string): void;
}

// Module which supplies logger
const logSupplierModule = 'Env/Env';

function log(message: string): void {
    import(logSupplierModule).then(({IoC}: {IoC: IIoC}) => {
        IoC.resolve<ILogger>('ILogger').log('RequireJsLoader/extras/errorHandler', message);
    });
}

/**
 * Undefines module with given name
 */
export function undefine(require: Require, name: string): void {
    require.undef(name);
    log(`Module has been undefined "${name}".`);
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
