export type ModuleLoadCallback<T> = (name: string, implementation: T) => void;

export type ModulesManagerConstructor = new() => IModulesManager;

/**
 * Интерфейс менеджера модулей
 */
export default interface IModulesManager {
    /**
     * Загружает модули с указанными именами
     * @param modules Имена модулей для загрузки
     * @returns Загруженные модули
     */
    load<T>(modules: string[]): Promise<T>;

    /**
     * Выгружает модули с указанными именами
     * @param modules Имена модулей для загрузки
     */
    unload(modules: string[]): Promise<void>;

    /**
     * Подключает обработчик загрузки модуля
     * @param callback Обработчик
     */
    onModuleLoaded<T>(callback: ModuleLoadCallback<T>): void;

    /**
     * Отключает обработчик загрузки модуля
     * @param callback Обработчик
     */
    offModuleLoaded<T>(callback: ModuleLoadCallback<T>): void;
}
