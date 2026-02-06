interface ErrorOptions {
    type?: string;
    cause?: Error;
}

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

            this.message += `\nCaused by: ${cause.message} \nStack: ${cause.stack}`;
        }

        this.type = options?.type || '';
    }

    static isReqiureError(err: unknown): err is RequireError {
        // Не убирать явную проверку на true, отвалятся юниты из-за .ccs.json,
        // они там прокси возвращают, который просто имя запращиваемого поля вернёт.
        return (err as RequireError)?.requireError === true;
    }
}
