const loading = new Map();

let notInit = true;
const loadedLink = new Set();

export default function (url: string, crossOrigin?: boolean): Promise<void> {
    if (notInit) {
        const links = Array.from(document.getElementsByTagName('link'));

        for (const link of links) {
            loadedLink.add(link.getAttribute('href'));
        }

        notInit = false;
    }

    if (loadedLink.has(url)) {
        return Promise.resolve();
    }

    if (loading.has(url)) {
        return loading.get(url);
    }

    const promise = new Promise<void>((resolve, reject) => {
        const node = document.createElement('link');

        node.rel = 'stylesheet';
        node.href = url;

        if (crossOrigin) {
            node.crossOrigin = 'anonymous';
        }

        node.addEventListener('load', () => {
            loading.delete(url);
            loadedLink.add(url);

            resolve();
        });
        node.addEventListener('error', (err) => {
            loading.delete(url);

            reject(err);
        });

        document.head.appendChild(node);
    });

    loading.set(url, promise);

    return promise;
}
