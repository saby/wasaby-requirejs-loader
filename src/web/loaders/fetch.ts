/**
 * Fetch загрузчик
 * @author Кудрявцев И.С.
 */

import isCrossOriginUrl from '../isCrossOriginUrl';

const NOT_FOUND_CODE = 404;

function getFetchError(
    message: string,
    mode: string,
    start: number,
    httpCode?: number,
    statusText?: string
): Error {
    const duration = performance.now() - start;
    const code = httpCode ? `HTTP code: ${httpCode}\n` : '';
    const status = statusText ? `statusText: ${statusText}\n` : '';

    return new Error(
        `${message}\n${code}${status}mode: ${mode}\nnavigation.onLine: ${navigator.onLine}\nduration: ${duration}ms`
    );
}

/**
 * Получить объекет Response от fetch
 * @param url URL адресс файла
 * @param mode
 * @param start
 */
async function getResponse(url: string, mode: RequestMode, start: number): Promise<Response> {
    try {
        return await fetch(url, {
            mode,
        });
    } catch (err) {
        if ((err as Error).name === 'TypeError') {
            throw getFetchError(
                `Network/CORS/browser error: ${(err as Error).message}`,
                mode,
                start
            );
        }

        throw getFetchError(`Unknown fetch error: ${(err as Error).message}`, mode, start);
    }
}

/**
 * Загрузка файла через fetch
 * @param url  URL адресс файла
 */
export default async function (url: string): Promise<string> {
    const mode = isCrossOriginUrl(url) ? 'cors' : 'no-cors';
    const start = performance.now();
    const response = await getResponse(url, mode, start);

    if (!response.ok) {
        if (response.status === NOT_FOUND_CODE) {
            throw getFetchError(
                `File not found.`,
                mode,
                start,
                response.status,
                response.statusText
            );
        }

        throw getFetchError(`HTTP error!`, mode, start, response.status, response.statusText);
    }

    return response.text();
}
