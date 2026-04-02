/**
 * Загрузчик для бандлов
 * @author Кудрявцев И.С.
 */
import type { IModuleInfo, IRequire, IPackagesInfo } from '../../main/BaseRequire';
import type { TLoader } from '../../main/Module';
import type Module from '../../web/Module';

import cssLoader from './css';
import jsLoader from './js';

const PACKABLE_EXTENSION = ['js', 'css', 'wml', 'tmpl', 'html'];
const BUNDLE_EXTENSION = '.package';
const BUNDLE_MAP_NAME = 'packageMap.json';
const PERCENTAGE_BASE = 100;
// Задаем сколько процентов модулей из пакета должны быть загружены, чтобы мы его не грузили.
const PERCENTAGE_OF_LOADED_MODULES_TO_DISABLE = 50;

const loadingMap: Map<string, Promise<IFullPackagesInfo>> = new Map();

interface IModuleInfoWithPackage extends IModuleInfo {
    packagesInfo: IPackagesInfo;
}

interface ILoadedPackagesInfo extends IPackagesInfo {
    map: Record<string, string>;
}

interface IFullPackagesInfo extends ILoadedPackagesInfo {
    disabledMap: boolean;
    disabledPackages: Set<string>;
}

interface ILoadedStatusInfo {
    all: number;
    loaded: number;
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
 * Проверяет что инормация о пакетах полная
 * @param packagesInfo
 */
function isFullPackagesMap(packagesInfo: IPackagesInfo): packagesInfo is IFullPackagesInfo {
    return packagesInfo.hasOwnProperty('map');
}

/**
 * Получить полную информацию по пакетам.
 * @param packagesInfo Информация о пакетах.
 * @param context Require
 */
async function getFullPackagesInfo(
    packagesInfo: IPackagesInfo,
    context: IRequire<Module>
): Promise<IFullPackagesInfo> {
    let promise = loadingMap.get(packagesInfo.mapPath);

    if (!promise) {
        promise = loadFullPackageInfo(packagesInfo, context);

        loadingMap.set(packagesInfo.mapPath, promise);
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
    packagesInfo: IPackagesInfo,
    context: IRequire<Module>
): Promise<IFullPackagesInfo> {
    const packagesLoadedStatus: Record<string, ILoadedStatusInfo> = {};
    const disabledPackages: Set<string> = new Set();
    const normalizeMap: Record<string, string> = {};
    const map = (await context.require([packagesInfo.mapPath]))[0] as Record<string, string>;

    for (const [moduleName, packagePath] of Object.entries(map)) {
        const packageName = packagePath.split('.min.')[0];

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
        const percentageLoaded = Math.floor((loaded / all) * PERCENTAGE_BASE);

        if (percentageLoaded > PERCENTAGE_OF_LOADED_MODULES_TO_DISABLE) {
            disabledPackages.add(packageName);
        }
    }

    packagesInfo.map = normalizeMap;
    packagesInfo.disabledPackages = disabledPackages;
    packagesInfo.disabledMap = Object.keys(packagesInfo).length === disabledPackages.size;

    return packagesInfo as IFullPackagesInfo;
}

/**
 * Определяет и вызывает загрузчик, для пакета или для файла.
 * @param packagesInfo Информация о пакетах UI модуля
 * @param module Запрашиваемый модуль
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context Require
 * @param defaultLoader Дефолтный загрузчик, применяется, если модуль не в пакете.
 */
function callLoader(
    packagesInfo: IFullPackagesInfo,
    module: Module,
    moduleInfo: IModuleInfoWithPackage,
    context: IRequire<Module>,
    defaultLoader: TLoader<Promise<void>, Module>
): Promise<void> {
    if (packagesInfo.map.hasOwnProperty(module.name)) {
        const packagePath = packagesInfo.map[module.name];

        if (packagesInfo.disabledPackages.has(packagePath)) {
            return defaultLoader(module, moduleInfo, context);
        }

        module.path = packagePath;

        // TODO модуль может быть упакован в пакет из другого модуля.
        //  Поэтому необхоимо взяить moduleInfo по модулю, где живёт пакет, чтобы мы корректно построили url.
        //  Кастомные пакеты должны умереть с приходом паковки по pagex.
        const packageInfo = context.modulesInfo.get(packagePath.split('/')[0]) as IModuleInfo;

        if (module.extension === 'css') {
            return cssLoader(module, packageInfo);
        }

        return jsLoader(module, packageInfo);
    }

    return defaultLoader(module, moduleInfo, context);
}

/**
 * Проверяет что у модуля есть пакеты.
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 */
export function hasPackages(moduleInfo: IModuleInfo): moduleInfo is IModuleInfoWithPackage {
    return moduleInfo.hasOwnProperty('packagesInfo');
}

/**
 * Загружает и дефанит модули из пакетов
 * @param module Модуль
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context Require
 * @param defaultLoader Дефолтный загрузчик, применяется, если модуль не в пакете.
 */
export default async function (
    module: Module,
    moduleInfo: IModuleInfoWithPackage,
    context: IRequire<Module>,
    defaultLoader: TLoader<Promise<void>, Module>
): Promise<void> {
    if (
        isBundle(module.path) ||
        !isPackableExtension(module.extension) ||
        isBundlesMap(module.path) ||
        moduleInfo.packagesInfo.disabledMap
    ) {
        return defaultLoader(module, moduleInfo, context);
    }

    if (isFullPackagesMap(moduleInfo.packagesInfo)) {
        return callLoader(moduleInfo.packagesInfo, module, moduleInfo, context, defaultLoader);
    }

    const packagesInfo = await getFullPackagesInfo(moduleInfo.packagesInfo, context);

    return callLoader(packagesInfo, module, moduleInfo, context, defaultLoader);
}
