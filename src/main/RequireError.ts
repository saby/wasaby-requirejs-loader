/**
 * Функционал для работы ошибок от Require-а
 * @author Кудрявцев И.С.
 */

type TypesRequireError =
    | 'load'
    | 'ChainError'
    | 'Executing callback'
    | 'Block'
    | 'SyncReqForNotLoaded';

interface ErrorOptions {
    type: TypesRequireError;
    cause?: Error;
}

/**
 * Класс для ошибки от Require
 */
export default class RequireError extends Error {
    requireError: boolean = true;
    type: TypesRequireError;
    origin: Error;

    constructor(message: string, options: ErrorOptions) {
        super(message);

        if (options?.cause) {
            const cause = options.cause;

            // Не используем нативны cause осознано, клеим причину в текст сами,
            // потому что в каких-то браузерах он не выводиться вообще и мы теряем причину,
            // в каких то выводиться и возникает дубирование текста в ошибке.
            this.origin = cause;

            this.message = `${this.message}\nCaused by: ${cause.message} \nStack: ${cause.stack}`;
        }

        this.type = options.type;
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
