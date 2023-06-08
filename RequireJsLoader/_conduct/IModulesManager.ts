export type ModulesManagerConstructor = new() => IModulesManager;

/**
 * Интерфейс менеджера модулей
 * @private
 */
export default interface IModulesManager {
    /**
     * Проверяет, что моудль загружен
     * @param module Имя модуля
     */
    isLoaded(module: string): boolean;

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
}
