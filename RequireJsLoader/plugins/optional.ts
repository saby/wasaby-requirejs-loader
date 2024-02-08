/**
 * RequireJS plugin which allows deal with not exists modules
 */

import { isModuleDefined } from '../conduct';
import { IXhrRequireError, IPluginLoadFunction } from '../require.ext';
import { IPatchedGlobal } from '../wasaby';

// Superglobal object
const GLOBAL = globalThis as unknown as IPatchedGlobal;

// Error type related to the timeout
const REQUIRE_TIMEOUT_TYPE = 'timeout';

// HTTP code related to not found error
const HTTP_STATUS_NOT_FOUND = 404;

// Interface modules names map for some legacy modules
const PLATFORM_MAP: { [name: string]: string } = {
    WS: 'WS.Core',
    Core: 'WS.Core',
    Lib: 'WS.Core',
    Ext: 'WS.Core',
    Helpers: 'WS.Core',
    Transport: 'WS.Core',
    Resources: 'WS.Core',
    Deprecated: 'WS.Deprecated',
};

const CSS_PLUGIN_PREFIX_LENGTH = 4;

// A sign that alert has been shown
let hasShownAlertOnTimeoutInBrowser = false;

/**
 * Shows an alert about potential connection problems in browser
 * @param err Module loading error
 */
function showAlertOnTimeoutInBrowser(err: RequireError): void {
    // Determine the necessity of alert
    if (
        // Show alert just once
        hasShownAlertOnTimeoutInBrowser ||
        // Show alert only in browser
        typeof window === 'undefined' ||
        // Show alert only for timeout errors
        !err ||
        err.requireType !== REQUIRE_TIMEOUT_TYPE
    ) {
        return;
    }

    // Check config flag which also determines the alert necessity
    if (GLOBAL.wsConfig && GLOBAL.wsConfig.showAlertOnTimeoutInBrowser === false) {
        return;
    }

    // Skip errors related to CSS modules
    const importantModules =
        err.requireModules?.filter(
            (moduleName) => moduleName.substr(0, CSS_PLUGIN_PREFIX_LENGTH) !== 'css!'
        ) || [];

    if (importantModules.length === 0) {
        return;
    }

    // Show an alert
    hasShownAlertOnTimeoutInBrowser = true;
    alert('Произошла ошибка загрузки ресурса. Проверьте интернет соединение и повторите попытку.');

    // Throw an original error to not break normal errors handling process
    throw err;
}

/**
 * Returns a sign that given error is about the fact that module was not found
 * @param error Module loading error
 */
function isNotFoundError(error: IXhrRequireError): boolean {
    if (!error) {
        return false;
    }

    // Handle RequireJS errors
    switch (error.requireType) {
        case 'scripterror':
            return true;
        case 'define':
            return String(error.message).indexOf("tried node's require(") > -1;
    }

    // Handle XMLHttpRequest errors
    if (error.xhr && error.xhr.status === HTTP_STATUS_NOT_FOUND) {
        return true;
    }

    return false;
}

function onLoadError(name: string, error: Error, onLoad: IPluginLoadFunction): void {
    if (error.message) {
        error.message = `Failed to load "optional!${name}": ${error.message}`;
    }

    onLoad.error(error);
}

export = {
    load(name: string, require: Require, onLoad: IPluginLoadFunction): void {
        // Check if modules list is available and release mode is on
        // In this case we can understand module unavailability without sending a real request
        const contents = GLOBAL.contents;
        if (contents && contents.buildMode === 'release' && contents.modules) {
            let moduleName: string | undefined = name.split('/')[0];
            const plugins = moduleName.split(/[!?]/);

            moduleName = plugins.pop();

            // Some old platform modules have mismatched names
            if (moduleName && PLATFORM_MAP[moduleName]) {
                moduleName = PLATFORM_MAP[moduleName];
            }

            // Don't apply fast check for some plugins
            if (plugins.indexOf('css') === -1 && plugins.indexOf('remote') === -1) {
                // Fast check using modules list
                if (moduleName && !(moduleName in contents.modules)) {
                    onLoad(null);
                    return;
                }
            }
        }

        try {
            // Try to return module synchronously if it's already loaded
            if (isModuleDefined(require, name)) {
                onLoad(require(name));
                return;
            }

            // Try to return module asynchronously
            require([name], onLoad, (error: RequireError): void => {
                showAlertOnTimeoutInBrowser(error);

                if (isNotFoundError(error as IXhrRequireError)) {
                    onLoad(null);
                    return;
                }

                onLoadError(name, error, onLoad);
            });
        } catch (error) {
            onLoadError(name, error as Error, onLoad);
        }
    },
};
