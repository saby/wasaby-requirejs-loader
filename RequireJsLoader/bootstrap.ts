import { getModuleUrl, getResourceUrl } from 'RequireJsLoader/conduct';
import { IPatchedWindow } from 'RequireJsLoader/wasaby';
import type { preDefine, preRequire } from 'RequireJsLoader/requireTypes';

type requirePart = 'contents' | 'require';

interface IGlobalEnvRequire extends IPatchedWindow {
    loadedRequire: Set<requirePart>;
}

interface IScriptInfo {
    src: string;
    fetchpriority?: string;
    onload?: string;
    onerror?: string;
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

function onErrorRequire(element: HTMLScriptElement, showAlert: boolean = false) {
    if (showAlert) {
        alert(
            'Возникла ошибка загрузки базового ресурса. Попробуйте перезагрузить страницу в ручную или нажиме кнопку "ОК".'
        );
        window.location.reload();
    }

    // @ts-ignore
    const globalEnv: IGlobalEnvRequire = globalThis;
    const node = document.createElement('script');
    // @ts-ignore
    const xModule = element.src.split('x_module=')[1];

    for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];

        node.setAttribute(attr.name, attr.value);
    }

    node.src = `${
        globalEnv.wsConfig.metaRoot || '/'
    }RequireJsLoader/third-party/WebRequire.min.js?x_module=${xModule}`;
    node.onerror = () => onErrorRequire(node, true);

    document.head.appendChild(node);

    return true;
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

function registerError(event: ErrorEvent) {
    // @ts-ignore
    const globalEnv: IGlobalEnvRequire = globalThis;

    globalEnv.preRegistryErrors?.add(event);
}

function onloadScript(script: HTMLScriptElement): void {
    // @ts-ignore
    const globalEnv: IGlobalEnvRequire = globalThis;

    if (script.dataset.rid) {
        globalEnv.loadedScriptsFromBlock?.push(Number(script.dataset.rid));
    }
}

export const registryErrorScript = `
globalThis.preRegistryErrors = new Set();
globalThis.onErrorRequireRegistry = ${registerError.toString()};
window.addEventListener('error', globalThis.onErrorRequireRegistry, true);
`;

export const registryOnLoadScript = `
globalThis.loadedScriptsFromBlock = [];
globalThis.resourcesBlock = new Map();
globalThis.ols = ${onloadScript.toString()};
`;

export const initializationScript = `
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
globalThis.onErrorRequire = ${onErrorRequire.toString()};
`;

export const initScript = `
${registryErrorScript}
${initializationScript}
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
            onerror: 'onErrorRequire(this, true)',
            fetchpriority: 'high',
        },
        {
            src: getModuleUrl('RequireJsLoader/third-party/WebRequire'),
            onload: `onLoadRequirePart('require')`,
            onerror: 'onErrorRequire(this)',
            fetchpriority: 'high',
        },
    ];
}
