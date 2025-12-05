export default async function (url: string, crossOrigin?: boolean): Promise<string> {
    const response = await fetch(url, {
        mode: crossOrigin ? 'cors' : 'no-cors',
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.text();
}
