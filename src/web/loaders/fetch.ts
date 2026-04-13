const NOT_FOUND_CODE = 404;

function getResponse(url: string, crossOrigin?: boolean): Promise<Response> {
    try {
        return fetch(url, {
            mode: crossOrigin ? 'cors' : 'no-cors',
        });
    } catch (err) {
        if ((err as Error).name === 'TypeError') {
            throw new Error(`Network error or CORS:: ${(err as Error).message}`);
        }

        throw new Error(`Unknown fetch error: ${(err as Error).message}`);
    }
}

export default async function (url: string, crossOrigin?: boolean): Promise<string> {
    const response = await getResponse(url, crossOrigin);

    if (!response.ok) {
        if (response.status === NOT_FOUND_CODE) {
            throw new Error(`File not exist. HTTP code: ${response.status}`);
        }

        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.text();
}
