export type ModulesManagerSyncConstructor = new() => IModulesManagerSync;

/**
 * Интерфейс синхронного менеджера модулей
 */
export default interface IModulesManagerSync {
    /**
     * Загружает модуль с указанными именами
     * @param modules Имена модулей для загрузки
     * @returns Загруженные модули
     */
    loadSync<T>(modules: string[]): T;

    /**
     * Выгружает модули с указанными именами
     * @param modules Имена модулей для выгрузки
     */
    unloadSync(modules: string[]): void;
}
