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
    reactMode?: TReactMode;
}

interface IRequestGetResourceList {
    headers: Record<string, string>;
    cookies?: Record<string, string>;
    previousResourceBlockNumber?: number;
    processedModulesForInsertingPageBody?: Set<string>;
    host?: string;
    hostname?: string;
    hasPagexPackages?: boolean;
}

export type TReactMode = 'release' | 'debug' | 'default';

// @ts-ignore
const globalEnv: IPatchedWindow = globalThis;
const req = globalEnv.requirejs.instance;
const moduleGraph = new Map();
const pagePackages = getPagexPackages();
const customPackageMaps: Map<string, Map<string, string>> = new Map();
const modulesHasBundles: Set<string> = new Set();
const features = getFeatures();
let needCheckModules: boolean = true;
const REG_EXP_EXT = /\.css$|\.js$/;
const NAME_MAIN_PAGEX_PACKAGE = '/SabyPageLayoutPackages/common/scripts.';
const ONLOAD_SCRIPT_NAME_HANDLER = 'ols(this)';
const SERVER_COMPONENT_EXT = '.server';

const ALIAS_MAP_WS_CORE = new Map(
    Object.entries({
        'i18n!WS': 'i18n!WS.Core',
        'i18n!Core': 'i18n!WS.Core',
        'i18n!Lib': 'i18n!WS.Core',
        'i18n!Ext': 'i18n!WS.Core',
        'i18n!Helpers': 'i18n!WS.Core',
        'i18n!Transport': 'i18n!WS.Core',
        'i18n!Deprecated': 'i18n!WS.Deprecated',
    })
);

function getFeatures(): Map<string, string> {
    const result = new Map<string, string>();

    for (const [moduleName, info] of Object.entries(globalEnv.contents?.modules || {})) {
        if (info.features) {
            for (const [facade, implementation] of Object.entries<string>(info.features)) {
                if (moduleName === implementation) {
                    continue;
                }

                result.set(facade, facade.replace(moduleName, implementation));
            }
        }
    }

    return result;
}

function getRequest(): IRequestGetResourceList {
    //@ts-ignore
    return (process?.domain?.req as IRequestGetResourceList) || { headers: {} };
}

function checkModulesWithBundles(): void {
    for (const [UIModuleName, moduleInfo] of Object.entries(globalEnv.contents?.modules || {})) {
        if (moduleInfo.hasBundles) {
            modulesHasBundles.add(UIModuleName);

            continue;
        }

        // TODO спилить после задачи https://online.sbis.ru/opendoc.html?guid=01a01973-d4e6-7177-abe2-223bc842e983&client=3
        if (moduleInfo.path) {
            const externalModuleInfo = loadMetaData<IContents>(`json!${UIModuleName}/contents`);

            if (externalModuleInfo?.modules?.[UIModuleName].hasBundles) {
                modulesHasBundles.add(UIModuleName);
            }
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
    const moduleInfo = req.modules[moduleName];

    if (moduleInfo) {
        const graph =
            loadMetaData<IModuleDependencies>(`json!${moduleName}/module-dependencies`)?.links ||
            {};

        // Фичи можно прокидывать в dependencies только если мы на серваке, тоесть есть request
        // @ts-ignore
        if (moduleInfo.features && process?.domain?.req) {
            for (const [facade, implementation] of Object.entries<string>(moduleInfo.features)) {
                if (moduleName === implementation) {
                    continue;
                }

                const depsFacade = graph[facade];

                if (depsFacade) {
                    depsFacade.push(facade.replace(moduleName, implementation));
                }
            }
        }

        moduleGraph.set(moduleName, graph);

        return graph;
    }

    return {};
}

function getCustomPackageMap(UIModuleName: string): Map<string, string> {
    const map = new Map();
    const packageMap = loadMetaData<Record<string, string>>(`json!${UIModuleName}/packageMap`);

    if (packageMap) {
        for (const [moduleName, packageName] of Object.entries(packageMap)) {
            map.set(moduleName, packageName.replace('.min.', '.'));
        }
    }

    customPackageMaps.set(UIModuleName, map);

    return map;
}

function moduleHasCustomPackage(UIModuleName: string): boolean {
    // TODO убрать эту проверку и вынести вызов функции на уровень модуля,
    //  когда мы откажемся от загрузки модульного contents для external модулей.
    if (needCheckModules) {
        checkModulesWithBundles();
        needCheckModules = false;
    }

    return (
        modulesHasBundles.has(UIModuleName) &&
        !isBundlesDisable() &&
        !req.isDebugModule(UIModuleName)
    );
}

function isServerComponent(moduleName: string): boolean {
    return moduleName.endsWith(SERVER_COMPONENT_EXT);
}

function getDefineName(moduleName: string): string {
    // TODO Убрать после закрытия задачи https://online.sbis.ru/opendoc.html?guid=01a0aa73-b152-70e2-afdb-b109c1bd0610&client=3
    if (moduleName.startsWith('i18n!')) {
        const name = moduleName.split('/')[0];
        const alias = ALIAS_MAP_WS_CORE.get(name);

        return alias || name;
    }

    return req.getDefineName(moduleName);
}

function skipModule(moduleName: string, rootDir: string): boolean {
    if (rootDir === 'controller?I18n') {
        return true;
    }

    if (moduleName.includes('optional!') && !req.modules.hasOwnProperty(rootDir)) {
        return true;
    }

    return false;
}

function getDependencyListServerComponent(
    modules: string[],
    ignoreList: Set<string>,
    list: Set<string>
) {
    for (const moduleName of modules) {
        const defineName = getDefineName(moduleName);

        if (ignoreList.has(defineName) || list.has(defineName)) {
            continue;
        }

        const filePath = req.getModulePath(defineName);
        const rootDir = req.getRootDir(filePath);

        if (skipModule(moduleName, rootDir)) {
            ignoreList.add(defineName);

            continue;
        }

        if (defineName.startsWith('css!')) {
            list.add(defineName);
        } else {
            ignoreList.add(defineName);
        }

        const graph = moduleGraph.get(rootDir) || getModuleGraphForModule(rootDir);
        const deps = graph[defineName];

        if (deps) {
            getDependencyListServerComponent(deps, ignoreList, list);
        }
    }

    return list;
}

function getDependencyList(
    modules: string[],
    ignoreList: Set<string>,
    list: Set<string> = new Set()
): Set<string> {
    for (const moduleName of modules) {
        const defineName = getDefineName(moduleName);

        if (ignoreList.has(defineName) || list.has(defineName)) {
            continue;
        }

        const filePath = req.getModulePath(defineName);
        const rootDir = req.getRootDir(filePath);

        if (skipModule(moduleName, rootDir)) {
            ignoreList.add(defineName);

            continue;
        }

        const graph = moduleGraph.get(rootDir) || getModuleGraphForModule(rootDir);
        const deps = graph[defineName];
        const isServerModule = isServerComponent(defineName);

        if (isServerModule) {
            if (deps) {
                getDependencyListServerComponent(deps, new Set([defineName]), list);
            }
        } else {
            list.add(defineName);

            if (deps) {
                getDependencyList(deps, ignoreList, list);
            }
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

function loadMetaData<meta>(name: string): meta | undefined {
    try {
        return globalEnv.requirejs(name) as meta;
    } catch (err) {
        // TODO https://online.sbis.ru/opendoc.html?guid=01a0b02a-b4e9-7e3f-a66e-7fd436ad633e&client=3
        //  По хорошему надо плювать ошибкой и руинить построение страницы.
    } finally {
        // Нам не надо хранить мету или ошибку в кеше, удаляем из кеша require-а, чтобы не занимало память.
        globalEnv.requirejs.undef(name);
    }
}

function getPagexPackages(): IPagePackages {
    const pagexMetainfo = loadMetaData<IPagexPackagesInfo>('json!page-x-packages');

    if (!pagexMetainfo) {
        return {
            packageComposition: new Map(),
            pages: new Map(),
        };
    }

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
}

function getPagePackages(lang: string, pageID: string): string[] {
    const packages = pagePackages.pages.get(pageID);

    if (!packages) {
        return [];
    }

    const result = [...packages.scripts];

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

function injectLocalizationConfigs(
    controller: any,
    scripts: Set<IScriptInfo | IInlineScriptInfo>,
    processedModules: Set<string>,
    resourceBlockNumber: number,
    currentDomain?: string
): void {
    const loadingsHistoryI18n = controller.loadingsHistory;
    const configs = [
        loadingsHistoryI18n.languages[controller.currentLang],
        loadingsHistoryI18n.regions[controller.currentCountry],
    ];

    for (const defineName of getDependencyList(configs, processedModules)) {
        const filePath = req.getModulePath(defineName);

        processedModules.add(defineName);

        scripts.add(buildScriptTag(filePath, resourceBlockNumber, currentDomain));
    }
}

function injectPagePackages(
    scripts: Set<IScriptInfo | IInlineScriptInfo>,
    links: Set<ILinkInfo>,
    processModules: Set<string>,
    packedModules: Set<string>,
    lang: string,
    currentDomain: string | undefined,
    pageID: string | undefined,
    reactMode: TReactMode,
    onlyCss: boolean,
    fullList: Set<string>
): boolean {
    if (!pageID) {
        return false;
    }

    if (isPagePackagesDisable()) {
        return false;
    }

    const packagesForPage = getPagePackages(lang, pageID);

    if (packagesForPage.length === 0) {
        return false;
    }

    const featuresInPackage = [];

    for (const packageName of packagesForPage) {
        const modules = pagePackages.packageComposition.get(packageName);

        if (modules) {
            const [filePath, ext] = packageName.split('.min.');
            const scriptInfo = buildScriptTag(filePath, 1, currentDomain);

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

                const feature = features.get(moduleName);

                if (feature) {
                    featuresInPackage.push(feature);
                }
            }
        }
    }

    getDependencyList(featuresInPackage, packedModules, fullList);

    return true;
}

function createResourceBlockRegistrationCode(
    numberBlock: number,
    rootModules: string[],
    countResources: number
): string {
    const roots = JSON.stringify(rootModules);
    return `window.resourcesBlock.set(${numberBlock}, {count: ${countResources}, rootModules: ${roots}});`;
}

function getCurrentDomain(): string | undefined {
    const request = getRequest();

    return request.headers.host || request.host || request.hostname;
}

function buildScriptTag(
    path: string,
    resourceBlockNumber: number,
    currentDomain?: string
): IScriptInfo {
    const src = req.buildUrl(path, 'js');
    const result: IScriptInfo = {
        src,
        onload: ONLOAD_SCRIPT_NAME_HANDLER,
        'data-rid': resourceBlockNumber,
    };

    if (currentDomain && src.startsWith('//') && !src.includes(currentDomain)) {
        result.crossorigin = 'anonymous';
    }

    return result;
}

function buildLinkTag(path: string, currentDomain?: string): ILinkInfo {
    const href = req.buildUrl(path, 'css');
    const result: ILinkInfo = {
        href,
        rel: 'stylesheet',
    };

    if (currentDomain && href.startsWith('//') && !href.includes(currentDomain)) {
        result.crossorigin = 'anonymous';
    }

    return result;
}

export default function getResourcesList(
    modules: string[],
    { pageID, reactMode = 'default' }: IGetResourcesListOptions
): IDependencyList {
    // Не удалять! Это хак, чтобы у нас был доступ к объекту по ссылке, нам надо вставить его в начала блока,
    // но содержимое мы можем определить только в конце функции после построения списка ресурсов.
    const startInlineScript: IInlineScriptInfo = {
        content: '',
    };
    const scripts: Set<IScriptInfo | IInlineScriptInfo> = new Set([startInlineScript]);
    const links = new Set<ILinkInfo>();
    const { controller }: any = globalEnv.requirejs('I18n/singletonI18n');
    const lang = controller.currentLang;
    const currentDomain = getCurrentDomain();
    const request = getRequest();
    const resourceBlockNumber = (request.previousResourceBlockNumber || 0) + 1;
    const processedModules: Set<string> = request.processedModulesForInsertingPageBody || new Set();
    const currentBlockModules: Set<string> = new Set();
    const pagexLinks = new Set<ILinkInfo>();
    const list: Set<string> = new Set();

    if (resourceBlockNumber === 1) {
        request.hasPagexPackages = injectPagePackages(
            scripts,
            pagexLinks,
            processedModules,
            currentBlockModules,
            lang,
            currentDomain,
            pageID,
            reactMode,
            modules.some(isBundlesDisable),
            list
        );
    }

    const pagexPackagesDisable = !request.hasPagexPackages;
    const packageLinks = new Set<ILinkInfo>();

    getDependencyList(modules, processedModules, list);

    if (!request.processedModulesForInsertingPageBody) {
        request.processedModulesForInsertingPageBody = processedModules;
    }

    // Это должно быть обязательно после injectPagePackages, где внедряются pagex пакеты,
    // иначе мы можем добавить модуль в дебажные и пакеты не вставятся.
    if (reactMode === 'debug') {
        req.getDebugModules().add('React');
    } else if (reactMode === 'release') {
        req.getDebugModules().delete('React');
    }

    for (const defineName of list) {
        const loaderName = req.getLoaderName(defineName);
        const filePath = req.getModulePath(defineName);
        const rootDir = req.getRootDir(filePath);

        processedModules.add(defineName);
        currentBlockModules.add(defineName);

        if (pagexPackagesDisable && moduleHasCustomPackage(rootDir)) {
            const customPackage = customPackageMaps.get(rootDir) || getCustomPackageMap(rootDir);
            const packageName = customPackage.get(defineName);

            if (packageName) {
                if (processedModules.has(packageName)) {
                    continue;
                }

                if (loaderName === 'css') {
                    packageLinks.add(
                        buildLinkTag(packageName.replace(REG_EXP_EXT, ''), currentDomain)
                    );
                } else {
                    scripts.add(
                        buildScriptTag(
                            packageName.replace(REG_EXP_EXT, ''),
                            resourceBlockNumber,
                            currentDomain
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
                scripts.add(buildScriptTag(dict, resourceBlockNumber, currentDomain));
            }

            // TODO Удалить, когда в корневой contents начнут прокидывать все флаги для external модулей
            if (externalContent) {
                scripts.add(buildScriptTag(externalContent, resourceBlockNumber, currentDomain));
            }

            continue;
        }

        if (loaderName === 'css') {
            links.add(buildLinkTag(filePath, currentDomain));

            continue;
        }

        if (loaderName === 'js') {
            scripts.add(buildScriptTag(filePath, resourceBlockNumber, currentDomain));
        }
    }

    if (scripts.size === 1) {
        scripts.clear();
    } else {
        injectLocalizationConfigs(
            controller,
            scripts,
            processedModules,
            resourceBlockNumber,
            currentDomain
        );

        startInlineScript.content = createResourceBlockRegistrationCode(
            resourceBlockNumber,
            filterRootModules(modules, currentBlockModules),
            // Вычитаем 1 скрипт, потому что это inline
            scripts.size - 1
        );
        request.previousResourceBlockNumber = resourceBlockNumber;
    }

    return {
        // TODO УБРАТЬ ЭТУ ЕРЕСТЬ В 26.6000, не должны мы порядок обеспечивать.
        links: new Set([...pagexLinks, ...packageLinks, ...links]),
        scripts,
    };
}

export function createResourceBlockCallbackRegistrationCode(
    callback: () => void
): IInlineScriptInfo {
    const request = getRequest();

    // Всё ради сборки одной статичной html на билдере, которую надо построить полностью со всеми ссылками,
    // хотя у нас нет там не какого запроса. ТАм вместо реквеста всегда приходит новый объект,
    // поэтому там всегда будет 1. Но так как 1 это пачка ресурсов сдвинем её до 2
    if (request.previousResourceBlockNumber) {
        const numberBlock = request.previousResourceBlockNumber + 1;

        request.previousResourceBlockNumber = numberBlock;

        return {
            content: `window.callbacksForResourcesBlock.set(${numberBlock}, ${callback.toString()});`,
        };
    }

    // Всё ради сборки одной статичной html на билдере, которую надо построить полностью со всеми ссылками,
    // хотя у нас нет там не какого запроса. ТАм вместо реквеста всегда приходит новый объект,
    // поэтому там не будет номера пачки. Но так как 1 это пачка ресурсов, сдвинем её до 2.
    return {
        content: `window.callbacksForResourcesBlock.set(2, ${callback.toString()});`,
    };
}
