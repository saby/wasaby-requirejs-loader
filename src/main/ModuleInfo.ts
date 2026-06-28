export interface IPackagesInfo {
    mapPath: string;
    map?: Record<string, string>;
    disabledMap?: boolean;
    disabledPackages?: Set<string>;
}

const defaultPackageInfo = {
    mapPath: '',
};
const defaultUrlBuild = (res: string) => res;

type urlConstructor = (name: string, extension: string) => string;

export default class ModuleInfo {
    packagesInfo: IPackagesInfo;
    crossOrigin: boolean;
    templateExtension: string;
    ESVersion: number;
    hasTailwind: boolean;
    buildUrl: urlConstructor;
    buildPath: urlConstructor;

    constructor() {
        this.packagesInfo = defaultPackageInfo;
        this.crossOrigin = false;
        this.templateExtension = '';
        this.ESVersion = 0;
        this.hasTailwind = false;
        this.buildUrl = defaultUrlBuild;
        this.buildPath = function (res: string, extension: string): string {
            return this.buildUrl(res, extension);
        };
    }
}
