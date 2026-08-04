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
    const globalEnv$3 = globalThis;
    /**
     * Возвращает шардированый домен, если он есть
     */
    function getShardDomain() {
        return globalEnv$3.wsConfig.shardDomain || '';
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
    const globalEnv$2 = globalThis;
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
            const contents = globalEnv$2.contents || {};
            const wsConfig = globalEnv$2.wsConfig || {};
            this.modules = contents.modules || {};
            this.modulesResolution = getModuleResolution(((_a = this.modules.React) === null || _a === void 0 ? void 0 : _a.version) || DEFAULT_REACT_VERSION);
            this.buildMode = contents.buildMode || 'debug';
            this.templateExtension = ((_b = globalEnv$2.contents) === null || _b === void 0 ? void 0 : _b.extensionForTemplate) || '';
            this.cache = new Map();
            this.errorsCache = new Map();
            this.definedMap = new Map();
            this.listenerOnLoad = new Set();
            this.compatibleMode = false;
            this.currentModule = '';
            this.staticsRoot = wsConfig.resourceRoot || '/resources/';
            this.metaRoot = wsConfig.metaRoot || globalEnv$2.metaRoot || '';
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

    const rootDomain = `//${location.host}`;
    function isCrossOriginUrl(url) {
        return !url.includes(rootDomain);
    }

    /**
     * Загрузчик через тег link
     * @author Кудрявцев И.С.
     */
    const loading$1 = new Map();
    const loadedLink = new Set();
    const errorLink = new Map();
    function subscribeDownload(url, node, callback) {
        return new Promise((resolve, reject) => {
            node.addEventListener('load', () => {
                loadedLink.add(url);
                loading$1.delete(url);
                if (callback) {
                    callback(node);
                }
                resolve();
            });
            node.addEventListener('error', (err) => {
                errorLink.set(url, err);
                loading$1.delete(url);
                reject(err);
            });
        });
    }
    function processLinks(links, callback) {
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
            if (!loading$1.has(url)) {
                loading$1.set(url, subscribeDownload(url, link, callback));
            }
        }
    }
    function detectLinks(callback) {
        processLinks(Array.from(document.head.children), callback);
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                processLinks(Array.from(mutation.addedNodes), callback);
            }
        });
        observer.observe(document.head, { childList: true });
    }
    /**
     * Загрузка файла через тег link
     * @param url  URL адресс файла
     */
    function tagLink (url) {
        if (loadedLink.has(url)) {
            return Promise.resolve();
        }
        if (errorLink.has(url)) {
            return Promise.reject(errorLink.get(url));
        }
        if (loading$1.has(url)) {
            return loading$1.get(url);
        }
        const node = document.createElement('link');
        node.rel = 'stylesheet';
        node.href = url;
        if (isCrossOriginUrl(url)) {
            node.crossOrigin = 'anonymous';
        }
        const promise = subscribeDownload(url, node);
        loading$1.set(url, promise);
        document.head.appendChild(node);
        return promise;
    }

    var _a;
    // @ts-ignore
    const globalEnv$1 = globalThis;
    const disableLoadCss = !(((_a = globalEnv$1.wsConfig) === null || _a === void 0 ? void 0 : _a.loadCss) === undefined
        ? true
        : globalEnv$1.wsConfig.loadCss);
    const IGNORE_MODULE = 'SBIS3.CONTROLS';
    const regExp = /(.min)?(.css)$/;
    function defineLoadedLink(link) {
        const url = new URL(link.href).pathname;
        const resourcesRoot = globalEnv$1.wsConfig.resourceRoot || '/resources/';
        if (url.endsWith('.css') && url.startsWith(resourcesRoot)) {
            const defineName = `css!${url.replace(resourcesRoot, '').replace(regExp, '')}`;
            define(defineName, [], () => null);
        }
    }
    function startWatchLinks() {
        detectLinks(defineLoadedLink);
    }
    /**
     * Старые страницы хранят имя темы в wsConfig.themeName
     * Достаём из конфигурации тему. Если конфигурация отсутствует или
     * отсутствует свойство themeName, значит считаем, что работаем с онлайном и
     * позволяем грузить онлайновские контролы.
     * @param name Имя модуля
     */
    function resolveSuffix(name) {
        var _a;
        return ((_a = globalEnv$1.wsConfig) === null || _a === void 0 ? void 0 : _a.themeName) && name === IGNORE_MODULE;
    }
    /**
     * Загружает и дефанит модули с именем css!${ModuleName}
     * @param module Модуль
     * @param buildUrl Функция для формирования URL
     * @param crossOrigin Являеться запрос cross origin
     */
    async function css (defineName, filePath, context) {
        if (disableLoadCss || resolveSuffix(context.getRootDir(filePath))) {
            return null;
        }
        const url = context.buildUrl(filePath, 'css');
        try {
            await tagLink(url);
            return null;
        }
        catch (err) {
            throw new RequireError(`Failed to load CSS module "${defineName}" file by url "${url}".`, {
                cause: err,
                type: 'load',
            });
        }
    }

    /**
     * Fetch загрузчик
     * @author Кудрявцев И.С.
     */
    const NOT_FOUND_CODE = 404;
    /**
     * Получить объекет Response от fetch
     * @param url URL адресс файла
     */
    function getResponse(url) {
        try {
            return fetch(url, {
                mode: isCrossOriginUrl(url) ? 'cors' : 'no-cors',
            });
        }
        catch (err) {
            if (err.name === 'TypeError') {
                throw new Error(`Network error or CORS:: ${err.message}`);
            }
            throw new Error(`Unknown fetch error: ${err.message}`);
        }
    }
    /**
     * Загрузка файла через fetch
     * @param url  URL адресс файла
     */
    async function fetchLoader (url) {
        const response = await getResponse(url);
        if (!response.ok) {
            if (response.status === NOT_FOUND_CODE) {
                throw new Error(`File not exist. HTTP code: ${response.status}`);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    }

    /**
     * Загрузчик через тег script
     * @author Кудрявцев И.С.
     */
    const loading = new Map();
    /**
     * Загрузка файла через тег script
     * @param url URL адресс файла
     * @param name Имя модуля
     */
    function tagScript (url, name) {
        if (loading.has(url)) {
            return loading.get(url);
        }
        const promise = new Promise((resolve, reject) => {
            const node = document.createElement('script');
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

    /**
     * Браузерный загрузчик для JS
     * @author Кудрявцев И.С.
     */
    // TODO https://rollupjs.org/troubleshooting/#eval2-eval
    // eslint-disable-next-line no-eval
    const eval2$2 = eval;
    const errors = new Map();
    window.onerror = (message, _filename, lineno, colno, error) => {
        const script = document.currentScript;
        if (script) {
            const url = script.getAttribute('src');
            if (url && error) {
                if (typeof message === 'string' && message.includes('SyntaxError')) {
                    error.message = `SyntaxError: ${message};  LINE: ${lineno}: COLUM: ${colno}`;
                }
                errors.set(url, error);
            }
        }
    };
    /**
     * Загружает и дефанит модули с именем ${ModuleName}
     * @param fileInfo
     * @param moduleInfo Информация о UI модулей, в котором живём модуль.
     * @param context
     */
    async function js (defineName, filePath, context) {
        const url = context.buildUrl(filePath, 'js');
        try {
            try {
                await tagScript(url, defineName);
            }
            catch (err) {
                eval2$2(await fetchLoader(url));
            }
            if (context.definedMap.has(defineName)) {
                return DEFINE_MODULE;
            }
            const error = errors.get(url);
            if (error) {
                errors.delete(url);
                throw error;
            }
            return null;
        }
        catch (err) {
            throw new RequireError(`Failed to load JavaScript module "${defineName}" file by url "${url}".`, {
                cause: err,
                type: 'load',
            });
        }
    }

    /**
     * Браузерный загрузчик для wml
     * @author Кудрявцев И.С.
     */
    // TODO https://rollupjs.org/troubleshooting/#eval2-eval
    // eslint-disable-next-line no-eval
    const eval2$1 = eval;
    /**
     * Загружает и дефанит модули с именем wml!${ModuleName}
     * @param fileInfo
     * @param moduleInfo Информация о UI модулей, в котором живём модуль.
     * @param context Require
     * @param ext Расширения шаблона.
     * @param deps Дополнительные зависимости.
     */
    async function wml (defineName, filePath, context, ext = 'wml', deps = []) {
        if (context.templateExtension === 'js') {
            return js(defineName, `${filePath}.${ext}`, context);
        }
        const url = context.buildUrl(filePath, ext);
        try {
            const html = await fetchLoader(url);
            const isCompiledModule = html && (html.startsWith('define') || html.startsWith('(function('));
            if (isCompiledModule) {
                eval2$1(html);
                return DEFINE_MODULE;
            }
            const ownDeps = ['Compiler/Compiler', ...deps];
            const moduleInfo = context.modules[context.getRootDir(filePath)];
            if (!moduleInfo) {
                throw new Error(`Not exists UIModule for module ${defineName}`);
            }
            if (moduleInfo.hasTailwind) {
                // При сборке исходных файлов в шаблоны вставляется такая зависимость тогда и только тогда,
                // когда в конкретном шаблоне имеется уникальный (не существующий в Tailwind) класс.
                // При сборке шаблона в runtime на клиенте нет возможности выполнить такую умную инъекцию зависимости,
                // поэтому загружаем существующие сгенерированные tailwind файлы для всего модуля
                // при первой компиляции шаблона на клиенте из этого модуля.
                ownDeps.push(`css!${context.getRootDir(filePath)}/tailwind`);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [CompilerLib] = await context.require(ownDeps);
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
            throw new RequireError(`Failed to load template "${defineName}" file by url "${url}".`, {
                cause: err,
                type: 'load',
            });
        }
    }

    /**
     * Загружает и дефанит модули с именем tmpl!${ModuleName}
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

    let defaultTranslator;
    let controller;
    function getDefaultTranslator(context) {
        if (defaultTranslator) {
            return defaultTranslator;
        }
        // Здесь можно заюзать синхроный require, потому что I18n/singletonI18n точно был загржен ради контроллера.
        const { Translator } = context.require('I18n/singletonI18n');
        const emptyTranslator = new Translator({}, controller);
        defaultTranslator = (key, module, pluralNumber, isTemplate) => {
            return emptyTranslator.translate(key, module, pluralNumber, isTemplate);
        };
        return defaultTranslator;
    }
    /**
     * Загружает и дефанит модули с именем i18n!${ModuleName}
     * @param module Модуль
     * @param context Require
     */
    async function i18n (_defineName, filePath, context) {
        if (!controller) {
            controller = (await context.require(['I18n/singletonI18n:controller']))[0];
        }
        if (filePath === 'controller?I18n/controller') {
            await controller.isReady();
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
        try {
            const translator = await controller.getTranslator(rootDir);
            return translator.translate.bind(translator);
        }
        catch (err) {
            return getDefaultTranslator(context);
        }
    }

    /**
     * Браузерный загрузчик для json
     * @author Кудрявцев И.С.
     */
    /**
     * Загружает и дефанит модули с именем json!${ModuleName}
     * @param module Модуль
     * @param buildUrl Функция для формирования URL
     * @param crossOrigin Являеться запрос cross origin
     */
    async function json (defineName, filePath, context) {
        const url = context.buildUrl(filePath, 'json');
        try {
            return JSON.parse(await fetchLoader(url));
        }
        catch (err) {
            throw new RequireError(`Failed to load JSON module "${defineName}" file by url "${url}".`, {
                cause: err,
                type: 'load',
            });
        }
    }

    /**
     * Браузерный загрузчик для текстового представления
     * @author Кудрявцев И.С.
     */
    /**
     * Загружает и дефанит модули с именем text!${ModuleName}
     * @param module Модуль
     * @param buildUrl Функция для формирования URL
     * @param crossOrigin Являеться запрос cross origin
     * @param context
     */
    async function text (defineName, filePath, context) {
        const splitName = filePath.split('.');
        const ext = splitName.pop();
        const path = splitName.join('.');
        const url = context.buildUrl(path, ext);
        try {
            return await fetchLoader(url);
        }
        catch (err) {
            throw new RequireError(`Failed to load TEXT module "${defineName}" file by url "${url}".`, {
                cause: err,
                type: 'load',
            });
        }
    }

    /**
     * Браузерный загрузчик для xhtml
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
     * Загружает и дефанит модули с именем html!${ModuleName}
     * @param module Модуль
     * @param buildUrl Функция для формирования URL
     * @param crossOrigin Являеться запрос cross origin
     * @param context Require
     */
    async function html (defineName, filePath, context) {
        const url = context.buildUrl(filePath, 'xhtml');
        try {
            await context.require(['i18n!' + context.getRootDir(filePath)]);
            const html = await fetchLoader(url);
            const isCompiledModule = html && html.startsWith('define');
            if (isCompiledModule) {
                eval2(html);
                return DEFINE_MODULE;
            }
            const [doT] = await context.require(['optional!Core/js-template-doT']);
            const config = doT.getSettings();
            config.strip = false;
            return mkTemplate(doT.template(html, config, undefined, undefined, filePath), filePath);
        }
        catch (err) {
            throw new RequireError(`Failed to load HTML module "${defineName}" file by url "${url}".`, {
                cause: err,
                type: 'load',
            });
        }
    }

    const PACKABLE_EXTENSION = ['js', 'css', 'wml', 'tmpl', 'html'];
    const BUNDLE_EXTENSION = '.package';
    const BUNDLE_MAP_NAME = 'packageMap.json';
    const PERCENTAGE_BASE = 100;
    // Задаем сколько процентов модулей из пакета должны быть загружены, чтобы мы его не грузили.
    const PERCENTAGE_OF_LOADED_MODULES_TO_DISABLE = 50;
    const regExpExt = /\.css$|\.js$/;
    const loadingMap = new Map();
    const packageInfoMap = new Map();
    function isDictionary(modulePath) {
        return modulePath.split('/')[1] === 'lang';
    }
    /**
     * Проверить, что это пакумеое расширение
     * @param extension Расширение
     */
    function isPackableExtension(extension) {
        return PACKABLE_EXTENSION.includes(extension);
    }
    /**
     * Проверть, что это бандл
     * @param path Путь до файла
     */
    function isBundle(path) {
        return path.endsWith(BUNDLE_EXTENSION);
    }
    /**
     * Проверить, что это карта пакетов
     * @param path Путь до файла
     */
    function isBundlesMap(path) {
        return path.endsWith(BUNDLE_MAP_NAME);
    }
    /**
     * Получить полную информацию по пакетам.
     * @param packagesInfo Информация о пакетах.
     * @param context Require
     */
    async function getFullPackagesInfo(moduleName, context) {
        let promise = loadingMap.get(moduleName);
        if (!promise) {
            promise = loadFullPackageInfo(moduleName, context);
            loadingMap.set(moduleName, promise);
        }
        return promise;
    }
    /**
     * Загрузить полную информацию по пакетам.
     * Загружает карту пакетов.
     * Проверяет сколько модулей из пакета уже были загружено. Если их больше задано значения, пакет не грузиться.
     * Если все пакеты попали в исключение, то исключает карту целиком.
     * @param packagesInfo Информация о пакетах.
     * @param context Require
     */
    async function loadFullPackageInfo(UIModuleName, context) {
        const packagesLoadedStatus = {};
        const disabledPackages = new Set();
        const normalizeMap = {};
        const packageMapPath = `${UIModuleName}/${BUNDLE_MAP_NAME}`;
        const map = (await context.require([packageMapPath]))[0];
        for (const [moduleName, packagePath] of Object.entries(map)) {
            const packageName = packagePath.replace('.min.', '.');
            // TODO Надо чтобы билдер возрвщал без min
            normalizeMap[moduleName] = packageName;
            if (!packagesLoadedStatus.hasOwnProperty(packageName)) {
                packagesLoadedStatus[packageName] = {
                    all: 0,
                    loaded: 0,
                };
            }
            ++packagesLoadedStatus[packageName].all;
            if (context.loaded(moduleName)) {
                ++packagesLoadedStatus[packageName].loaded;
            }
        }
        for (const [packageName, { all, loaded }] of Object.entries(packagesLoadedStatus)) {
            if (packageName.endsWith('.css')) {
                if (loaded > 0) {
                    disabledPackages.add(packageName);
                }
                continue;
            }
            const percentageLoaded = Math.floor((loaded / all) * PERCENTAGE_BASE);
            if (percentageLoaded > PERCENTAGE_OF_LOADED_MODULES_TO_DISABLE) {
                disabledPackages.add(packageName);
            }
        }
        return {
            map: normalizeMap,
            disabledPackages,
            disabledMap: Object.keys(packagesLoadedStatus).length === disabledPackages.size,
        };
    }
    /**
     * Определяет и вызывает загрузчик, для пакета или для файла.
     * @param packagesInfo Информация о пакетах UI модуля
     * @param fileInfo
     * @param moduleInfo Информация о UI модулей, в котором живём модуль.
     * @param context Require
     * @param defaultLoader Дефолтный загрузчик, применяется, если модуль не в пакете.
     */
    function callLoader(packagesInfo, defineName, filePath, loaderName, context, defaultLoader) {
        if (packagesInfo.map.hasOwnProperty(defineName)) {
            let packagePath = packagesInfo.map[defineName];
            if (packagesInfo.disabledPackages.has(packagePath)) {
                return defaultLoader(defineName, filePath, context);
            }
            packagePath = packagePath.replace(regExpExt, '');
            if (loaderName === 'css') {
                return css(defineName, packagePath, context);
            }
            return js(defineName, packagePath, context);
        }
        return defaultLoader(defineName, filePath, context);
    }
    /**
     * Загружает и дефанит модули из пакетов
     * @param module Модуль
     * @param moduleInfo Информация о UI модулей, в котором живём модуль.
     * @param context Require
     * @param defaultLoader Дефолтный загрузчик, применяется, если модуль не в пакете.
     */
    async function bundleLoader (defineName, filePath, loaderName, context, defaultLoader) {
        if (isBundle(filePath) ||
            !isPackableExtension(loaderName) ||
            isBundlesMap(filePath) ||
            isDictionary(filePath)) {
            return defaultLoader(defineName, filePath, context);
        }
        const moduleName = context.getRootDir(filePath);
        if (context.isDebugModule(moduleName)) {
            return defaultLoader(defineName, filePath, context);
        }
        let packagesInfo = packageInfoMap.get(moduleName);
        if (packagesInfo) {
            if (packagesInfo.disabledMap) {
                return defaultLoader(defineName, filePath, context);
            }
            return callLoader(packagesInfo, defineName, filePath, loaderName, context, defaultLoader);
        }
        packagesInfo = await getFullPackagesInfo(moduleName, context);
        return callLoader(packagesInfo, defineName, filePath, loaderName, context, defaultLoader);
    }

    /**
     * Веб версия require.js
     * @author Кудрявцев И.С.
     */
    // @ts-ignore
    const globalEnv = globalThis;
    const DEFAULT_TIMEOUT = 30000;
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
    /**
     * Проверяет, что экспорт это объект
     * @param exports
     */
    function isObject(exports) {
        return Object.getPrototypeOf(exports) === Object.prototype;
    }
    class WebRequire extends BaseRequire {
        constructor() {
            var _a;
            super();
            this.loadableModules = new Map();
            this.processableModules = new Map();
            this.debugCookies = ((_a = document.cookie.match(/(?:^|;)\s*s3debug\s*=\s*([^;]+)/)) === null || _a === void 0 ? void 0 : _a[1]) || '';
            this.loadingTimeout = this.fixLoadingTimeoutForDebug(Object.keys(this.modules).length, globalEnv.wsConfig.moduleLoadingTimeout || DEFAULT_TIMEOUT);
            this.cache.set('require', this.require.bind(this));
            // TODO В старом биллинге сия штука true. Не понятно, действительно нужно ли оно там.
            this.compatibleMode =
                window.location.href.indexOf('withoutLayout') === -1 &&
                    globalEnv.wsConfig.compatible !== false;
        }
        /**
         * Увеличивает базовый таймаует по количеству дебажных модулей.
         * @param modules Количество всех модулей
         */
        fixLoadingTimeoutForDebug(modules, timeout) {
            if (!this.debugCookies) {
                return timeout;
            }
            if (this.debugCookies === 'true') {
                return timeout * 2;
            }
            const half = Math.floor(modules / 2);
            const debugModules = this.debugCookies.split(',');
            if (debugModules.length < half) {
                return timeout;
            }
            const oneModuleTime = timeout / half;
            const dbgModules = debugModules.length - half;
            return Math.floor(timeout + oneModuleTime * dbgModules);
        }
        getDebugCookie() {
            return this.debugCookies;
        }
        enableRtlDirection() {
            var _a;
            return ((_a = document.body) === null || _a === void 0 ? void 0 : _a.dir) === 'rtl';
        }
        /**
         * Загрузить модули по имени дефайна
         * @param fileInfo Информация о модуле.
         */
        async loadModuleByDefineName(fullName, defineName) {
            const loaderName = this.getLoaderName(defineName);
            let exports = DEFINE_MODULE;
            if (!this.definedMap.has(defineName)) {
                try {
                    const modulePath = this.getModulePath(defineName);
                    exports = await this.loadModule(defineName, loaderName, modulePath);
                }
                catch (err) {
                    this.processableModules.delete(defineName);
                    this.definedMap.delete(defineName);
                    return this.injectCache(defineName, err, this.ignoreLoadError(fullName));
                }
                finally {
                    this.loadableModules.delete(defineName);
                }
            }
            try {
                if (exports === DEFINE_MODULE) {
                    exports = await this.getExportsFromDefine(defineName);
                }
                if (loaderName === 'js' && exports) {
                    injectModuleName(exports, defineName, isObject);
                }
                for (const callback of this.listenerOnLoad) {
                    callback(defineName, exports);
                }
                this.cache.set(defineName, exports);
                return exports;
            }
            catch (err) {
                this.errorsCache.set(defineName, err);
                throw err;
            }
            finally {
                this.processableModules.delete(defineName);
                this.definedMap.delete(defineName);
            }
        }
        /**
         * Обработать запрашиваемый модуль
         * @param fullName Полное имя запрашиваемого модуля
         * @param defineName
         */
        async loadModuleByFullName(fullName, defineName) {
            let getExports = this.processableModules.get(defineName);
            if (!getExports) {
                getExports = this.loadModuleByDefineName(fullName, defineName);
                this.processableModules.set(defineName, getExports);
            }
            try {
                const exports = await getExports;
                return this.extractChain(exports, fullName);
            }
            catch (err) {
                throw err;
            }
            finally {
                this.processableModules.delete(fullName);
            }
        }
        async loadModule(defineName, loaderName, modulePath) {
            let loadPromise = this.loadableModules.get(defineName);
            if (!loadPromise) {
                loadPromise = this._createDefinitionPromise(defineName, this._createDownLoadPromise(defineName, loaderName, modulePath));
                this.loadableModules.set(defineName, loadPromise);
            }
            return loadPromise;
        }
        /**
         * Создаёт промис на загрузку
         * @param fileInfo
         */
        _createDownLoadPromise(defineName, loaderName, modulePath) {
            const moduleInfo = this.modules[this.getRootDir(modulePath)];
            if (moduleInfo && moduleInfo.hasBundles) {
                return bundleLoader(defineName, modulePath, loaderName, this, loaders[loaderName]);
            }
            else {
                return loaders[loaderName](defineName, modulePath, this);
            }
        }
        _createDefinitionPromise(defineName, targetPromise) {
            return new Promise(async (resolve, reject) => {
                const resetController = new AbortController();
                let signal;
                let timeoutId;
                let clear;
                if (typeof AbortSignal.timeout === 'function') {
                    signal = AbortSignal.timeout(this.loadingTimeout);
                    clear = () => {
                        resetController.abort();
                    };
                }
                else {
                    const controller = new AbortController();
                    signal = controller.signal;
                    timeoutId = setTimeout(() => {
                        controller.abort();
                    }, this.loadingTimeout);
                    clear = () => {
                        clearTimeout(timeoutId);
                        resetController.abort();
                    };
                }
                signal.addEventListener('abort', () => {
                    reject(new RequireError(`Module "${defineName}" did not load within ${this.loadingTimeout} ms.`));
                }, { signal: resetController.signal });
                try {
                    const result = await targetPromise;
                    resolve(result);
                }
                catch (error) {
                    reject(error);
                }
                finally {
                    clear();
                }
            });
        }
        /**
         * Получения экпорта модуля
         */
        async getExportsFromDefine(defineName) {
            try {
                //@ts-ignore
                const [deps, callback] = this.definedMap.get(defineName);
                if (deps.length === 0) {
                    return this.executeCallback(defineName, callback);
                }
                // Необходма для того чтобы require смог разрещить относительные пути.
                this.currentModule = defineName;
                return this.executeCallback(defineName, callback, await this.require(deps), deps);
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
        load(fullName) {
            let promise = this.processableModules.get(fullName);
            if (promise) {
                return promise;
            }
            const defineName = this.getDefineName(fullName);
            promise =
                fullName === defineName
                    ? this.loadModuleByDefineName(fullName, defineName)
                    : this.loadModuleByFullName(fullName, defineName);
            this.processableModules.set(fullName, promise);
            return promise;
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
                throw new RequireError(`Module ${normalizeName} has not been loaded. Use require([])`);
            }
            const promises = [];
            const errors = [];
            let allGotFromCache = true;
            for (const moduleName of moduleNames || []) {
                // TODO Это полный дурдом, но оригинальый require умеет обрабатывать [''] и [undefined] и [function].
                //  Пока что такой кейс всплалыл moduleStub и в старых демках, но фиг знает где оно ещё всплывёт,
                //  поэтому придёться поддержать сия кейс. Но надо будет это спиливать.
                if (!(moduleName && typeof moduleName === 'string')) {
                    promises.push(undefined);
                    continue;
                }
                const normalizeName = this.normalizeName(moduleName);
                try {
                    const value = this.extractCache(normalizeName);
                    if (value !== NO_CACHE) {
                        promises.push(value);
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
                allGotFromCache = false;
                promises.push(this.load(normalizeName));
            }
            // Если все запрашиваемые модули были извелечены из кеша,
            // вызываем синхроно колбеки, чтобы отдать модули, как можно быстрее.
            if (allGotFromCache) {
                if (typeof successCallback === 'function') {
                    return this.fireCallbacks(promises, errors, successCallback, errorCallback);
                }
                return this.firePromise(promises, errors);
            }
            if (typeof successCallback === 'function') {
                this.processLoadingPromises(promises, errors)
                    .then(([returnValues, returnErrors]) => {
                    this.fireCallbacks(returnValues, returnErrors, successCallback, errorCallback);
                })
                    .catch((err) => {
                    errorCallback === null || errorCallback === void 0 ? void 0 : errorCallback(err);
                });
            }
            else {
                return this.processLoadingPromises(promises, errors).then(([returnValues, returnErrors]) => {
                    return this.firePromise(returnValues, returnErrors);
                });
            }
        }
        /**
         * Обрабатывает промисы по загрузке модулей.
         * @param promises Список промисов
         * @param errors Список ошибок
         */
        async processLoadingPromises(promises, errors) {
            const result = await Promise.allSettled(promises);
            const returnValues = [];
            const returnErrors = [...errors];
            for (const res of result) {
                if (res.status === 'fulfilled') {
                    returnValues.push(res.value);
                }
                else {
                    returnErrors.push(res.reason);
                }
            }
            return [returnValues, returnErrors];
        }
        detectAnonymousModule() {
            return document.currentScript.name;
        }
    }
    /**
     * Глоабльаня функция для иницилизации веб require в глобальном окружение.
     */
    // @ts-ignore
    globalEnv.initRequire = () => {
        const localRequire = new WebRequire();
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
        if (globalEnv.preDefineModules) {
            for (const defineArgs of globalEnv.preDefineModules) {
                localRequire.define(...defineArgs);
            }
            globalEnv.preDefineModules.clear();
        }
        startWatchLinks();
        if (globalEnv.preRequiredModules) {
            for (const argsRequire of globalEnv.preRequiredModules) {
                localRequire.require(...argsRequire);
            }
            globalEnv.preRequiredModules.clear();
        }
    };

    return WebRequire;

})();
