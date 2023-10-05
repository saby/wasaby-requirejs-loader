export type ModulesManagerSyncConstructor = new() => IModulesManagerSync;

/**
 * Интерфейс синхронного менеджера модулей
 * @private
 */
export default interface IModulesManagerSync {
    /**
     * Загружает модуль с указанными именами
     * @param module Имена модулей для загрузки
     * @returns Загруженные модули
     */
    loadSync<T>(module: string): T;

    /**
     * Выгружает модули с указанными именами
     * @param module Имена модулей для выгрузки
     */
    unloadSync(module: string): void;
}
