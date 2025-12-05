declare function importScripts(url: string): void;

let load: (url: string) => void;

if (typeof importScripts !== 'undefined') {
    load = importScripts;
}

export default (url: string) => {
    load(url);
};
