export type availableLoaders = 'wml' | 'js' | 'tmpl' | 'css' | 'i18n' | 'json' | 'text' | 'html';

const isFileInfo = Symbol('FILE_INFO');

export default class FileInfo {
    defineName: string;

    filePath: string;

    extension: availableLoaders;

    rootDir: string;

    needLoad: boolean;

    ignoreError: boolean;

    chain: string[];

    [isFileInfo]: boolean;

    constructor() {
        this.defineName = '';
        this.filePath = '';
        this.extension = 'js';
        this.rootDir = '';
        this.needLoad = true;
        this.ignoreError = false;
        this.chain = [];
        this[isFileInfo] = true;
    }

    static isFileInfo(value: unknown): value is FileInfo {
        return (value as FileInfo)?.[isFileInfo] === true;
    }
}
