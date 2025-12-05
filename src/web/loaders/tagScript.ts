const loading = new Map();

export interface RequireJsScriptElement extends HTMLScriptElement {
    name: string;
}

export default function (url: string, name: string, crossOrigin?: boolean): Promise<void> {
    if (loading.has(url)) {
        return loading.get(url);
    }

    const promise = new Promise<void>((resolve, reject) => {
        const node = document.createElement('script') as RequireJsScriptElement;

        node.type = 'text/javascript';
        node.async = true;
        node.src = url;
        node.name = name;

        if (crossOrigin) {
            node.crossOrigin = 'anonymous';
        }

        node.addEventListener('load', () => {
            loading.delete(url);
            node.remove();
            resolve();
        });
        node.addEventListener('error', (err) => {
            loading.delete(url);
            node.remove();
            reject(err);
        });

        document.head.appendChild(node);
    });

    loading.set(url, promise);

    return promise;
}
