import { getModuleUrl, getResourceUrl } from 'RequireJsLoader/conduct';
import { IPatchedWindow } from 'RequireJsLoader/wasaby';
import type { preDefine, preRequire } from 'RequireJsLoader/requireTypes';

type requirePart = 'contents' | 'require';

interface IGlobalEnvRequire extends IPatchedWindow {
    loadedRequire: Set<requirePart>;
}

interface IScriptInfo {
    src: string;
    onload?: string;
}

type FeatureList = Record<string, Record<string, string | number>>;

interface IFeatureMap {
    maps: Record<number | string, string>;
    features: FeatureList;
}

let featuresMap: string;

function onLoadRequirePart(name: requirePart) {
    // @ts-ignore
    const globalEnv: IGlobalEnvRequire = globalThis;
    const REQUIRE_PARTS: requirePart[] = ['contents', 'require'];

    globalEnv.loadedRequire.add(name);

    for (const part of REQUIRE_PARTS) {
        if (!globalEnv.loadedRequire.has(part)) {
            return;
        }
    }

    globalEnv.initRequire?.();
}

function preDefine(...argsDefine: preDefine): void {
    // @ts-ignore
    const globalEnv: IGlobalEnvRequire = globalThis;

    globalEnv.preDefineModules?.add(argsDefine);
}

function preRequire(...argsRequire: preRequire): void {
    // @ts-ignore
    const globalEnv: IGlobalEnvRequire = globalThis;

    globalEnv.preRequiredModules?.add(argsRequire);
}

function getFeaturesMap(): string {
    if (featuresMap) {
        return featuresMap;
    }

    // @ts-ignore
    const globalEnv: IGlobalEnvRequire = globalThis;
    const modules = globalEnv.contents?.modules || {};
    const moduleNameOccurrences = new Set();
    const maps: Record<string, number> = {};
    const deserializationMap: Record<number, string> = {};
    const features: FeatureList = {};
    let index = 0;

    for (const [nameModule, module] of Object.entries(modules)) {
        if (!module.features) {
            continue;
        }

        features[nameModule] = {};

        for (const [nameFeature, value] of Object.entries(module.features)) {
            const minNameFeature = nameFeature.replace(`${nameModule}/`, '');

            features[nameModule][minNameFeature] = value;

            if (!moduleNameOccurrences.has(value)) {
                moduleNameOccurrences.add(value);

                continue;
            }

            if (maps.hasOwnProperty(value)) {
                continue;
            }

            maps[value] = index;
            deserializationMap[index] = value;
            index++;
        }
    }

    for (const [nameModule, featureList] of Object.entries(features)) {
        for (const [nameFeature, value] of Object.entries(featureList)) {
            if (maps.hasOwnProperty(value)) {
                features[nameModule][nameFeature] = maps[value];
            }
        }
    }

    featuresMap = JSON.stringify({
        maps: deserializationMap,
        features,
    });

    return featuresMap;
}

function deserializeFeatureMap({ maps, features }: IFeatureMap): void {
    const result: Record<string, string> = {};

    for (const [nameModule, featureList] of Object.entries(features)) {
        for (const [nameFeature, value] of Object.entries(featureList)) {
            const name = `${nameModule}/${nameFeature}`;

            if (maps.hasOwnProperty(value)) {
                result[name] = maps[value];
            } else {
                result[name] = value as string;
            }
        }
    }

    // @ts-ignore
    window.features = result;
}

export const initScript = `
(${deserializeFeatureMap.toString()})(${getFeaturesMap()});
globalThis.preDefineModules = new Set();
globalThis.preRequiredModules = new Set();
globalThis.loadedRequire = new Set();
globalThis.define = ${preDefine.toString()};
globalThis.define.amd = true;
globalThis.require = window.requirejs = ${preRequire.toString()};
globalThis.requirejs.isNewRequire = true;
globalThis.onLoadRequirePart = ${onLoadRequirePart.toString()};
`;

export function getScripts(): IScriptInfo[] {
    return [
        {
            src: getResourceUrl(`contents.js`),
            onload: `onLoadRequirePart('contents')`,
        },
        {
            src: getModuleUrl('RequireJsLoader/third-party/WebRequire'),
            onload: `onLoadRequirePart('require')`,
        },
        {
            src: getModuleUrl('RequireJsLoader/config'),
        },
    ];
}
