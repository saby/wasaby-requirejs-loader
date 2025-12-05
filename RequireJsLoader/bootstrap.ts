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

function getS3DebugCookie() {
    if (typeof window === 'undefined') {
        // @ts-ignore
        return process?.domain?.req?.cookies?.s3debug || null;
    }

    return document.cookie.match(/(?:^|;)\s*s3debug\s*=\s*([^;]+)/)?.[1];
}

function buildUrl(name: string): string {
    return getModuleUrl(name, undefined, getS3DebugCookie(), false, undefined, true);
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

export const initScript = `
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
    const metaRoot = (globalThis as unknown as IGlobalEnvRequire).wsConfig?.metaRoot || '/';

    return [
        {
            // TODO Нельзя использовать buildUrl, пока не внедрим везде новый require.
            //  На страницах авторизации он теряет resource для корневых ресурсов. В новом такой пробелмы не будет.
            src: getResourceUrl(
                `${metaRoot}contents.js`,
                getS3DebugCookie(),
                false,
                undefined,
                true
            ),
            onload: `onLoadRequirePart('contents')`,
        },
        {
            src: buildUrl('RequireJsLoader/third-party/WebRequire'),
            onload: `onLoadRequirePart('require')`,
        },
        {
            src: buildUrl('RequireJsLoader/config'),
        },
    ];
}
