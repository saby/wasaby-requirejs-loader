/**
 * Функционал для работы ошибок от Require-а
 * @author Кудрявцев И.С.
 */

interface ErrorOptions {
    type?: string;
    cause?: Error;
}

/**
 * Класс для ошибки от Require
 */
export default class RequireError extends Error {
    requireError: boolean = true;
    type: string;

    constructor(message: string | (string | RequireError | Error)[], options?: ErrorOptions) {
        // TODO Пришлось оставить тип описан для ES5, убрать как поднимем версию для TS.
        // @ts-ignore
        super(message, options);

        // TODO Пришлось оставить тип описан для ES5, убрать как поднимем версию для TS.
        // @ts-ignore
        if (options?.cause) {
            const cause = options.cause;

            this.message = `${this.message}\nCaused by: ${cause.message} \nStack: ${cause.stack}`;
        }

        this.type = options?.type || '';
    }

    /**
     * Проверка что это ошибка от Require
     * @param err Проверяемая ошибка
     */
    static isRequireError(err: unknown): err is RequireError {
        // Не убирать явную проверку на true, отвалятся юниты из-за .ccs.json,
        // они там прокси возвращают, который просто имя запращиваемого поля вернёт.
        return (err as RequireError)?.requireError === true;
    }
}
