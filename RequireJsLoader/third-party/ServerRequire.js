//# allFunctionsCalledOnLoad
(function () {
    'use strict';

    /**
     * Функционал для работы ошибок от Require-а
     * @author Кудрявцев И.С.
     */
    /**
     * Класс для ошибки от Require
     */
    class RequireError extends Error {
        constructor(message, options) {
            // TODO Пришлось оставить тип описан для ES5, убрать как поднимем версию для TS.
            // @ts-ignore
            super(message, options);
            this.requireError = true;
            // TODO Пришлось оставить тип описан для ES5, убрать как поднимем версию для TS.
            // @ts-ignore
            if (options === null || options === void 0 ? void 0 : options.cause) {
                const cause = options.cause;
                this.message = `${this.message}\nCaused by: ${cause.message} \nStack: ${cause.stack}`;
            }
            this.type = (options === null || options === void 0 ? void 0 : options.type) || '';
        }
        /**
         * Проверка что это ошибка от Require
         * @param err Проверяемая ошибка
         */
        static isRequireError(err) {
            // Не убирать явную проверку на true, отвалятся юниты из-за .ccs.json,
            // они там прокси возвращают, который просто имя запращиваемого поля вернёт.
            return (err === null || err === void 0 ? void 0 : err.requireError) === true;
        }
    }

    // @ts-ignore
    const globalEnv$2 = globalThis;
    /**
     * Возвращает шардированый домен, если он есть
     */
    function getShardDomain() {
        return globalEnv$2.wsConfig.shardDomain || '';
    }

    /**
     * Возвращает домен для статики, если он есть
     */
    function getStaticsDomain() {
        var _a, _b;
        // @ts-ignore
        const globalEnv = globalThis;
        let domain = '';
        if (Array.isArray(globalEnv.wsConfig.staticDomains)) {
            domain = globalEnv.wsConfig.staticDomains[0];
        }
        else {
            // @ts-ignore
            domain = (_b = (_a = globalEnv.wsConfig.staticDomains) === null || _a === void 0 ? void 0 : _a.domains) === null || _b === void 0 ? void 0 : _b[0];
        }
        return domain ? `//${domain}` : '';
    }

    /**
     * Возвращает карту для резолвинга коротких имён модулей
     * @author Кудрявцев И.С.
     * @param reactVersion Версия реакта
     */
    function getModuleResolution(reactVersion) {
        const reactRoot = 'React/third-party';
        const cdnName = 'cdn/';
        const useExternalNameSpace = `use-sync-external-store/use-sync-external-store`;
        const map = {
            tslib: 'Typescript/tslib',
            text: 'RequireJsLoader/plugins/text',
            'native-css': 'RequireJsLoader/plugins/native-css',
            // TODO Юзает биллинг, убрать не можем.
            bootup: 'WS.Core/res/js/bootup',
            'bootup-min': 'WS.Core/res/js/bootup-min',
            'old-bootup': 'WS.Core/res/js/old-bootup',
            // React
            react: `${reactRoot}/v${reactVersion}/react/react`,
            'react/jsx-dev-runtime': `${reactRoot}/v${reactVersion}/react/jsx-dev-runtime/react-jsx-dev-runtime`,
            'react/jsx-runtime': `${reactRoot}/v${reactVersion}/react/jsx-runtime/react-jsx-runtime`,
            'react/react-server': `${reactRoot}/v${reactVersion}/react/react-server`,
            'react-compiler-runtime': `${reactRoot}/v${reactVersion}/react/react-compiler-runtime`,
            // React DOM
            'react-dom': `${reactRoot}/v${reactVersion}/react-dom/react-dom`,
            'react-dom/client': `${reactRoot}/v${reactVersion}/react-dom/client/react-dom-client`,
            'react-dom/server': `${reactRoot}/v${reactVersion}/react-dom/server/react-dom-server-legacy.browser`,
            'react-dom/test-utils': `${reactRoot}/v${reactVersion}/react-dom/test-utils/react-dom-test-utils`,
            'react-dom/testing': 'v17/react-dom/testing/react-dom-testing',
            'react-dom/profiling': `${reactRoot}/v${reactVersion}/react-dom/react-dom-profiling`,
            // React Test Renderer
            'react-test-renderer': 'v17/react-test-renderer/react-test-renderer',
            // React Reconciler
            'react-reconciler': `${reactRoot}/v${reactVersion}/react-reconciler/react-reconciler`,
            // React Is, Cache, Refresh, Server
            'react-is': `${reactRoot}/v${reactVersion}/react-is/react-is`,
            'react-cache': `${reactRoot}/v${reactVersion}/react-cache/react-cache`,
            'react-refresh/babel': `${reactRoot}/v19/react-refresh/react-refresh-babel`,
            'react-refresh/runtime': `${reactRoot}/v${reactVersion}/react-refresh/react-refresh-runtime`,
            'react-server': `${reactRoot}/v${reactVersion}/react-server/react-server`,
            // Scheduler
            'scheduler-react': `${reactRoot}/v${reactVersion}/scheduler/scheduler`,
            'scheduler-react/unstable_mock': `${reactRoot}/v${reactVersion}/scheduler/scheduler-unstable_mock`,
            'scheduler-react/unstable_post_task': `${reactRoot}/v${reactVersion}/scheduler/scheduler-unstable_post_task`,
            'scheduler-react/native': 'v19/scheduler/scheduler.native',
            scheduler: `${reactRoot}/v${reactVersion}/scheduler/scheduler`,
            'scheduler/unstable_mock': `${reactRoot}/v${reactVersion}/scheduler/scheduler-unstable_mock`,
            'scheduler/unstable_post_task': `${reactRoot}/v${reactVersion}/scheduler/scheduler-unstable_post_task`,
            'scheduler/native': 'v19/scheduler/scheduler.native',
            // use-subscription, use-sync-external-store
            'use-subscription': `${reactRoot}/v${reactVersion}/use-subscription/use-subscription`,
            'use-sync-external-store': `${reactRoot}/v${reactVersion}/${useExternalNameSpace}`,
            'use-sync-external-store/shim': `${reactRoot}/v${reactVersion}/${useExternalNameSpace}-shim`,
            'use-sync-external-store/shim/with-selector': `${reactRoot}/v${reactVersion}/${useExternalNameSpace}-shim-with-selector`,
            'use-sync-external-store/with-selector': `${reactRoot}/v${reactVersion}/${useExternalNameSpace}-with-selector`,
            'use-sync-external-store/shim/index.native': `${reactRoot}/v${reactVersion}/${useExternalNameSpace}-shim.native`,
            clsx: 'Clsx/third-party/clsx',
            // pixi libraries
            pixi: `${cdnName}PixiJS/6.5.10-p3/pixi.min.js`,
            'pixi-react': `${cdnName}PixiReact/6.8.0-p2/pixi-react.min.js`,
            pixi8: `${cdnName}PixiJS/8.18.1-p2/pixi.min.js`,
            'pixi-react7': `${cdnName}PixiReact/7.1.3-p1/pixi-react.min.js`,
            'pixi-react8': `${cdnName}PixiReact/8.0.4-p2/pixi-react.min.js`,
            // jQuery must die
            jquery: `${cdnName}JQuery/jquery/3.3.1/jquery-min.js`,
        };
        const result = new Map();
        for (const [defineName, path] of Object.entries(map)) {
            result.set(defineName, [path.split('/')[0], path]);
        }
        return result;
    }

    const EMPTY_ARRAY = [];
    const RETRIEVABLE_TYPES = ['object', 'function'];
    const IS_BROWSER = typeof window !== 'undefined';
    const EMPTY_FUNC = () => null;
    const MODIFICATOR_IS = 'is!';
    const MODIFICATOR_IS_BROWSER = '!browser?';
    const MODIFICATOR_IS_COMPATIBLE = '!compatibleLayer?';
    const MODIFICATOR_BROWSER = 'browser!';
    const MODIFICATOR_OPTIONAL = 'optional!';
    const PLUGIN_SEPARATOR = '!';
    const CHAIN_SEPARATOR = ':';
    const SLASH = '/';
    const DEFAULT_REACT_VERSION = 19;
    const ALIAS_MAP = new Map(Object.entries({
        WS: ['WS.Core', 'WS.Core'],
        Core: ['WS.Core', 'WS.Core/core'],
        Lib: ['WS.Core', 'WS.Core/lib'],
        Ext: ['WS.Core', 'WS.Core/lib/Ext'],
        Helpers: ['WS.Core', 'WS.Core/core/helpers'],
        Transport: ['WS.Core', 'WS.Core/transport'],
        Deprecated: ['WS.Deprecated', 'WS.Deprecated'],
    }));
    const EXTENSION_WITHOUT_MIN = new Set([
        'txt',
        'woff2',
        'webp',
        'jpg',
        'jpeg',
        'png',
        'svg',
        'xsl',
        'gif',
        'ico',
    ]);
    // @ts-ignore
    const globalEnv$1 = globalThis;
    function isRetrievableObject(obj) {
        return !!obj && RETRIEVABLE_TYPES.includes(typeof obj);
    }
    const NO_CACHE = Symbol('NO_CACHE');
    const DEFINE_MODULE = Symbol('DEFINE_MODULE');
    /**
     * Базовый класс require-а
     */
    class BaseRequire {
        constructor() {
            var _a, _b;
            const contents = globalEnv$1.contents || {};
            const wsConfig = globalEnv$1.wsConfig || {};
            this.modules = contents.modules || {};
            this.modulesResolution = getModuleResolution(((_a = this.modules.React) === null || _a === void 0 ? void 0 : _a.version) || DEFAULT_REACT_VERSION);
            this.buildMode = contents.buildMode || 'debug';
            this.templateExtension = ((_b = globalEnv$1.contents) === null || _b === void 0 ? void 0 : _b.extensionForTemplate) || '';
            this.cache = new Map();
            this.errorsCache = new Map();
            this.definedMap = new Map();
            this.listenerOnLoad = new Set();
            this.compatibleMode = false;
            this.currentModule = '';
            this.staticsRoot = wsConfig.resourceRoot || '/resources/';
            this.metaRoot = wsConfig.metaRoot || globalEnv$1.metaRoot || '';
            this.cdnRoot = wsConfig.cdnRoot || '/cdn/';
            this.defaultVersion = contents.buildnumber || '99.9999-1';
            this.defaultESVersion = contents.ESVersion || 0;
        }
        getDebugCookie() {
            return '';
        }
        isDebugModule(moduleName) {
            if (this.buildMode === 'debug') {
                return true;
            }
            const debug = this.getDebugCookie();
            if (debug && debug !== 'false') {
                if (debug === 'true') {
                    return true;
                }
                if (moduleName === 'React') {
                    return true;
                }
                return debug.split(',').includes(moduleName);
            }
            return false;
        }
        enableRtlDirection() {
            return false;
        }
        // 1) мы не можем использовать cdn-домены для svg. Svg <use> элементы имеют ограничения на кросс-доменные
        // запросы, допускается только same-origin
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/use#usage_notes
        // есть решение данной проблемы через тег <feImage>
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/use#usage_notes
        // но внедрить его пока не можем из-за того, что данная технология работает только начиная с
        // Chrome 118, Safari 17.2 и тд, данный костыль и переход сможем сделать после поднятия в Тензоре
        // минимально поддерживаемых версий браузеров
        // 3) we can't use domains for manifest.json requests because manifest uses relative urls
        // and with cdn-domain there will be cross domain request for this manifest, but cross domain
        buildUrl(filePath, extension) {
            const moduleName = this.getRootDir(filePath);
            if (moduleName === 'cdn') {
                const cdnFilePath = filePath.replace('cdn/', '');
                let staticDomain = '';
                if (extension !== 'svg' && !moduleName.endsWith('/manifest')) {
                    staticDomain = getStaticsDomain();
                }
                if (cdnFilePath.endsWith(extension)) {
                    return `${staticDomain}${this.cdnRoot}${cdnFilePath}`;
                }
                return `${staticDomain}${this.cdnRoot}${cdnFilePath}.${extension}`;
            }
            const moduleInfo = this.modules[moduleName];
            if (!moduleInfo) {
                const shardDomain = getShardDomain();
                if (this.buildMode === 'debug') {
                    return `${shardDomain}${this.metaRoot}${filePath}.${extension}?x_module=${this.defaultVersion}`;
                }
                return `${shardDomain}${this.metaRoot}${filePath}.min.${extension}?x_module=${this.defaultVersion}`;
            }
            const postfixForMinVersion = this.isDebugModule(moduleName) ? '' : '.min';
            const domain = moduleInfo.from_ps === 'true' ? '' : getStaticsDomain();
            const queryParams = `?x_module=${moduleInfo.buildnumber || this.defaultVersion}`;
            const root = moduleInfo.path
                ? moduleInfo.path.slice(0, moduleInfo.path.lastIndexOf('/') + 1)
                : this.staticsRoot;
            if (extension === 'svg') {
                return `${root}${filePath}.${extension}${queryParams}`;
            }
            if (EXTENSION_WITHOUT_MIN.has(extension)) {
                return `${domain}${root}${filePath}.${extension}${queryParams}`;
            }
            if (extension === 'css' && !filePath.endsWith('.rtl') && this.enableRtlDirection()) {
                return `${domain}${root}${filePath}.rtl${postfixForMinVersion}.${extension}${queryParams}`;
            }
            return `${domain}${root}${filePath}${postfixForMinVersion}.${extension}${queryParams}`;
        }
        define(name, deps, callback) {
            let defineName = name;
            let dependencies = deps;
            let callbackFn = callback;
            // Если модуль анонимный будем искать его по url.
            if (typeof name !== 'string') {
                defineName = this.detectAnonymousModule();
                dependencies = name;
                callbackFn = deps;
            }
            if (this.cache.has(defineName) || this.definedMap.has(defineName)) {
                return;
            }
            if (typeof dependencies === 'function') {
                //@ts-ignore
                this.definedMap.set(defineName, [EMPTY_ARRAY, dependencies]);
            }
            else {
                //@ts-ignore
                this.definedMap.set(defineName, [dependencies, callbackFn || EMPTY_FUNC]);
            }
        }
        detectAnonymousModule() {
            return '';
        }
        /**
         * Добавялет обрабтчик на события загрузки модуля
         * @param callback Функция обработчик
         */
        onLoadModule(callback) {
            this.listenerOnLoad.add(callback);
        }
        /**
         * Удаляет обрабтчик на события загрузки модуля
         * @param callback Функция обработчик
         */
        offLoadModule(callback) {
            this.listenerOnLoad.delete(callback);
        }
        defined(name) {
            if (name && typeof name === 'string') {
                // Проверим сначал кеш по имени, которое передали в require
                if (this.cache.has(name)) {
                    return true;
                }
                // Если запросили модуль с условиям, например, только для браузера и оно не прошло,
                // то можно отдать сразу null и не пытаться ничего грузить.
                if (!this.moduleNeedsLoaded(name)) {
                    this.cache.set(name, null);
                    return true;
                }
                // Проверяем нет ли в кеши модуля по имене, которое указано у него в define.
                if (this.cache.has(this.getDefineName(name))) {
                    return true;
                }
            }
            return false;
        }
        loaded(name) {
            if (name && typeof name === 'string') {
                const defineName = this.getDefineName(name);
                if (this.cache.has(defineName)) {
                    return true;
                }
                if (this.definedMap.has(defineName)) {
                    return true;
                }
            }
            return false;
        }
        undef(name) {
            const defineName = this.getDefineName(name);
            this.definedMap.delete(defineName);
            for (const nameModule of this.cache.keys()) {
                if (!nameModule.includes(defineName)) {
                    continue;
                }
                const defineNameCache = this.getDefineName(nameModule);
                if (defineNameCache === defineName) {
                    this.cache.delete(defineNameCache);
                }
            }
        }
        /**
         * Резолвит относительную зависимость до полноценного имени модуля.
         * @param relName
         */
        getRelName(relName) {
            const result = this.currentModule.split(SLASH);
            const splitRelName = relName.split(SLASH);
            result.pop();
            for (const dirName of splitRelName) {
                if (dirName === '.') {
                    continue;
                }
                if (dirName === '..') {
                    result.pop();
                    continue;
                }
                result.push(dirName);
            }
            return result.join(SLASH);
        }
        /**
         * Приводит имя к нормальному виду.
         * @param name Имя модуля
         */
        normalizeName(name) {
            if (name[0] === '.' && this.currentModule) {
                return this.getRelName(name);
            }
            return name;
        }
        /**
         * Нужно ли грузить модуль
         * @param defineName Имя модуля
         */
        moduleNeedsLoaded(moduleName) {
            let result = true;
            if (moduleName.includes(MODIFICATOR_OPTIONAL)) {
                const defineName = this.getDefineName(moduleName);
                const rootDir = this.getRootDir(this.getModulePath(defineName));
                if (rootDir !== 'cdn') {
                    result = this.modules.hasOwnProperty(rootDir);
                    if (!result) {
                        return false;
                    }
                }
            }
            if (moduleName.includes(MODIFICATOR_BROWSER)) {
                return IS_BROWSER;
            }
            const start = moduleName.indexOf(MODIFICATOR_IS);
            if (start !== -1) {
                if (moduleName.includes(MODIFICATOR_IS_BROWSER, start)) {
                    return IS_BROWSER;
                }
                if (moduleName.includes(MODIFICATOR_IS_COMPATIBLE, start)) {
                    return this.compatibleMode;
                }
            }
            return true;
        }
        /**
         *
         * @param moduleName
         * @constructor
         */
        ignoreLoadError(moduleName) {
            return moduleName.includes(MODIFICATOR_OPTIONAL);
        }
        sliceByIndexes(moduleName, start, end) {
            if (end === -1) {
                if (start === 0) {
                    return moduleName;
                }
                return moduleName.slice(start);
            }
            return moduleName.slice(start, end);
        }
        /**
         *
         * @param moduleName
         */
        getDefineName(moduleName) {
            const start = this._getStartDefineName(moduleName);
            return this.sliceByIndexes(moduleName, start, moduleName.indexOf(CHAIN_SEPARATOR, start));
        }
        /**
         *
         * @param defineName
         */
        getModulePath(defineName) {
            const resolvedName = this.modulesResolution.get(defineName);
            if (resolvedName) {
                return resolvedName[1];
            }
            let start = defineName.indexOf(PLUGIN_SEPARATOR);
            start = start === -1 ? 0 : start + 1;
            if (defineName[start] === SLASH) {
                start++;
            }
            const path = this.sliceByIndexes(defineName, start, defineName.indexOf(CHAIN_SEPARATOR, start));
            const rootDir = this.getRootDir(path);
            const alias = ALIAS_MAP.get(rootDir);
            if (alias) {
                return path.replace(rootDir, alias[1]);
            }
            return path;
        }
        getRootDir(modulePath) {
            const rootIndex = modulePath.indexOf(SLASH);
            if (rootIndex === -1) {
                return modulePath;
            }
            return modulePath.slice(0, rootIndex);
        }
        getLoaderName(defineName) {
            const indexLoader = defineName.indexOf(PLUGIN_SEPARATOR);
            if (indexLoader === -1) {
                return 'js';
            }
            return defineName.slice(0, indexLoader);
        }
        _getStartDefineName(moduleName) {
            const optionalIndex = moduleName.indexOf(MODIFICATOR_OPTIONAL);
            const isIndex = moduleName.indexOf(MODIFICATOR_IS);
            const browserIndex = moduleName.indexOf(MODIFICATOR_BROWSER);
            if (optionalIndex === -1 && isIndex === -1 && browserIndex === -1) {
                return 0;
            }
            if (optionalIndex > isIndex && optionalIndex > browserIndex) {
                return optionalIndex + MODIFICATOR_OPTIONAL.length;
            }
            if (browserIndex > isIndex) {
                return browserIndex + MODIFICATOR_BROWSER.length;
            }
            const isBrowserIndex = moduleName.indexOf(MODIFICATOR_IS_BROWSER, isIndex);
            if (isBrowserIndex !== -1) {
                return isBrowserIndex + MODIFICATOR_IS_BROWSER.length;
            }
            const isCompatibleIndex = moduleName.indexOf(MODIFICATOR_IS_BROWSER, isIndex);
            if (isCompatibleIndex !== -1) {
                return isCompatibleIndex + MODIFICATOR_IS_COMPATIBLE.length;
            }
            return 0;
        }
        /**
         * Извлекает экспортируюмую сущность из модуля.
         * @param depsName Имена зависимостей.
         * @param depsValue Экспорты зависимостей
         */
        extractExports(depsName, depsValue) {
            const module = depsValue[depsName.indexOf('module')];
            const exports = depsValue[depsName.indexOf('exports')];
            if (exports) {
                if (module && Object.keys(exports).length === 0) {
                    // @ts-ignore
                    return module.exports;
                }
                return exports;
            }
            // TODO Сомвестимсоть со старым.
            //  В архи старых модулях юзат зависимость "module", которая возвращает в объект с полем export,
            //  в него и склыдвают, что должен возрвращать модуль.
            //  Поэтому придёться обработь сия кейс и забирать от туда результат.
            //  Чтобы откатазать от этого кейса надо все переписать на просто return
            if (module) {
                // @ts-ignore
                return module.exports;
            }
        }
        executeCallback(defineName, callback, depsExports, depsName) {
            let exports;
            // В этой точке конетекст может быть перебить зависимостями, поэтому выставялем его снова.
            // Внутри колбека могут вызывать синхроный require с относительным именем.
            this.currentModule = defineName;
            if (depsExports && depsName) {
                const innerExports = depsExports[depsName.indexOf('exports')];
                if (innerExports) {
                    exports = callback.apply(innerExports, depsExports);
                }
                else {
                    exports = callback(...depsExports);
                }
                if (!exports) {
                    exports = this.extractExports(depsName, depsExports);
                }
            }
            else {
                exports = callback();
            }
            // В этой точке конетекст может быть перебить зависимостями, поэтому выставялем его снова.
            // Внутри колбека могут вызывать синхроный require с относительным именем.
            this.currentModule = '';
            return exports;
        }
        /**
         * Резоливит промисс на require-инг модулей. Если есть ошибки, то режектит только первую.
         * @param results Список модулей.
         * @param errors Список ошибок.
         */
        firePromise(results, errors) {
            if (errors.length === 0) {
                return Promise.resolve(results);
            }
            return Promise.reject(errors[0]);
        }
        /**
         * Вызывает обрбаотчики require-инг модулей.
         * @param results Список модулей.
         * @param errors Список ошибок.
         * @param successCallback Обработчик на успех.
         * @param errorCallback Обрабочик на ошибку.
         */
        fireCallbacks(results, errors, successCallback, errorCallback) {
            if (errors.length === 0) {
                successCallback(...results);
                return;
            }
            if (errorCallback) {
                for (const err of errors) {
                    errorCallback(err);
                }
            }
        }
        /**
         * Извлекает модуль из кеша, либо отдаёт сигнал что его нет в кеше.
         * @param fullName Полное имя, как его зарейкварили
         * @param defineName Имя с котормы его должны дефайнить
         * @param needLoad Необходимо ли грузить модуль, если его нет.
         * @param chain Цепочка для получения результата.
         * @param ignoreError Игнорировать ли ошибку.
         */
        extractCache(fullName) {
            // Обработка для служебного зависимости exports, отдаём объект,
            // который будет наполнен експортируемыми сущностями.
            if (fullName === 'exports') {
                return {};
            }
            // TODO Сомвестимсоть со старым.
            //  В архи старых модулях юзат зависимость "module", которая возвращает в объект с полем export,
            //  в него и склыдвают, что должен возрвращать модуль.
            //  Поэтому придёться обработь сия кейс и забирать от туда результат.
            //  Чтобы откатазать от этого кейса надо все переписать на простой return
            if (fullName === 'module') {
                return {
                    exports: {},
                };
            }
            // Проверим сначал кеш по имени, которое передали в require
            if (this.cache.has(fullName)) {
                return this.cache.get(fullName);
            }
            // Если запросили модуль с условиям, например, только для браузера и оно не прошло,
            // то можно отдать сразу null и не пытаться ничего грузить.
            if (!this.moduleNeedsLoaded(fullName)) {
                this.cache.set(fullName, null);
                return null;
            }
            const defineName = this.getDefineName(fullName);
            // Проверяем нет ли в кеши модуля по имене, которое указано у него в define.
            if (this.cache.has(defineName)) {
                const res = this.extractChain(this.cache.get(defineName), fullName);
                this.cache.set(fullName, res);
                return res;
            }
            return NO_CACHE;
        }
        extractErrorCache(name) {
            const err = this.errorsCache.get(name);
            if (err) {
                return err;
            }
            const defineErr = this.errorsCache.get(this.getDefineName(name));
            if (defineErr) {
                return defineErr;
            }
        }
        injectCache(name, module, ignoreError) {
            if (RequireError.isRequireError(module)) {
                if (ignoreError && module.type === 'load') {
                    this.cache.set(name, null);
                    return null;
                }
                this.errorsCache.set(name, module);
                throw module;
            }
            this.cache.set(name, module);
            return module;
        }
        extractChain(module, fullName) {
            const chainIndex = fullName.indexOf(CHAIN_SEPARATOR);
            if (chainIndex === -1) {
                return module;
            }
            const chain = fullName.slice(chainIndex + 1).split('.');
            let result = module;
            for (const nameProp of chain) {
                if (isRetrievableObject(result) && nameProp in result) {
                    result = result[nameProp];
                    continue;
                }
                if (chain.length === 1 && nameProp === 'default') {
                    return result;
                }
                throw new RequireError(`Chain access failed at '${nameProp}' for module ${fullName}:${chain.join('.')};`, {
                    type: 'ChainError',
                });
            }
            return result;
        }
    }

    /**
     * Внедряет имя модуля в поле _moduleName в экспортируюмую сущность.
     * @param obj Экспортируемая сущность
     * @param moduleName Имя модуля.
     * @param isObject
     */
    function injectModuleName(obj, moduleName, isObject) {
        const exports = obj.__esModule && obj.default ? obj.default : obj;
        if (typeof exports === 'function') {
            // Give _moduleName to each class and BTW mark private classes
            const proto = exports.prototype;
            const isPrivateModule = moduleName.indexOf('/_') !== -1;
            if (proto) {
                if (!proto.hasOwnProperty('_moduleName')) {
                    proto._moduleName = moduleName;
                    proto._isPrivateModule = isPrivateModule || undefined;
                }
                // arrow function has no prototype
            }
            else {
                if (!exports.hasOwnProperty('_moduleName')) {
                    exports._moduleName = moduleName;
                    exports._isPrivateModule = isPrivateModule || undefined;
                }
            }
        }
        else if (
        // Give _moduleName to each private or unnamed class in public library
        typeof exports === 'object' &&
            isObject(exports) &&
            moduleName.indexOf('/_') === -1) {
            Object.keys(exports).forEach((name) => {
                const module = exports[name];
                if (typeof module === 'function') {
                    const proto = module.prototype;
                    if (proto) {
                        if (proto._isPrivateModule || !proto.hasOwnProperty('_moduleName')) {
                            proto._moduleName = moduleName + ':' + name;
                        }
                        // arrow function has no prototype
                    }
                    else {
                        if (module._isPrivateModule ||
                            !module.hasOwnProperty('_moduleName')) {
                            module._moduleName = moduleName + ':' + name;
                        }
                    }
                }
            });
        }
    }

    /**
     * Логгер для серверного Require-а
     * @author Кудрявцев И.С.
     */
    /**
     * Вызывает нативную консоль
     * @param level Уровень логирования
     * @param args Аргументы
     */
    function globalConsole(level, args) {
        /* eslint-disable-next-line no-console */
        if (typeof console === 'object' && typeof console[level] === 'function') {
            /* eslint-disable-next-line no-console */
            console[level].apply(undefined, args);
        }
    }
    /**
     * Класс серверного логгера
     */
    class ServerConsole {
        /**
         * Логирования на уровне информационного сообщения
         * @param args
         */
        info(...args) {
            if (typeof sbis === 'object' && typeof sbis.LogMsg === 'function') {
                sbis.LogMsg(2, `[js][info]: ${this.argsToString(args)}`);
            }
            globalConsole('info', args);
        }
        /**
         * Логирования на уровне обычного сообщения
         * @param args
         */
        log(...args) {
            if (typeof sbis === 'object' && typeof sbis.LogMsg === 'function') {
                sbis.LogMsg(2, `[js][log]: ${this.argsToString(args)}`);
            }
            globalConsole('log', args);
        }
        /**
         * Логирования на уровне предупреждения
         * @param args
         */
        warn(...args) {
            if (typeof sbis === 'object' && typeof sbis.WarningMsg === 'function') {
                sbis.WarningMsg(`[js]: ${this.argsToString(args)}`);
            }
            globalConsole('warn', args);
        }
        /**
         * Логирования на уровне ошибки
         * @param args
         */
        error(...args) {
            if (typeof sbis === 'object' && typeof sbis.ErrorMsg === 'function') {
                sbis.ErrorMsg(`[js]: ${this.argsToString(args)}`);
            }
            globalConsole('error', args);
        }
        /**
         * Конвертурет аргументы в строку
         * @param args
         */
        argsToString(args) {
            return args.map(this.dataToString).join(', ');
        }
        /**
         * Конвертурет данные в строку
         * @param value
         * @private
         */
        dataToString(value) {
            if (typeof value === 'string') {
                return value;
            }
            if (typeof value === 'function') {
                return value.toString();
            }
            if (value instanceof Error) {
                return `[${value.name}] message: ${value.message} \n stack: ${value.stack}`;
            }
            return JSON.stringify(value);
        }
    }
    var logger = new ServerConsole();

    const MAX_SERIALIZATION_LOOKUP_DEPTH = 4;
    function isClass(objt) {
        return !!objt.constructor;
    }
    /**
     * Добавялем в функцию метод toJSON, чтобы она сериализовывалась
     * @param func Функция
     * @param resolver Резолвер для toJSON
     */
    function makeFunctionSerializable(func, resolver) {
        func.toJSON = () => {
            const [moduleName, path] = resolver(func);
            return {
                $serialized$: 'func',
                module: moduleName,
                path: path || undefined,
            };
        };
    }
    /**
     * Делает массив сериализуемым
     * @param arr Массив
     * @param moduleName Имя модуля
     * @param initialPrefix
     * @param depth Глубина
     */
    function makeArraySerializable(arr, moduleName, initialPrefix, depth) {
        const arrLength = arr.length;
        const prefix = initialPrefix ? `${initialPrefix}.` : '';
        for (let i = 0; i < arrLength; i++) {
            makeSerializable(depth || 0, arr[i], moduleName, prefix + i);
        }
    }
    /**
     * Делает объект сериализуемым
     * @param obj
     * @param resolver
     * @param depth
     */
    function makeObjectSerializable(obj, resolver, depth) {
        const [moduleName, resolvedPrefix] = resolver(obj);
        const prefix = resolvedPrefix ? `${resolvedPrefix}.` : '';
        Object.keys(obj).forEach((prop) => {
            // Go through data descriptors only
            const descriptor = Object.getOwnPropertyDescriptor(obj, prop) || {};
            if (!('value' in descriptor)) {
                return;
            }
            try {
                makeSerializable(depth || 0, obj[prop], moduleName, prefix + prop);
            }
            catch (err) {
                logger.error(`resourceLoadHandler: something went wrong during '${prefix + prop}' property serialization in module '${moduleName}'`, err.message, err);
            }
        });
    }
    /**
     * После require js модуля на все функции навешивается toJSON
     * функции ищутся рекурсивно вглубь объектов.
     * Модуль А: { f1 : function(){} }
     * Модуль В: { K :  {
     *                          someFunction: A.f1
     *                        }
     *                }
     * При require модуля B с зависимостью модулем А сначала toJSON будет вызван для
     * функции f1 от объекта А (при загрузке зависимостей)
     * А при загрузке самого модуля В, toJSON для f1 будет вызван от объекта B.K
     * соответственно правильная ссылка будет потеряна.
     * @param initialDepth
     * @param obj
     * @param moduleName
     * @param prefix
     */
    function makeSerializable(initialDepth, obj, moduleName, prefix) {
        if (initialDepth === 0) {
            return;
        }
        const depth = initialDepth - 1;
        switch (typeof obj) {
            case 'function': {
                const getNameAndPath = (func) => {
                    let name = moduleName;
                    let path = prefix;
                    let moduleNameFromProto;
                    if (func.prototype) {
                        moduleNameFromProto =
                            func.prototype.hasOwnProperty('_moduleName') && func.prototype._moduleName;
                    }
                    else {
                        moduleNameFromProto = func._moduleName;
                    }
                    if (moduleNameFromProto) {
                        moduleNameFromProto = String(moduleNameFromProto);
                        if (moduleNameFromProto.indexOf(':') > -1) {
                            [name, path] = moduleNameFromProto.split(':', 2);
                        }
                    }
                    return [name, path];
                };
                // Firstly go through the original function/class properties
                if (isClass(obj)) {
                    makeObjectSerializable(obj, getNameAndPath, depth);
                }
                // Secondly add a new property and this way prevent to go through it
                if (!obj.hasOwnProperty('toJSON')) {
                    makeFunctionSerializable(obj, getNameAndPath);
                }
                break;
            }
            case 'object': {
                const isObject = (objt) => {
                    return objt && Object.getPrototypeOf(objt) === Object.prototype;
                };
                if (Array.isArray(obj)) {
                    makeArraySerializable(obj, moduleName, prefix, depth);
                }
                else if (isObject(obj)) {
                    // is plain Object
                    makeObjectSerializable(obj, () => [moduleName, prefix], depth);
                }
                break;
            }
        }
    }
    /**
     * Внедряет в экспорт toJSON чтобы он серализовывался
     * @param exports Экспорт
     * @param moduleName Имя модуля
     */
    function injectToJson(exports, moduleName) {
        makeSerializable(MAX_SERIALIZATION_LOOKUP_DEPTH, exports, moduleName);
    }

    /**
     * Серверный загрузчик модуля в строковом представление
     * @author Кудрявцев И.С.
     */
    let load$1;
    if (typeof TextRequest !== 'undefined') {
        load$1 = TextRequest;
    }
    else {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const readFileSync = require('node:fs').readFileSync;
        load$1 = (path) => {
            return readFileSync(path, 'utf8');
        };
    }
    var loadString = load$1;

    /**
     * Серверный загрузчик для JS
     * @author Кудрявцев И.С.
     */
    let load;
    if (typeof importScripts !== 'undefined') {
        load = (name, path, context) => {
            importScripts(path);
            if (context.definedMap.has(name)) {
                return DEFINE_MODULE;
            }
            return null;
        };
    }
    else {
        const nodeRequire = require;
        load = (name, path, context) => {
            let result;
            try {
                result = nodeRequire(path);
            }
            catch (err) {
                try {
                    // Если мы не смогли получить файл по вычисленому пути,
                    // возможно это чисто node-ая зависимость, попробуем зарейкварить её по имени.
                    result = nodeRequire(name);
                }
                catch (_e) {
                    throw err;
                }
            }
            if (context.definedMap.has(name)) {
                return DEFINE_MODULE;
            }
            return result;
        };
    }
    /**
     * Загружает модули с именем ${ModuleName}
     * @param defineName
     * @param filePath
     * @param buildPath Функция для формирования пути до файла
     * @param context
     */
    var js = (defineName, filePath, context) => {
        const path = context.buildPath(filePath, 'js');
        try {
            return load(defineName, path, context);
        }
        catch (err) {
            throw new RequireError(`Failed to load JavaScript module "${defineName}" file by path "${path}".`, {
                cause: err,
                type: 'load',
            });
        }
    };

    /**
     * Серверный загрузчик для wml
     * @author Кудрявцев И.С.
     */
    // TODO https://rollupjs.org/troubleshooting/#eval2-eval
    // eslint-disable-next-line no-eval
    const eval2$1 = eval;
    /**
     * Загружает модули с именем wml!${ModuleName}
     * @param module Модуль
     * @param moduleInfo Информация о UI модулей, в котором живём модуль.
     * @param context Require
     * @param ext Расширение файла
     * @param deps Доп зависмости, которые надо загрузить
     */
    function wml (defineName, filePath, context, ext = 'wml', deps = []) {
        if (context.templateExtension === 'js') {
            return js(defineName, `${filePath}.${ext}`, context);
        }
        const path = context.buildPath(filePath, context.buildMode === 'release' ? `min.${ext}` : ext);
        try {
            const html = loadString(path);
            const isCompiledModule = html && (html.startsWith('define') || html.startsWith('(function('));
            if (isCompiledModule) {
                eval2$1(html);
                return DEFINE_MODULE;
            }
            for (const dep of deps) {
                context.require(dep);
            }
            const CompilerLib = context.require('Compiler/Compiler');
            const moduleInfo = context.modules[context.getRootDir(filePath)];
            if (!moduleInfo) {
                throw new Error(`Not exists UIModule for module ${defineName}`);
            }
            const compiler = new CompilerLib.Compiler();
            const artifact = compiler.compileSync(html, {
                fileName: `${filePath}.${ext}`,
                ESVersion: moduleInfo.ESVersion || context.defaultESVersion,
            });
            if (!artifact.stable) {
                throw artifact.errors[0];
            }
            eval2$1(artifact.text);
            return DEFINE_MODULE;
        }
        catch (err) {
            throw new RequireError(`Failed to load template "${defineName}" file by path "${path}".`, {
                cause: err,
                type: 'load',
            });
        }
    }

    /**
     * Загружает модули с именем tmpl!${ModuleName}
     * @param fileInfo
     * @param moduleInfo Информация о UI модулей, в котором живём модуль.
     * @param context Require
     */
    function tmpl (defineName, filePath, context) {
        return wml(defineName, filePath, context, 'tmpl', [
            'is!compatibleLayer?Lib/Control/Control.compatible',
            'is!compatibleLayer?Lib/Control/AreaAbstract/AreaAbstract.compatible',
        ]);
    }

    /**
     * Серверный загрузчик для css
     * @author Кудрявцев И.С.
     */
    /**
     * Загружает и дефанит модули с именем css!${ModuleName}
     */
    function css () {
        return null;
    }

    let defaultTranslator;
    let cacheController;
    function getController(context) {
        if (cacheController) {
            return cacheController;
        }
        const { controller } = context.require('I18n/singletonI18n');
        cacheController = controller;
        return cacheController;
    }
    function getDefaultTranslator(context) {
        if (defaultTranslator) {
            return defaultTranslator;
        }
        const { controller, Translator } = context.require('I18n/singletonI18n');
        const emptyTranslator = new Translator({}, controller);
        defaultTranslator = (key, module, pluralNumber, isTemplate) => {
            return emptyTranslator.translate(key, module, pluralNumber, isTemplate);
        };
        return defaultTranslator;
    }
    /**
     * Загружает модули с именем i18n!${ModuleName}
     * @param module Модуль
     * @param _moduleInfo
     * @param context Require
     */
    function i18n (_defineName, filePath, context) {
        const controller = getController(context);
        if (filePath === 'controller?I18n/controller') {
            controller.addRegion('RU', context.require('LocalizationConfigs/localization_configs/region/RU.json'), false);
            controller.addRegion('KZ', context.require('LocalizationConfigs/localization_configs/region/KZ.json'), false);
            controller.addRegion('UZ', context.require('LocalizationConfigs/localization_configs/region/UZ.json'), false);
            controller.addRegion('TM', context.require('LocalizationConfigs/localization_configs/region/TM.json'), false);
            //@ts-ignore
            controller.addLang('en', context.require('I18n/locales/en').default, false);
            //@ts-ignore
            controller.addLang('ru', context.require('I18n/locales/ru').default, false);
            //@ts-ignore
            controller.addLang('ar', context.require('I18n/locales/ar').default, false);
            //@ts-ignore
            controller.addLang('he', context.require('I18n/locales/he').default, false);
            //@ts-ignore
            controller.addLang('fr', context.require('I18n/locales/fr').default, false);
            //@ts-ignore
            controller.addLang('kk', context.require('I18n/locales/kk').default, false);
            //@ts-ignore
            controller.addLang('uz', context.require('I18n/locales/uz').default, false);
            //@ts-ignore
            controller.addLang('tk', context.require('I18n/locales/tk').default, false);
            return controller;
        }
        if (!controller.isEnabled) {
            return getDefaultTranslator(context);
        }
        const rootDir = context.getRootDir(filePath);
        if (!rootDir) {
            return getDefaultTranslator(context);
        }
        if (controller.translators.hasOwnProperty(rootDir)) {
            const translator = controller.translators[rootDir];
            return translator.translate.bind(translator);
        }
        const translator = controller.getTranslatorSync(rootDir);
        return translator.translate.bind(translator);
    }

    /**
     * Загружает модули с именем json!${ModuleName}
     * @param module Модуль
     * @param name
     * @param buildPath Функция для формирования пути до файла
     */
    function json (defineName, filePath, context) {
        const path = context.buildPath(filePath, 'json');
        try {
            return JSON.parse(loadString(path));
        }
        catch (err) {
            throw new RequireError(`Failed to load JSON module "${defineName}" file by path "${path}".`, {
                cause: err,
                type: 'load',
            });
        }
    }

    /**
     * Загружает модули с именем text!${ModuleName}
     * @param module Модуль
     * @param name
     * @param buildPath Функция для формирования пути до файла
     */
    function text (defineName, filePath, context) {
        const splitName = filePath.split('.');
        const ext = splitName.pop();
        const path = context.buildPath(splitName.join('.'), ext);
        try {
            return loadString(path);
        }
        catch (err) {
            throw new RequireError(`Failed to load JavaScript modules "${defineName}" file by path "${path}".`, {
                cause: err,
                type: 'load',
            });
        }
    }

    /**
     * Серверный загрузчик для xhtml
     * @author Кудрявцев И.С.
     */
    // TODO https://rollupjs.org/troubleshooting/#eval2-eval
    // eslint-disable-next-line no-eval
    const eval2 = eval;
    /**
     * Компилирует шаблон
     * @param f
     * @param name
     */
    function mkTemplate(f, name) {
        const fname = name.replace(/[^a-z0-9]/gi, '_');
        // Создается именованая функция с понятным названием чтобы из стэка можно было понять битый шаблон
        // eslint-disable-next-line no-new-func
        const factory = new Function('f', 'return function ' + fname + '(){ return f.apply(this, arguments); }');
        const result = factory(f);
        result.toJSON = function () {
            const serialized = {
                $serialized$: 'func',
                module: 'html!' + name,
            };
            return serialized;
        };
        return result;
    }
    /**
     * Загружает модули с именем html!${ModuleName}
     * @param module Модуль
     * @param defineName
     * @param filePath
     * @param buildPath Функция для формирования пути до файла
     * @param context Require
     */
    function html (defineName, filePath, context) {
        const path = context.buildPath(filePath, context.buildMode === 'release' ? 'min.xhtml' : 'xhtml');
        try {
            context.require('i18n!' + context.getRootDir(filePath));
            const html = loadString(path);
            const isCompiledModule = html && html.startsWith('define');
            if (isCompiledModule) {
                eval2(html);
                return DEFINE_MODULE;
            }
            const doT = context.require('optional!Core/js-template-doT');
            const config = doT.getSettings();
            config.strip = false;
            return mkTemplate(doT.template(html, config, undefined, undefined, filePath), filePath);
        }
        catch (err) {
            throw new RequireError(`Failed to load HTML template "${defineName}" file by path "${path}".`, {
                cause: err,
                type: 'load',
            });
        }
    }

    /**
     * Серверная версия require.js. Испольуется в сервисе представления, демо-стенде wasaby-cli
     * @author Кудрявцев И.С.
     */
    const loaders = {
        wml,
        js,
        tmpl,
        css,
        i18n,
        json,
        text,
        html,
    };
    const nodeJSExportProto = 
    // @ts-ignore убрать когда придумаю кк подцепить Node.js типы
    typeof module !== 'undefined' ? Object.getPrototypeOf(module.exports) : null;
    let loadingModule;
    /**
     * Проверяет, что экспорт это объект
     * @param exports
     */
    function isObject(exports) {
        if (Object.getPrototypeOf(exports) === Object.prototype) {
            return true;
        }
        return nodeJSExportProto && nodeJSExportProto === Object.getPrototypeOf(exports);
    }
    /**
     * Класс реальзует Require.js с сервой логикой. Полностью синхроный.
     */
    class ServerRequire extends BaseRequire {
        constructor(config) {
            var _a, _b;
            super();
            this.root = config.root || '';
            this.resourcesPath = config.resourcesPath || '/';
            this.cdnPath = config.cdnPath || '/cdn';
            const reactMode = (_b = (_a = this.modules) === null || _a === void 0 ? void 0 : _a.React) === null || _b === void 0 ? void 0 : _b.mode;
            if (typeof reactMode === 'string') {
                this.reactReleaseMode = reactMode === 'release';
            }
            else {
                this.reactReleaseMode = true;
            }
            this.cache.set('require', this.require.bind(this));
        }
        getDebugCookie() {
            var _a, _b, _c;
            // @ts-ignore
            return ((_c = (_b = (_a = process === null || process === void 0 ? void 0 : process.domain) === null || _a === void 0 ? void 0 : _a.req) === null || _b === void 0 ? void 0 : _b.cookies) === null || _c === void 0 ? void 0 : _c.s3debug) || '';
        }
        enableRtlDirection() {
            //@ts-ignore
            return this.require('I18n/i18n:controller').currentLocaleConfig.directionality === 'rtl';
        }
        buildPath(filePath, extension) {
            const moduleName = this.getRootDir(filePath);
            if (moduleName === 'cdn') {
                const cdnFilePath = filePath.replace('cdn/', '');
                if (filePath.endsWith(extension)) {
                    return `${this.cdnPath}/${cdnFilePath}`;
                }
                return `${this.cdnPath}/${cdnFilePath}.${extension}`;
            }
            const moduleInfo = this.modules[moduleName];
            if (!moduleInfo) {
                if (filePath.startsWith('resources/')) {
                    return `${this.root}${this.resourcesPath}${filePath.replace('resources/', '')}.${extension}`;
                }
                return `${this.root}${this.resourcesPath}${filePath}.${extension}`;
            }
            if (moduleInfo.path) {
                const path = moduleInfo.path;
                const rootPath = path.slice(0, path.lastIndexOf('/') + 1);
                const queryParams = `?x_module=${moduleInfo.buildnumber || this.defaultVersion}`;
                return `${rootPath}${filePath}.${extension}${queryParams}`;
            }
            // На серваке мы должны использовать релизный(продакшен) React, потому что дебажный работает в разы медленее.
            if (moduleName === 'React' && this.reactReleaseMode) {
                return `${this.root}${this.resourcesPath}${filePath}.min.${extension}`;
            }
            return `${this.root}${this.resourcesPath}${filePath}.${extension}`;
        }
        load(name) {
            const defineName = this.getDefineName(name);
            const loaderName = this.getLoaderName(defineName);
            loadingModule = defineName;
            let exports = DEFINE_MODULE;
            if (!this.definedMap.has(name)) {
                try {
                    const modulePath = this.getModulePath(defineName);
                    exports = this.loadModule(defineName, loaderName, modulePath);
                }
                catch (err) {
                    return this.injectCache(defineName, err, this.ignoreLoadError(name));
                }
            }
            try {
                if (exports === DEFINE_MODULE) {
                    exports = this.getExportsFromDefine(defineName);
                }
                if (loaderName === 'js' && exports) {
                    injectModuleName(exports, defineName, isObject);
                    injectToJson(exports, defineName);
                }
                for (const listener of this.listenerOnLoad) {
                    listener(defineName, exports);
                }
                this.cache.set(defineName, exports);
                return this.extractChain(exports, name);
            }
            catch (err) {
                this.errorsCache.set(defineName, err);
                throw err;
            }
            finally {
                this.definedMap.delete(defineName);
            }
        }
        /**
         * Грузит модуль.
         * @param defineName
         * @param loaderName
         * @param modulePath
         */
        loadModule(defineName, loaderName, modulePath) {
            return loaders[loaderName](defineName, modulePath, this);
        }
        /**
         * Получить экспорт модуля
         */
        getExportsFromDefine(defineName) {
            try {
                //@ts-ignore
                const [deps, callback] = this.definedMap.get(defineName);
                if (deps.length === 0) {
                    return this.executeCallback(defineName, callback);
                }
                return this.executeCallback(defineName, callback, this.getDepsExports(defineName, deps), deps);
            }
            catch (err) {
                if (RequireError.isRequireError(err)) {
                    throw err;
                }
                throw new RequireError(`Failed to execute  callback function for module "${defineName}".`, {
                    cause: err,
                    type: 'Executing callback',
                });
            }
        }
        /**
         * Получить экспорты для зависимостей
         */
        getDepsExports(defineName, deps) {
            const result = [];
            for (const dep of deps) {
                // Необходма для того чтобы require смог разрещить относительные пути.
                this.currentModule = defineName;
                result.push(this.require(dep));
            }
            return result;
        }
        require(moduleNames, successCallback, errorCallback) {
            // Если передали только имя модуля, то пытемся извлечь, его из кеша, если не получиться выкидываем ошмбку.
            if (typeof moduleNames === 'string') {
                const normalizeName = this.normalizeName(moduleNames);
                const value = this.extractCache(normalizeName);
                if (value !== NO_CACHE) {
                    return value;
                }
                const err = this.extractErrorCache(normalizeName);
                if (err) {
                    throw err;
                }
                return this.load(moduleNames);
            }
            const results = [];
            const errors = [];
            for (const moduleName of moduleNames || []) {
                // TODO Это полный дурдом, но оригинальый require умеет обрабатывать [''] и [undefined] и [function].
                //  Пока что такой кейс всплалыл moduleStub и в старых демках, но фиг знает где оно ещё всплывёт,
                //  поэтому придёться поддержать сия кейс. Но надо будет это спиливать.
                if (!(moduleName && typeof moduleName === 'string')) {
                    results.push(undefined);
                    continue;
                }
                const normalizeName = this.normalizeName(moduleName);
                try {
                    const value = this.extractCache(normalizeName);
                    if (value !== NO_CACHE) {
                        results.push(value);
                        continue;
                    }
                }
                catch (cacheError) {
                    errors.push(cacheError);
                    continue;
                }
                const err = this.extractErrorCache(normalizeName);
                if (err) {
                    errors.push(err);
                    continue;
                }
                results.push(this.load(normalizeName));
            }
            if (typeof successCallback === 'function') {
                return this.fireCallbacks(results, errors, successCallback, errorCallback);
            }
            return this.firePromise(results, errors);
        }
        detectAnonymousModule() {
            return loadingModule;
        }
    }
    // @ts-ignore
    const globalEnv = globalThis;
    /**
     * Глоабльаня функция для иницилизации сервеного require в глобальном окружение.
     * @param root Папка для всех ресурсов
     * @param resourcesPath Папка где лежат UI модули
     * @param cdnPath Папка где лежат cdn модули
     */
    // @ts-ignore
    globalEnv.initRequire = (root, resourcesPath, cdnPath) => {
        const localRequire = new ServerRequire({
            root,
            resourcesPath,
            cdnPath,
        });
        globalEnv.requirejs = globalEnv.require = localRequire.cache.get('require');
        // TODO совместимость со старым require. Используем этот флаг, чтобы отрубить патч define-а в config.ts.
        //  Удалить когда перепишем config.ts, а сделаем мы это, когда включим новый require и на сервере.
        globalEnv.requirejs.isNewRequire = true;
        // @ts-ignore
        globalEnv.requirejs.instance = localRequire;
        // @ts-ignore
        globalEnv.define = localRequire.define.bind(localRequire);
        globalEnv.define.amd = true;
        globalEnv.requirejs.defined = localRequire.defined.bind(localRequire);
        globalEnv.requirejs.undef = localRequire.undef.bind(localRequire);
        // TODO совместимость со старым require. Удалить когда переедм везде на новый.
        globalEnv.requirejs.toUrl = (name) => {
            const splitName = name.split('.');
            const ext = splitName.pop();
            const path = splitName.join('.');
            return localRequire.buildUrl(path, ext);
        };
        // TODO совместимость со старым require. Удалить когда переедм везде на новый.
        globalEnv.requirejs.config = () => {
            return globalEnv.requirejs;
        };
        // TODO совместимость со старым require. Удалить когда переедм везде на новый.
        globalEnv.requirejs.onError = (err) => {
            throw err;
        };
    };

    return ServerRequire;

})();
