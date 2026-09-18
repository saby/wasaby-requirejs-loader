/**
 * Загрузчик через тег link
 * @author Кудрявцев И.С.
 */

import isCrossOriginUrl from '../isCrossOriginUrl';

const loading = new Map();
const loadedLink = new Set();
const errorLink = new Map();

type loadedCallback = (link: HTMLLinkElement) => void;

function subscribeDownload(url: string, node: HTMLLinkElement, callback?: loadedCallback) {
    return new Promise<void>((resolve, reject) => {
        node.addEventListener('load', () => {
            loadedLink.add(url);
            loading.delete(url);

            if (callback) {
                callback(node);
            }

            resolve();
        });
        node.addEventListener('error', (err) => {
            errorLink.set(url, err);
            loading.delete(url);

            reject(err);
        });
    });
}

function processLinks(links: HTMLLinkElement[], callback: loadedCallback) {
    for (const link of links) {
        if (link.tagName !== 'LINK') {
            continue;
        }

        const url = link.getAttribute('href');

        if (!url) {
            continue;
        }

        if (link.sheet) {
            loadedLink.add(url);
            callback(link);

            continue;
        }

        if (!loading.has(url)) {
            loading.set(url, subscribeDownload(url, link, callback));
        }
    }
}

export function detectLinks(callback: loadedCallback) {
    processLinks(Array.from(document.head.children) as HTMLLinkElement[], callback);

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            processLinks(Array.from(mutation.addedNodes) as HTMLLinkElement[], callback);
        }
    });

    observer.observe(document.head, { childList: true });
}

/**
 * Загрузка файла через тег link
 * @param url  URL адресс файла
 */
export default function (url: string): Promise<void> {
    if (loadedLink.has(url)) {
        return Promise.resolve();
    }

    if (errorLink.has(url)) {
        return Promise.reject(errorLink.get(url));
    }

    if (loading.has(url)) {
        return loading.get(url);
    }

    const node = document.createElement('link');

    node.rel = 'stylesheet';
    node.href = url;

    if (isCrossOriginUrl(url)) {
        node.crossOrigin = 'anonymous';
    }

    const promise = subscribeDownload(url, node);

    loading.set(url, promise);

    document.head.appendChild(node);

    return promise;
}
