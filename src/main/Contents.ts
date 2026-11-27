import { IContents, IModule } from 'RequireJsLoader/wasaby';

const DEFAULT_ES_VERSION = 2022;

type BuildMode = 'release' | 'debug';

interface IMinifiedModule extends IModule {
    b?: IModule['buildnumber'];
    d?: number | string[];
    p?: number;
    t?: number;
    f?: IModule['features'];
    cd?: string[];
}

interface IMinifiedContents extends IContents {
    modules?: Record<string, IMinifiedModule>;
}

const MINIFIED_FIELDS: string[] = [
    'buildnumber',
    'dict',
    'features',
    'hasBundles',
    'hasTailwind',
    'cssDict',
    'b',
    'd',
    'f',
    'p',
    't',
    'cd',
];

let supportedLangWithoutRu: readonly string[] = [];

export default class Contents {
    modules: Record<string, IModule>;
    version: string;
    ESVersion: number;
    buildMode: BuildMode;
    supportedLanguage: readonly string[];
    packedFilesRemoved: boolean;

    // TODO совместимстость удалить в 27.2100
    buildnumber: string;
    availableLanguage: Record<string, string>;

    constructor(contents: IMinifiedContents = {}) {
        this.version = contents.buildnumber || '99.999-1';
        this.ESVersion = contents.ESVersion || DEFAULT_ES_VERSION;
        this.buildMode = contents.buildMode || 'debug';
        this.supportedLanguage = Object.freeze(Object.keys(contents.availableLanguage || {}));
        this.packedFilesRemoved = contents.packedFilesRemoved || false;

        const langWithoutRu = [];
        for (const codeLang of this.supportedLanguage) {
            if (codeLang === 'ru') {
                continue;
            }

            langWithoutRu.push(codeLang);
        }

        supportedLangWithoutRu = Object.freeze(langWithoutRu);

        this.modules = this.normalizeModules(contents.modules);

        // TODO совместимстость удалить в 27.2100
        this.buildnumber = this.version;
        this.availableLanguage = contents.availableLanguage || {};
    }

    normalizeModules(modules: IMinifiedContents['modules'] = {}): Record<string, IModule> {
        const result: Record<string, IModule> = {};

        for (const [name, module] of Object.entries(modules)) {
            const info: IModule = {};

            for (const [nameField, value] of Object.entries(module)) {
                if (MINIFIED_FIELDS.includes(nameField)) {
                    continue;
                }

                //@ts-ignore
                info[nameField] = value;
            }

            const version = module.b || module.buildnumber;

            if (version) {
                info.buildnumber = version;
            }

            const hasBundles = module.p || module.hasBundles;

            if (hasBundles !== undefined) {
                info.hasBundles = Boolean(hasBundles);
            }

            const hasTailwind = module.t || module.hasTailwind;

            if (hasTailwind !== undefined) {
                info.hasTailwind = Boolean(hasTailwind);
            }

            const dict = module.d === undefined ? module.dict : module.d;
            const cssDict = module.cd || module.cssDict;

            if (cssDict !== undefined) {
                info.cssDict = cssDict;
            }

            if (dict !== undefined) {
                if (dict === 1) {
                    info.dict = [...this.supportedLanguage, ...(cssDict || [])];
                }

                if (dict === 0) {
                    info.dict = [...supportedLangWithoutRu, ...(cssDict || [])];
                }

                if (Array.isArray(dict)) {
                    info.dict = [...dict, ...(cssDict || [])];
                }
            }

            const features = module.f || module.features;

            if (features) {
                const normalizedFeatures: IMinifiedModule['features'] = {};

                for (const [facade, implementation] of Object.entries(features)) {
                    let fullFacade;
                    let fullImpl;

                    if (facade.startsWith(name)) {
                        fullFacade = facade;
                        fullImpl = facade.replace(name, implementation);
                    } else {
                        fullFacade = `${name}/${facade}`;
                        fullImpl = `${implementation}/${facade}`;
                    }

                    if (fullFacade !== fullImpl) {
                        normalizedFeatures[fullFacade] = fullImpl;
                    }
                }

                info.features = Object.freeze(normalizedFeatures);
            }

            result[name] = info;
        }

        return result;
    }
}
