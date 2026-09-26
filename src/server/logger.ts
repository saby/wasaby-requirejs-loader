/**
 * Логгер для серверного Require-а
 * @author Кудрявцев И.С.
 */

declare const sbis: {
    LogMsg: (levelOrArg: number, ...args: string[]) => void;
    WarningMsg: (...args: string[]) => void;
    ErrorMsg: (...args: string[]) => void;
};

type TLogLevel = {
    info: (args: string[]) => void;
    log: (args: string[]) => void;
    warn: (args: string[]) => void;
    error: (args: string[]) => void;
};

/**
 * Вызывает нативную консоль
 * @param level Уровень логирования
 * @param args Аргументы
 */
function globalConsole(level: string, args: any[]) {
    /* eslint-disable-next-line no-console */
    if (typeof console === 'object' && typeof console[level as keyof TLogLevel] === 'function') {
        /* eslint-disable-next-line no-console */
        console[level as keyof TLogLevel].apply(undefined, args);
    }
}

/**
 * Класс серверного логгера
 */
class ServerConsole {
    /**
     * Логирования на уровне информационного сообщения
     * @param args
     */
    info(...args: string[]): void {
        if (typeof sbis === 'object' && typeof sbis.LogMsg === 'function') {
            sbis.LogMsg(2, `[js][info]: ${this.argsToString(args)}`);
        }

        globalConsole('info', args);
    }

    /**
     * Логирования на уровне обычного сообщения
     * @param args
     */
    log(...args: string[]): void {
        if (typeof sbis === 'object' && typeof sbis.LogMsg === 'function') {
            sbis.LogMsg(2, `[js][log]: ${this.argsToString(args)}`);
        }

        globalConsole('log', args);
    }

    /**
     * Логирования на уровне предупреждения
     * @param args
     */
    warn(...args: string[]): void {
        if (typeof sbis === 'object' && typeof sbis.WarningMsg === 'function') {
            sbis.WarningMsg(`[js]: ${this.argsToString(args)}`);
        }

        globalConsole('warn', args);
    }

    /**
     * Логирования на уровне ошибки
     * @param args
     */
    error(...args: string[]): void {
        if (typeof sbis === 'object' && typeof sbis.ErrorMsg === 'function') {
            sbis.ErrorMsg(`[js]: ${this.argsToString(args)}`);
        }

        globalConsole('error', args);
    }

    /**
     * Конвертурет аргументы в строку
     * @param args
     */
    private argsToString(args: unknown[]): string {
        return args.map(this.dataToString).join(', ');
    }

    /**
     * Конвертурет данные в строку
     * @param value
     * @private
     */
    private dataToString(value: unknown): string {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'function') {
            return value.toString();
        }
        if (value instanceof Error) {
            return `[${value.name}] message: ${value.message} \n stack: ${value.stack}`;
        }
        return JSON.stringify(value);
    }
}

export default new ServerConsole();
