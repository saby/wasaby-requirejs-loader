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

function globalConsole(level: string, args: any[]) {
    /* eslint-disable-next-line no-console */
    if (typeof console === 'object' && typeof console[level as keyof TLogLevel] === 'function') {
        /* eslint-disable-next-line no-console */
        console[level as keyof TLogLevel].apply(undefined, args);
    }
}

class ServerConsole {
    info(...args: string[]): void {
        if (typeof sbis === 'object' && typeof sbis.LogMsg === 'function') {
            sbis.LogMsg(2, `[js][info]: ${this.argsToString(args)}`);
        }

        globalConsole('info', args);
    }

    log(...args: string[]): void {
        if (typeof sbis === 'object' && typeof sbis.LogMsg === 'function') {
            sbis.LogMsg(2, `[js][log]: ${this.argsToString(args)}`);
        }

        globalConsole('log', args);
    }

    warn(...args: string[]): void {
        if (typeof sbis === 'object' && typeof sbis.WarningMsg === 'function') {
            sbis.WarningMsg(`[js]: ${this.argsToString(args)}`);
        }

        globalConsole('warn', args);
    }

    error(...args: string[]): void {
        if (typeof sbis === 'object' && typeof sbis.ErrorMsg === 'function') {
            sbis.ErrorMsg(`[js]: ${this.argsToString(args)}`);
        }

        globalConsole('error', args);
    }

    private argsToString(args: unknown[]): string {
        return args.map(this.dataToString).join(', ');
    }

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
