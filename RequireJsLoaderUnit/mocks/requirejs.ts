import {IRequireExt} from 'RequireJsLoader/require.ext';

const deps = {};
const registry = {};
const defined = {};
const undefined = {};

function clearObject(obj: object): void {
    Object.keys(obj).forEach((name) => {
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
        depMaps: depNames.map(toDepMap)
    };
}

export function undefine(name: string): void {
    delete deps[name];
    delete registry[name];
    delete defined[name];
    undefined[name] = true;
}

export function hasBeenUndefined(name: string): boolean {
    return undefined[name];
}

export function clear(): void {
    clearObject(deps);
    clearObject(registry);
    clearObject(defined);
    clearObject(undefined);
}

export function getImplementation<T>(name: string, strict: boolean = false): T {
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
        requirejs.onResourceLoad(defaultContext, {id: name, name});
    }

    return defined[name];

}

function requirejs<T>(modules: string | string[], callback: Function, errback: Function): T | void {
    if (!(modules instanceof Array)) {
        return getImplementation<T>(modules, true);
    }

    new Promise((resolve) => {
        resolve(modules.map(
            (module) => getImplementation(module, true)
        ));
    }).then(
        (implementations) => callback(...implementations as unknown[])
    ).catch((err) => {
        errback(err);
    });
}

const defaultContext = {
    registry,
    defined,
    require: {
        undef(name: string): void {
            undefine(name);
        }
    }
};

requirejs.s = {
    contexts: {
        _: defaultContext
    }
};

requirejs.undef = undefine;
requirejs.onResourceLoad = null;

export default requirejs as unknown as IRequireExt;
