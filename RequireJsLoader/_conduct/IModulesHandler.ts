export type ModuleLoadCallback = (name: string, implementation: unknown) => unknown;

/**
 * Интерфейс обработчика модулей
 * @private
 */
export default interface IModulesHandler {
    /**
     * Подключает обработчик загрузки модуля
     * @param callback Обработчик
     */
    onModuleLoaded(callback: ModuleLoadCallback): void;

    /**
     * Отключает обработчик загрузки модуля
     * @param callback Обработчик
     */
    offModuleLoaded(callback: ModuleLoadCallback): void;
}
