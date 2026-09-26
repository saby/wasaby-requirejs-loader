/**
 * Загрузчик через тег script
 * @author Кудрявцев И.С.
 */

import isCrossOriginUrl from '../isCrossOriginUrl';

const loading = new Map();

export interface RequireJsScriptElement extends HTMLScriptElement {
    name: string;
}

/**
 * Загрузка файла через тег script
 * @param url URL адресс файла
 * @param name Имя модуля
 */
export default function (url: string, name: string): Promise<void> {
    if (loading.has(url)) {
        return loading.get(url);
    }

    const promise = new Promise<void>((resolve, reject) => {
        const node = document.createElement('script') as RequireJsScriptElement;

        node.type = 'text/javascript';
        node.async = true;
        node.src = url;
        node.name = name;

        if (isCrossOriginUrl(url)) {
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
