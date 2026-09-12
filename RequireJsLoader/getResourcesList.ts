import type { IContents, IPatchedWindow } from 'RequireJsLoader/wasaby';

interface IScriptInfo {
    src: string;
    'data-rid': number;
    fetchpriority?: string;
    onload: string;
    onerror?: string;
    crossorigin?: string;
}

interface IInlineScriptInfo {
    content: string;
}

interface ILinkInfo {
    href: string;
    rel: string;
    onload?: string;
    onerror?: string;
    crossorigin?: string;
}

interface IDependencyList {
    links: Set<ILinkInfo>;
    scripts: Set<IScriptInfo | IInlineScriptInfo>;
}

interface IModuleDependencies {
    links: Record<string, string[]>;
}

interface IPagePackageInfo {
    locales: Record<string, string[]>;
    scripts: string[];
    styles: string[];
    stylesRtl: string[];
}

interface IPagexPackagesInfo {
    pages: Record<string, IPagePackageInfo>;
    modules: number[];
    resources: Record<string, number[]>;
}

interface IPagePackages {
    packageComposition: Map<string, Set<string>>;
    pages: Map<string, IPagePackageInfo>;
}

interface IGetResourcesListOptions {
    pageID?: string;
    reactMode: TReactMode;
}

export type TReactMode = 'release' | 'debug' | 'default';

// @ts-ignore
const globalEnv: IPatchedWindow = globalThis;
const req = globalEnv.requirejs.instance;
const moduleGraph = new Map();
const pagePackages = getPagexPackages();
const customPackageMaps: Map<string, Map<string, string>> = new Map();
const modulesHasBundles: Set<string> = new Set();
const REG_EXP_EXT = /\.css$|\.js$/;
const NAME_MAIN_PAGEX_PACKAGE = '/SabyPageLayoutPackages/common/scripts.';
const ONLOAD_SCRIPT_NAME_HANDLER = 'ols(this)';
const SERVER_COMPONENT_EXT = '.server';

checkModulesWithBundles();

function checkModulesWithBundles(): void {
    for (const [UIModuleName, moduleInfo] of Object.entries(globalEnv.contents?.modules || {})) {
        if (moduleInfo.hasBundles) {
            modulesHasBundles.add(UIModuleName);

            continue;
        }

        // TODO спилить после задачи https://online.sbis.ru/opendoc.html?guid=01a01973-d4e6-7177-abe2-223bc842e983&client=3
        if (moduleInfo.path) {
            const contentsID = `json!${UIModuleName}/contents`;
            const externalModuleInfo = globalEnv.requirejs(
                `json!${UIModuleName}/contents`
            ) as IContents;

            if (externalModuleInfo?.modules?.[UIModuleName].hasBundles) {
                modulesHasBundles.add(UIModuleName);
            }

            globalEnv.requirejs.undef(contentsID);
        }
    }
}

function isBundlesDisable(): boolean {
    // @ts-ignore
    const cookie = process?.domain?.req?.cookies?.disableBundles;

    return cookie === 'true';
}

function isPagePackagesDisable(): boolean {
    // @ts-ignore
    const cookie = process?.domain?.req?.cookies?.['s3-pagex-packages'];

    return cookie === 'false' || req.getDebugModules().size !== 0 || isBundlesDisable();
}

export function getModuleGraphForModule(moduleName: string) {
    const graphId = `json!${moduleName}/module-dependencies`;
    const graph = (globalEnv.requirejs(graphId) as IModuleDependencies).links;

    moduleGraph.set(moduleName, graph);

    // После обработчи нам не нужен module-dependencies, удаляем его из кеша require-а, чтобы он не занимал память.
    globalEnv.require.undef(graphId);

    return graph;
}

function getCustomPackageMap(UIModuleName: string): Map<string, string> {
    const packageMapId = `json!${UIModuleName}/packageMap`;
    const packageMap = globalEnv.requirejs(packageMapId) as Record<string, string>;

    const map = new Map();

    for (const [moduleName, packageName] of Object.entries(packageMap)) {
        map.set(moduleName, packageName.replace('.min.', '.'));
    }

    customPackageMaps.set(UIModuleName, map);

    // После обработки нам не нужен packageMap, удаляем его из кеша require-а, чтобы он не занимал память.
    globalEnv.require.undef(packageMapId);

    return map;
}

function moduleHasCustomPackage(UIModuleName: string): boolean {
    return (
        modulesHasBundles.has(UIModuleName) &&
        !isBundlesDisable() &&
        !req.isDebugModule(UIModuleName)
    );
}

function isServerComponent(moduleName: string): boolean {
    return moduleName.endsWith(SERVER_COMPONENT_EXT);
}

function getDependencyList(
    modules: string[],
    ignoreList: Set<string>,
    list: Set<string> = new Set(),
    isServerComponentBranch: boolean = false
): Set<string> {
    for (const moduleName of modules) {
        const defineName = req.getDefineName(moduleName);

        if (ignoreList.has(defineName) || list.has(defineName)) {
            continue;
        }

        const filePath = req.getModulePath(defineName);
        const rootDir = req.getRootDir(filePath);

        if (rootDir === 'controller?I18n') {
            continue;
        }

        if (moduleName.includes('optional!') && !req.modules.hasOwnProperty(rootDir)) {
            ignoreList.add(defineName);

            continue;
        }

        const graph = moduleGraph.get(rootDir) || getModuleGraphForModule(rootDir);
        const deps = graph[defineName];
        const isServerModule = isServerComponentBranch || isServerComponent(defineName);

        if (isServerModule) {
            if (defineName.startsWith('css!')) {
                list.add(defineName);
            }
        } else {
            list.add(defineName);
        }

        if (deps) {
            getDependencyList(graph[defineName], ignoreList, list, isServerModule);
        }
    }

    return list;
}

function filterRootModules(modules: string[], whiteList: Set<string>): string[] {
    const result = [];

    for (const moduleName of modules) {
        const defineName = req.getDefineName(moduleName);

        if (whiteList.has(defineName)) {
            result.push(defineName);
        }
    }

    return result;
}

function getPagexPackages(): IPagePackages {
    try {
        const pagexMetainfo = globalEnv.requirejs('json!page-x-packages') as IPagexPackagesInfo;
        const pages = {
            packageComposition: new Map(),
            pages: new Map(Object.entries(pagexMetainfo.pages)),
        };

        // В мете имена модулей заменены на индексы из массива имён для уменьшения веса, востанавливаем их.
        for (const [name, modules] of Object.entries(pagexMetainfo.resources)) {
            const result = new Set();

            for (const indexModule of modules) {
                result.add(pagexMetainfo.modules[indexModule]);
            }

            pages.packageComposition.set(name, result);
        }

        return pages;
    } catch (err) {
        return {
            packageComposition: new Map(),
            pages: new Map(),
        };
    }
}

function getPagePackages(lang: string, pageID: string): string[] {
    const packages = pagePackages.pages.get(pageID);

    if (!packages) {
        return [];
    }

    const result = packages.scripts;

    const langPackages = packages.locales[lang];

    if (langPackages) {
        result.push(...langPackages);
    }

    if (req.enableRtlDirection()) {
        result.push(...packages.stylesRtl);
    } else {
        result.push(...packages.styles);
    }

    return result;
}

function injectPagePackages(
    scripts: Set<IScriptInfo | IInlineScriptInfo>,
    links: Set<ILinkInfo>,
    processModules: Set<string>,
    packedModules: Set<string>,
    lang: string,
    currentDomain: string,
    pageID: string | undefined,
    reactMode: TReactMode,
    onlyCss: boolean
): void {
    if (!pageID) {
        return;
    }

    if (isPagePackagesDisable()) {
        return;
    }

    const packagesForPage = getPagePackages(lang, pageID);

    for (const packageName of packagesForPage) {
        const modules = pagePackages.packageComposition.get(packageName);

        if (modules) {
            const [filePath, ext] = packageName.split('.min.');
            const scriptInfo = buildScriptTag(filePath, currentDomain, 1);

            scriptInfo.fetchpriority = 'high';

            if (ext === 'js') {
                if (onlyCss) {
                    continue;
                }

                if (reactMode === 'debug' && scriptInfo.src?.includes(NAME_MAIN_PAGEX_PACKAGE)) {
                    scriptInfo.src = scriptInfo.src?.replace('.min.js', '.js');
                }

                scripts.add(scriptInfo);
            }

            if (ext === 'css') {
                links.add(buildLinkTag(filePath, currentDomain));
            }

            for (const moduleName of modules) {
                packedModules.add(moduleName);
                processModules.add(moduleName);
            }
        }
    }
}

function getResourceBlockNumber(): number {
    // @ts-ignore
    if (process?.domain?.req) {
        // @ts-ignore
        const previous = process.domain.req.previousResourceBlockNumber || 0;
        const current = previous + 1;

        // @ts-ignore
        process.domain.req.previousResourceBlockNumber = current;

        return current;
    }

    return 0;
}

function createResourceBlockRegistrationCode(
    numberBlock: number,
    rootModules: string[],
    countResources: number
): string {
    const roots = JSON.stringify(rootModules);
    return `window.resourcesBlock.set(${numberBlock}, {count: ${countResources}, rootModules: ${roots}});`;
}

function getCurrentDomain(): string {
    return (
        // @ts-ignore
        process.domain.req.headers.host || process.domain.req.host || process.domain.req.hostname
    );
}

function buildScriptTag(
    path: string,
    currentDomain: string,
    resourceBlockNumber: number
): IScriptInfo {
    const src = req.buildUrl(path, 'js');
    const result: IScriptInfo = {
        src,
        onload: ONLOAD_SCRIPT_NAME_HANDLER,
        'data-rid': resourceBlockNumber,
    };

    if (src.startsWith('//') || !src.includes(currentDomain)) {
        result.crossorigin = 'anonymous';
    }

    return result;
}

function buildLinkTag(path: string, currentDomain: string): ILinkInfo {
    const href = req.buildUrl(path, 'css');
    const result: ILinkInfo = {
        href,
        rel: 'stylesheet',
    };

    if (href.startsWith('//') || !href.includes(currentDomain)) {
        result.crossorigin = 'anonymous';
    }

    return result;
}

export default function getResourcesList(
    modules: string[],
    { pageID, reactMode }: IGetResourcesListOptions
): IDependencyList {
    const resourceBlockNumber = getResourceBlockNumber();
    // Не удалять! Это хак, чтобы у нас был доступ к объекту по ссылке, нам надо вставить его в начала блока,
    // но содержимое мы можем определить только в конце функции после построения списка ресурсов.
    const startInlineScript: IInlineScriptInfo = {
        content: '',
    };
    const scripts: Set<IScriptInfo | IInlineScriptInfo> = new Set([startInlineScript]);
    const links: Set<ILinkInfo> = new Set();
    const { controller }: any = globalEnv.requirejs('I18n/singletonI18n');
    const lang = controller.currentLang;
    const loadingsHistoryI18n = controller.loadingsHistory;
    const currentDomain = getCurrentDomain();
    const processedModules: Set<string> =
        // @ts-ignore
        process.domain.req.processedModulesForInsertingPageBody || new Set();
    const currentBlockModules: Set<string> = new Set();

    if (resourceBlockNumber === 1) {
        injectPagePackages(
            scripts,
            links,
            processedModules,
            currentBlockModules,
            lang,
            currentDomain,
            pageID,
            reactMode,
            modules.some(isBundlesDisable)
        );

        modules.push(loadingsHistoryI18n.regions[controller.currentRegion]);
        modules.push(loadingsHistoryI18n.languages[lang]);
    }

    const list = getDependencyList(modules, processedModules);

    // @ts-ignore
    if (!process.domain.req.processedModulesForInsertingPageBody) {
        // @ts-ignore
        process.domain.req.processedModulesForInsertingPageBody = processedModules;
    }

    // Это должно быть обязательно после injectPagePackages, где внедряются pagex пакеты,
    // иначе мы можем добавить модуль в дебажные и пакеты не вставятся.
    if (reactMode === 'debug') {
        req.debugModules.add('React');
    } else if (reactMode === 'release') {
        req.debugModules.delete('React');
    }

    for (const defineName of list) {
        const loaderName = req.getLoaderName(defineName);
        const filePath = req.getModulePath(defineName);
        const rootDir = req.getRootDir(filePath);

        processedModules.add(defineName);
        currentBlockModules.add(defineName);

        if (moduleHasCustomPackage(rootDir)) {
            const customPackage = customPackageMaps.get(rootDir) || getCustomPackageMap(rootDir);
            const packageName = customPackage.get(defineName);

            if (packageName && !processedModules.has(packageName)) {
                if (loaderName === 'css') {
                    links.add(buildLinkTag(packageName.replace(REG_EXP_EXT, ''), currentDomain));
                } else {
                    scripts.add(
                        buildScriptTag(
                            packageName.replace(REG_EXP_EXT, ''),
                            currentDomain,
                            resourceBlockNumber
                        )
                    );
                }

                processedModules.add(packageName);

                continue;
            }
        }

        if (loaderName === 'i18n') {
            const externalContent = controller.loadingsHistory.contents[rootDir];
            const dict = controller.loadingsHistory.contexts[rootDir]?.[lang]?.dictionary;

            if (dict) {
                scripts.add(buildScriptTag(dict, currentDomain, resourceBlockNumber));
            }

            // TODO Удалить, когда в корневой contents начнут прокидывать все флаги для external модулей
            if (externalContent) {
                scripts.add(buildScriptTag(externalContent, currentDomain, resourceBlockNumber));
            }

            continue;
        }

        if (loaderName === 'css') {
            links.add(buildLinkTag(filePath, currentDomain));

            continue;
        }

        if (loaderName === 'js') {
            scripts.add(buildScriptTag(filePath, currentDomain, resourceBlockNumber));
        }
    }

    if (scripts.size === 1) {
        scripts.clear();
    } else {
        startInlineScript.content = createResourceBlockRegistrationCode(
            resourceBlockNumber,
            filterRootModules(modules, currentBlockModules),
            // Вычитаем 1 скрипт, потому что это inline
            scripts.size - 1
        );
    }

    return {
        links,
        scripts,
    };
}

export function createResourceBlockCallbackRegistrationCode(
    callback: () => void
): IInlineScriptInfo {
    const numberBlock = getResourceBlockNumber();

    return {
        content: `window.callbacksForResourcesBlock.set(${numberBlock}, ${callback.toString()});`,
    };
}
