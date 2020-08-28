import {IRequireExt} from 'RequireJsLoader/require.ext';

const implementations = {};
const deps = {};
const registry = {};
const defined = {};

function clearObject(obj: object): void {
    Object.keys(obj).forEach((name) => {
        delete obj[name];
    });
}

function toDepMap(id: string): unknown {
    return { id };
}

export function define<T>(name: string, depNames: string[], implementation: T): void {
    implementations[name] = implementation;
    deps[name] = depNames;
    registry[name] = {
        depMaps: depNames.map(toDepMap)
    };
}

export function undefine(name: string): void {
    delete implementations[name];
    delete deps[name];
    delete registry[name];
    delete defined[name];
}

export function clear(): void {
    clearObject(implementations);
    clearObject(deps);
    clearObject(registry);
    clearObject(defined);
}

export function getImplementation<T>(name: string): T {
    const implementation = implementations[name];

    if (implementation) {
        if (deps[name]) {
            deps[name].forEach((depName) => getImplementation(depName));
        }
        defined[name] = implementation;

        if (requirejs.onResourceLoad) {
            requirejs.onResourceLoad(defaultContext, {id: name, name});
        }
    }

    return implementation;
}

function requirejs(modules: string[], callback: Function): void {
    setTimeout(() => {
        callback(modules.map(getImplementation));
    }, 0);
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

requirejs.onResourceLoad = null;

export default requirejs as unknown as IRequireExt;
