/**
 * Fetch загрузчик
 * @author Кудрявцев И.С.
 */

import isCrossOriginUrl from '../isCrossOriginUrl';

const NOT_FOUND_CODE = 404;

/**
 * Получить объекет Response от fetch
 * @param url URL адресс файла
 */
function getResponse(url: string): Promise<Response> {
    try {
        return fetch(url, {
            mode: isCrossOriginUrl(url) ? 'cors' : 'no-cors',
        });
    } catch (err) {
        if ((err as Error).name === 'TypeError') {
            throw new Error(`Network error or CORS:: ${(err as Error).message}`);
        }

        throw new Error(`Unknown fetch error: ${(err as Error).message}`);
    }
}

/**
 * Загрузка файла через fetch
 * @param url  URL адресс файла
 */
export default async function (url: string): Promise<string> {
    const response = await getResponse(url);

    if (!response.ok) {
        if (response.status === NOT_FOUND_CODE) {
            throw new Error(`File not exist. HTTP code: ${response.status}`);
        }

        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.text();
}
