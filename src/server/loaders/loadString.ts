/**
 * Серверный загрузчик модуля в строковом представление
 * @author Кудрявцев И.С.
 */

declare function TextRequest(url: string): string;

let load: (url: string) => string;

if (typeof TextRequest !== 'undefined') {
    load = TextRequest;
} else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const readFileSync = require('node:fs').readFileSync;

    load = (url: string) => {
        return readFileSync(url, 'utf8');
    };
}

export default load;
