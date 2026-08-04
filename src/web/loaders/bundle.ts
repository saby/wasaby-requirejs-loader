/**
 * Загрузчик для бандлов
 * @author Кудрявцев И.С.
 */
import type { TLoader, availableLoaders } from '../../main/BaseRequire';
import type WebRequire from '../../WebRequire';

import cssLoader from './css';
import jsLoader from './js';

interface IPackagesInfo {
    map: Record<string, string>;
    disabledMap: boolean;
    disabledPackages: Set<string>;
}

interface ILoadedStatusInfo {
    all: number;
    loaded: number;
}

const PACKABLE_EXTENSION = ['js', 'css', 'wml', 'tmpl', 'html'];
const BUNDLE_EXTENSION = '.package';
const BUNDLE_MAP_NAME = 'packageMap.json';
const PERCENTAGE_BASE = 100;
// Задаем сколько процентов модулей из пакета должны быть загружены, чтобы мы его не грузили.
const PERCENTAGE_OF_LOADED_MODULES_TO_DISABLE = 50;
const regExpExt = /\.css$|\.js$/;

const loadingMap: Map<string, Promise<IPackagesInfo>> = new Map();
const packageInfoMap: Map<string, IPackagesInfo> = new Map();

function isDictionary(modulePath: string) {
    return modulePath.split('/')[1] === 'lang';
}

/**
 * Проверить, что это пакумеое расширение
 * @param extension Расширение
 */
function isPackableExtension(extension: string): boolean {
    return PACKABLE_EXTENSION.includes(extension);
}

/**
 * Проверть, что это бандл
 * @param path Путь до файла
 */
function isBundle(path: string): boolean {
    return path.endsWith(BUNDLE_EXTENSION);
}

/**
 * Проверить, что это карта пакетов
 * @param path Путь до файла
 */
function isBundlesMap(path: string): boolean {
    return path.endsWith(BUNDLE_MAP_NAME);
}

/**
 * Получить полную информацию по пакетам.
 * @param packagesInfo Информация о пакетах.
 * @param context Require
 */
async function getFullPackagesInfo(
    moduleName: string,
    context: WebRequire
): Promise<IPackagesInfo> {
    let promise = loadingMap.get(moduleName);

    if (!promise) {
        promise = loadFullPackageInfo(moduleName, context);

        loadingMap.set(moduleName, promise);
    }

    return promise;
}

/**
 * Загрузить полную информацию по пакетам.
 * Загружает карту пакетов.
 * Проверяет сколько модулей из пакета уже были загружено. Если их больше задано значения, пакет не грузиться.
 * Если все пакеты попали в исключение, то исключает карту целиком.
 * @param packagesInfo Информация о пакетах.
 * @param context Require
 */
async function loadFullPackageInfo(
    UIModuleName: string,
    context: WebRequire
): Promise<IPackagesInfo> {
    const packagesLoadedStatus: Record<string, ILoadedStatusInfo> = {};
    const disabledPackages: Set<string> = new Set();
    const normalizeMap: Record<string, string> = {};
    const packageMapPath = `${UIModuleName}/${BUNDLE_MAP_NAME}`;

    const map = (await context.require([packageMapPath]))[0] as Record<string, string>;

    for (const [moduleName, packagePath] of Object.entries(map)) {
        const packageName = packagePath.replace('.min.', '.');

        // TODO Надо чтобы билдер возрвщал без min
        normalizeMap[moduleName] = packageName;

        if (!packagesLoadedStatus.hasOwnProperty(packageName)) {
            packagesLoadedStatus[packageName] = {
                all: 0,
                loaded: 0,
            };
        }

        ++packagesLoadedStatus[packageName].all;

        if (context.loaded(moduleName)) {
            ++packagesLoadedStatus[packageName].loaded;
        }
    }

    for (const [packageName, { all, loaded }] of Object.entries(packagesLoadedStatus)) {
        if (packageName.endsWith('.css')) {
            if (loaded > 0) {
                disabledPackages.add(packageName);
            }

            continue;
        }

        const percentageLoaded = Math.floor((loaded / all) * PERCENTAGE_BASE);

        if (percentageLoaded > PERCENTAGE_OF_LOADED_MODULES_TO_DISABLE) {
            disabledPackages.add(packageName);
        }
    }

    return {
        map: normalizeMap,
        disabledPackages,
        disabledMap: Object.keys(packagesLoadedStatus).length === disabledPackages.size,
    };
}

/**
 * Определяет и вызывает загрузчик, для пакета или для файла.
 * @param packagesInfo Информация о пакетах UI модуля
 * @param fileInfo
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context Require
 * @param defaultLoader Дефолтный загрузчик, применяется, если модуль не в пакете.
 */
function callLoader(
    packagesInfo: IPackagesInfo,
    defineName: string,
    filePath: string,
    loaderName: availableLoaders,
    context: WebRequire,
    defaultLoader: TLoader<Promise<unknown>, WebRequire>
): Promise<unknown> {
    if (packagesInfo.map.hasOwnProperty(defineName)) {
        let packagePath = packagesInfo.map[defineName];

        if (packagesInfo.disabledPackages.has(packagePath)) {
            return defaultLoader(defineName, filePath, context);
        }

        packagePath = packagePath.replace(regExpExt, '');

        if (loaderName === 'css') {
            return cssLoader(defineName, packagePath, context);
        }

        return jsLoader(defineName, packagePath, context);
    }

    return defaultLoader(defineName, filePath, context);
}

/**
 * Загружает и дефанит модули из пакетов
 * @param module Модуль
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context Require
 * @param defaultLoader Дефолтный загрузчик, применяется, если модуль не в пакете.
 */
export default async function (
    defineName: string,
    filePath: string,
    loaderName: availableLoaders,
    context: WebRequire,
    defaultLoader: TLoader<Promise<unknown>, WebRequire>
): Promise<unknown> {
    if (
        isBundle(filePath) ||
        !isPackableExtension(loaderName) ||
        isBundlesMap(filePath) ||
        isDictionary(filePath)
    ) {
        return defaultLoader(defineName, filePath, context);
    }

    const moduleName = context.getRootDir(filePath);

    if (context.isDebugModule(moduleName)) {
        return defaultLoader(defineName, filePath, context);
    }

    let packagesInfo = packageInfoMap.get(moduleName);

    if (packagesInfo) {
        if (packagesInfo.disabledMap) {
            return defaultLoader(defineName, filePath, context);
        }

        return callLoader(packagesInfo, defineName, filePath, loaderName, context, defaultLoader);
    }

    packagesInfo = await getFullPackagesInfo(moduleName, context);

    return callLoader(packagesInfo, defineName, filePath, loaderName, context, defaultLoader);
}
