declare function TextRequest(url: string): string;

let load: (url: string) => string;

if (typeof TextRequest !== 'undefined') {
    load = TextRequest;
}

export default (url: string) => {
    return load(url);
};
