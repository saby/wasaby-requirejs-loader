/**
 * Серверный загрузчик модуля в строковом представление
 * @author Кудрявцев И.С.
 */

declare function TextRequest(path: string): string;

let load: (path: string) => string;

if (typeof TextRequest !== 'undefined') {
    load = TextRequest;
} else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const readFileSync = require('node:fs').readFileSync;

    load = (path: string): string => {
        return readFileSync(path, 'utf8');
    };
}

export default load;
