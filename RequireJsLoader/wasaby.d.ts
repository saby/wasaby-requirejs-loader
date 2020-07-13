export interface IWsConfig {
    BUILD_MODE?: string;
    DEBUGGING_MODULES?: string[];
    IS_OVERALL_DEBUG?: boolean;
    IS_SERVER_SCRIPT?: boolean;
    showAlertOnTimeoutInBrowser?: boolean;
}

export interface IContents {
    buildnumber: string;
    modules: {
       [key: string]: IModule;
    };
    availableLanguage?: object;
}

interface IModule {
    buildnumber?: string;
    path?: string;
    dict?: string[];
    service?: string;
}
