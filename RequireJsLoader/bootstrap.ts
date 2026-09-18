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

function preDefineFeature(...argsRequire: preDefine): void {
    // @ts-ignore
    const globalEnv: IGlobalEnvRequire = globalThis;

    globalEnv.preRequiredFeatures?.add(argsRequire);
}

export const initScript = `
globalThis.preDefineModules = new Set();
globalThis.preRequiredFeatures = new Set();
globalThis.preRequiredModules = new Set();
globalThis.loadedRequire = new Set();
globalThis.define = ${preDefine.toString()};
globalThis.define.amd = true;
globalThis.defineFeature = ${preDefineFeature.toString()};
globalThis.require = window.requirejs = ${preRequire.toString()};
globalThis.requirejs.isNewRequire = true;
globalThis.onLoadRequirePart = ${onLoadRequirePart.toString()};
`;

export function getScripts(): IScriptInfo[] {
    return [
        {
            // при сборке html.tmpl нужно принудительно передавать версию, иначе contents будет без
            // версии и в десктопных приложениях не будет работать обновление из-за закешированного
            // contents. getModuleUrl. Корневой запрос за роутером работает, поскольку Router использует
            // UI/Utils:getResourceUrl, где также принудительно передаётся version
            src: getResourceUrl('contents.js', undefined, false, undefined, true),
            onload: `onLoadRequirePart('contents')`,
        },
        {
            src: getModuleUrl('RequireJsLoader/third-party/WebRequire'),
            onload: `onLoadRequirePart('require')`,
        },
    ];
}
