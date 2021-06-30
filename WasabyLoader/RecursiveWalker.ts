/// <amd-module name='WasabyLoader/RecursiveWalker' />

import { parse } from './Library';

let root = 'resources';

const noDescription: IModulesDescription = {
    bundles: {},
    nodes: {},
    links: {},
    packedLibraries: {},
    lessDependencies: {}
};

let contents: Partial<IContents> = {};
try {
    // tslint:disable-next-line:ban-ts-ignore
    // @ts-ignore
    contents = require(`json!${root}/contents`) || {}; // tslint:disable-line:no-var-requires
} catch {
    contents = {};
}

const { nodes } = getModulesDeps(contents.modules);

export type RequireJSPlugin = 'js' | 'wml' | 'tmpl' | 'i18n' | 'default' | 'is' | 'browser';

export type IDeps = string[];

export type IBundlesRoute = Record<string, string>;

export interface IModules {
    [mod: string]: {
        path?: string;
    };
}

export interface IContents {
    buildMode: string;
    buildnumber: string;
    htmlNames: Record<string, string>;
    jsModules: object;
    modules: IModules;
}

export interface IPlugin {
    type: string;
    plugin: string;
    hasDeps: boolean;
    hasPacket: boolean;
    packOwnDeps: boolean;
    canBePackedInParent?: boolean;
}

export interface IModuleInfo {
    moduleName: string;
    fullName: string;
    typeInfo: IPlugin;
}

export interface ICollectedDeps {
    js?: {[depName: string]: IModuleInfo};
    i18n?: {[depName: string]: IModuleInfo};
    css?: {[depName: string]: IModuleInfo};
    wml?: {[depName: string]: IModuleInfo};
    tmpl?: {[depName: string]: IModuleInfo};
}

export interface IModulesDeps {
    nodes: Record<string, { path: string, amd: boolean; }>;
    links: Record<string, IDeps>;
    packedLibraries: Record<string, IDeps>;
    lessDependencies: object;
}

export interface IModulesDescription extends IModulesDeps {
    bundles: IBundlesRoute;
}

function getPlugin(name: string): string {
    let res;
    res = name.split('!')[0];
    if (res === name) {
        res = '';
    }
    return res;
}

function requireModuleDeps(path: string): IModulesDescription {
    try {
        // в демо стендах resourceRoot равен "/"
        // из-за этого в релиз режиме путь к мета файлам формируется с двойным слешем и require не грузит такие файлы
        path = path === '/' ? '' : path;
        // tslint:disable-next-line:ban-ts-ignore
        // @ts-ignore
        const deps: IModulesDeps = require(`json!${path}/module-dependencies`);
        // tslint:disable-next-line:ban-ts-ignore
        // @ts-ignore
        const bundles: IBundlesRoute = require(`json!${path}/bundlesRoute`); // tslint:disable-line:no-shadowed-variable
        return { ...deps, bundles };
    } catch {
        /** Ошибка игнорируется т.к module-dependencies может отсутствовать */
        return noDescription;
    }
}

function collect(prev: IModulesDescription, next: IModulesDescription): IModulesDescription {
    return {
        links: { ...prev.links, ...next.links },
        nodes: { ...prev.nodes, ...next.nodes },
        bundles: { ...prev.bundles, ...next.bundles },
        packedLibraries: { ...prev.packedLibraries, ...next.packedLibraries },
        lessDependencies: { ...prev.lessDependencies, ...next.lessDependencies }
    };
}

export const TYPES: Record<RequireJSPlugin | 'css', object> = {
    tmpl: {
        type: 'tmpl',
        plugin: 'tmpl',
        hasDeps: true,
        hasPacket: false,
        canBePackedInParent: true
    },
    js: {
        type: 'js',
        plugin: '',
        hasDeps: true,
        hasPacket: true,
        packOwnDeps: true
    },
    wml: {
        type: 'wml',
        plugin: 'wml',
        hasDeps: true,
        hasPacket: false,
        canBePackedInParent: true
    },
    i18n: {
        type: 'i18n',
        plugin: 'i18n',
        hasDeps: false,
        hasPacket: false,
        canBePackedInParent: false
    },
    is: {
        type: 'is',
        plugin: 'is',
        hasDeps: false,
        hasPacket: false,
        canBePackedInParent: false
    },
    browser: {
        type: 'browser',
        plugin: 'browser',
        hasDeps: true,
        hasPacket: true,
        packOwnDeps: true
    },
    css: {
        type: 'css',
        plugin: 'css',
        hasDeps: false,
        hasPacket: true
    },
    default: {
        hasDeps: false
    }
};

export function getType(name: string): IPlugin | null {
    const plugin = getPlugin(name);
    for (const key in TYPES) {
        if (TYPES[key].plugin === plugin) {
            return TYPES[key];
        }
    }
    return null;
}

export function parseModuleName(name: string): IModuleInfo | null {
    const typeInfo = getType(name);
    if (typeInfo === null) {
        return null;
    }
    let nameWithoutPlugin;
    if (typeInfo.plugin) {
        nameWithoutPlugin = name.split(typeInfo.plugin + '!')[1];
    } else {
        nameWithoutPlugin = name;
    }
    const parts = parse(nameWithoutPlugin);
    return {
        moduleName: parts.name,
        fullName: name,
        typeInfo
    };
}

/**
 * Импорт module-dependencies.json текущего сервиса и всех внешних
 * для коллекции зависимостей на СП
 * @param modules - словарь используемых модулей, для которых собираются зависимости
 */
export function getModulesDeps(modules: IModules = {}): IModulesDescription {
    if (typeof window !== 'undefined') { return noDescription; }

    /** Список путей до внешних сервисов
     * файлы module-dependencies и bundlesRoute для модулей сторонних сервисов необходимо брать из этих модулей,
     * т.к. require'ом не получится достучаться до корня стороннего сервиса
     */
    const externalPaths = Object.keys(modules)
        .filter((name) => !!modules[name].path)
        .map((name) => name);

    return [root, ...externalPaths]
        .map(requireModuleDeps)
        .reduce(collect);
}

/**
 * Create object which contains all nodes of dependency tree.
 * { js: {}, css: {}, ..., wml: {} }
 * @param allDeps
 * @param curNodeDeps
 * @param modDeps
 */
export function recursiveWalker(
    allDeps: ICollectedDeps,
    curNodeDeps: IDeps,
    modDeps: Record<string, IDeps>,
    modInfo: object,
    skipDep: boolean = false
): void {
    if (curNodeDeps && curNodeDeps.length) {
        for (let i = 0; i < curNodeDeps.length; i++) {
            let node = curNodeDeps[i];
            const splitted = node.split('!');
            if (splitted[0] === 'optional' && splitted.length > 1) {
                // OPTIONAL BRANCH
                splitted.shift();
                node = splitted.join('!');
                if (!modInfo[node]) {
                    continue;
                }
            }
            const module = parseModuleName(node);
            if(module === null) {
                // Модули данного типа, мы не умеем подключать.
                continue;
            }
            const moduleType = module.typeInfo.type;
            if (!allDeps[moduleType]) {
                allDeps[moduleType] = {};
            }
            if (!allDeps[moduleType][node]) {
                if (!(skipDep && !!module.typeInfo.canBePackedInParent)) {
                    allDeps[moduleType][module.fullName] = module;
                }
                if (module.typeInfo.hasDeps) {
                    const nodeDeps = modDeps[node] || modDeps[module.moduleName];
                    recursiveWalker(allDeps, nodeDeps, modDeps, modInfo, !!module.typeInfo.packOwnDeps);
                }
            }
        }
    }
}

/**
 * Проверяет по файлу module-dependencies наличие указанного модуля в текущем сервисе
 * @param moduleName Название модуля, которое хотим проверить на наличие
 */
export function isModuleExists(moduleName: string): boolean {
    // Если сервис собран в debug-режиме, то файл module-dependencies не будет сгенерирован.
    // Тогда по умолчанию считаем что модуль существует.
    if (contents.buildMode === 'debug') {
        return true;
    }
    return !!nodes[moduleName];
}
