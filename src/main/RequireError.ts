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
        if (options?.cause && !this.cause) {
            const cause = options.cause;

            this.message += `Caused by: ${cause.message} Stack: ${cause.stack}`;
        }

        this.type = options?.type || '';
    }

    static isReqiureError(err: unknown): err is RequireError {
        return (err as RequireError)?.requireError;
    }
}
