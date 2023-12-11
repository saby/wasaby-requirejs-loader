export type ModuleLoadCallback<T> = (name: string, implementation: T) => T;

/**
 * Интерфейс обработчика модулей
 * @private
 */
export default interface IModulesHandler {
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
