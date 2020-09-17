import {IRequireExt} from 'RequireJsLoader/require.ext';

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
}

export function clear(): void {
    clearObject(deps);
    clearObject(registry);
    clearObject(defined);
}

export function getImplementation<T>(name: string, strict: boolean = false): T {
    if (defined[name]) {
        return defined[name];
    }

    const module = registry[name];
    const factory = module?.factory;
    if (!factory) {
        if (strict) {
            throw new Error(`Module ${name} is not defined`);
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

function requirejs<T>(modules: string | string[], callback: Function): T | void {
    if (modules instanceof Array) {
        setTimeout(() => {
            callback(modules.map((module) => getImplementation(module, true)));
        }, 0);
        return;
    }

    return getImplementation<T>(modules, true);
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
