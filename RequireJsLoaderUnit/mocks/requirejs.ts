import { IRequireExt } from 'RequireJsLoader/requireTypes';

const deps: { [name: string]: string[] } = {};
const registry: {
    [name: string]: {
        factory: unknown;
        depMaps: unknown[];
    };
} = {};
const defined: { [name: string]: unknown } = {};
const undefinedMod: { [name: string]: boolean } = {};

function clearObject(obj: object): void {
    Object.keys(obj).forEach((name) => {
        // @ts-ignore
        delete obj[name];
    });
}

function toDepMap(id: string): unknown {
    return { id };
}

export function define<T>(name: string, depNames: string[], factory: T): void {
    deps[name] = depNames;
    registry[name] = {
        factory,
        depMaps: depNames.map(toDepMap),
    };
}

export function undefine(name: string): void {
    delete deps[name];
    delete registry[name];
    delete defined[name];
    undefinedMod[name] = true;
}

export function hasBeenUndefined(name: string): boolean {
    return undefinedMod[name];
}

export function clear(): void {
    clearObject(deps);
    clearObject(registry);
    clearObject(defined);
    clearObject(undefinedMod);
}

export function getImplementation(name: string, strict: boolean = false): unknown | undefined {
    if (defined[name]) {
        return defined[name];
    }

    const module = registry[name];
    const factory = module?.factory;

    if (!factory) {
        if (strict) {
            throw new Error(`Module "${name}" is not defined`);
        }

        return;
    }

    if (deps[name]) {
        deps[name].forEach((depName) => getImplementation(depName, strict));
    }

    defined[name] = typeof factory === 'function' ? factory() : factory;

    if (requirejs.onResourceLoad) {
        // @ts-ignore
        requirejs.onResourceLoad(defaultContext, { id: name, name });
    }

    return defined[name];
}

function requirejs(
    modules: string | string[],
    callback: Function,
    errback: Function
): unknown | void {
    if (!(modules instanceof Array)) {
        return getImplementation(modules, true);
    }

    new Promise((resolve) => {
        resolve(modules.map((module) => getImplementation(module, true)));
    })
        .then((implementations) => callback(...(implementations as unknown[])))
        .catch((err) => {
            errback(err);
        });
}

const defaultContext = {
    registry,
    defined,
    require: {
        undef(name: string): void {
            undefine(name);
        },
    },
};

requirejs.s = {
    contexts: {
        _: defaultContext,
    },
};

requirejs.undef = undefine;
requirejs.onResourceLoad = undefine;

export default requirejs as unknown as IRequireExt;
