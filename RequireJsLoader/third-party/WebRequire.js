(function () {
    'use strict';

    class RequireError extends Error {
        constructor(message, options) {
            // TODO Пришлось оставить тип описан для ES5, убрать как поднимем версию для TS.
            // @ts-ignore
            super(message, options);
            this.requireError = true;
            // TODO Пришлось оставить тип описан для ES5, убрать как поднимем версию для TS.
            // @ts-ignore
            if ((options === null || options === void 0 ? void 0 : options.cause) && !this.cause) {
                const cause = options.cause;
                this.message += `Caused by: ${cause.message} Stack: ${cause.stack}`;
            }
            this.type = (options === null || options === void 0 ? void 0 : options.type) || '';
        }
        static isReqiureError(err) {
            return err === null || err === void 0 ? void 0 : err.requireError;
        }
    }

    const IS_BROWSER = typeof window !== 'undefined';
    const ALIAS_MAP = new Map(Object.entries({
        WS: ['WS.Core', 'WS.Core'],
        Core: ['WS.Core', 'WS.Core/core'],
        Lib: ['WS.Core', 'WS.Core/lib'],
        Ext: ['WS.Core', 'WS.Core/lib/Ext'],
        Helpers: ['WS.Core', 'WS.Core/core/helpers'],
        Transport: ['WS.Core', 'WS.Core/transport'],
        Deprecated: ['WS.Deprecated', 'WS.Deprecated'],
    }));
    class BaseRequire {
        constructor(config) {
            this.buildMode = config.buildMode || 'debug';
            this.loadingTimeout = config.loadingTimeout;
            this.modulesResolution = config.modulesResolution || new Map();
            this.modulesInfo = new Map();
            this.modules = new Map();
            this.loadableModules = new Map();
            this.cache = new Map();
            this.parseNameCache = new Map();
            this.listenerOnLoad = new Set();
            this.compatibleMode = false;
            this.context = null;
        }
        onLoadModule(callback) {
            this.listenerOnLoad.add(callback);
        }
        offLoadModule(callback) {
            this.listenerOnLoad.delete(callback);
        }
        getModule(name, context) {
            if (this.modules.has(name)) {
                return this.modules.get(name);
            }
            const module = context.createModule(name);
            this.modules.set(name, module);
            return module;
        }
        normalizeName(name) {
            if (name[0] === '.' && this.context) {
                return this.context.getRelName(name);
            }
            return name;
        }
        parseName(moduleName) {
            const cache = this.parseNameCache.get(moduleName);
            if (cache) {
                return cache;
            }
            const result = {
                defineName: '',
                filePath: '',
                extension: 'js',
                rootDir: '',
                needLoad: true,
                ignoreError: false,
                chain: [],
            };
            const normalizeName = this.normalizeName(moduleName);
            let isRootDir = true;
            let isChain = false;
            let hasOptional = false;
            let hasIs = false;
            let part = '';
            for (const symbol of normalizeName) {
                if (symbol === '/' && isRootDir) {
                    // Откидываем лидирующий слеш для пути, но нужно оставить для имени define-а.
                    if (part === '') {
                        result.defineName += symbol;
                        continue;
                    }
                    const normalizeRoot = ALIAS_MAP.get(part);
                    result.defineName += part;
                    if (normalizeRoot) {
                        result.rootDir = normalizeRoot[0];
                        result.filePath = normalizeRoot[1];
                    }
                    else {
                        result.rootDir = part;
                        result.filePath = part;
                    }
                    if (hasOptional) {
                        result.needLoad = this.modulesInfo.has(result.rootDir);
                    }
                    // Убираем root из обрабатываемой строки и добаялем слеш.
                    part = symbol;
                    isRootDir = false;
                    continue;
                }
                if (symbol === '!') {
                    if (part === 'optional') {
                        hasOptional = true;
                        result.ignoreError = true;
                    }
                    else if (part === 'is') {
                        hasIs = true;
                    }
                    else if (part === 'browser') {
                        result.needLoad = IS_BROWSER;
                    }
                    else {
                        result.extension = part;
                        part += symbol;
                        result.defineName += part;
                    }
                    part = '';
                    continue;
                }
                if (symbol === '?') {
                    if (hasIs) {
                        if (part === 'compatibleLayer') {
                            result.needLoad = this.compatibleMode;
                        }
                        if (part === 'browser') {
                            result.needLoad = IS_BROWSER;
                        }
                    }
                    part = '';
                    continue;
                }
                if (symbol === ':') {
                    result.filePath += part;
                    part = '';
                    isChain = true;
                    continue;
                }
                if (symbol === '.' && isChain) {
                    result.chain.push(part);
                    part = '';
                    continue;
                }
                part += symbol;
            }
            if (isChain) {
                result.chain.push(part);
            }
            else {
                result.filePath += part;
                result.defineName += part;
            }
            if (isRootDir) {
                result.rootDir = result.filePath;
            }
            const resolvedName = this.modulesResolution.get(result.defineName);
            if (resolvedName) {
                result.rootDir = resolvedName[0];
                result.filePath = resolvedName[1];
            }
            this.parseNameCache.set(moduleName, result);
            return result;
        }
        firePromise(results, errors) {
            if (errors.length === 0) {
                return Promise.resolve(results);
            }
            return Promise.reject(errors[0]);
        }
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
        extractCache(fullName, { defineName, needLoad, chain, ignoreError }) {
            // Обработка для служебного зависимости exports, отдаём объект,
            // который будет наполнен експортируемыми сущностями.
            if (fullName === 'exports') {
                return ['hit', {}];
            }
            // TODO Сомвестимсоть со старым.
            //  В архи старых модулях юзат зависимость "module", которая возвращает в объект с полем export,
            //  в него и склыдвают, что должен возрвращать модуль.
            //  Поэтому придёться обработь сия кейс и забирать от туда результат.
            //  Чтобы откатазать от этого кейса надо все переписать на простой return
            if (fullName === 'module') {
                return [
                    'hit',
                    {
                        exports: {},
                    },
                ];
            }
            // Проверим сначал кеш по имени, которое передали в require
            if (this.cache.has(fullName)) {
                return this.extractResult(this.cache.get(fullName));
            }
            // Если запросили модуль с условиям, например, только для браузера и оно не прошло,
            // то можно отдать сразу null и не пытаться ничего грузить.
            if (!needLoad) {
                this.cache.set(fullName, null);
                return ['hit', null];
            }
            // Проверяем нет ли в кеши модуля по имене, которое указано у него в define.
            if (this.cache.has(defineName)) {
                const result = this.cache.get(defineName);
                this.cache.set(fullName, result);
                return this.extractResult(result, ignoreError, chain);
            }
            return ['miss', undefined];
        }
        extractResult(module, ignoreError, chain) {
            if (RequireError.isReqiureError(module)) {
                if (ignoreError && module.type === 'load') {
                    return ['hit', null];
                }
                return ['error', module];
            }
            if (chain && chain.length !== 0) {
                let result = module;
                for (const nameProp of chain) {
                    const typeResult = typeof result;
                    if (typeResult && (typeResult === 'object' || typeResult === 'function')) {
                        result = result[nameProp];
                        continue;
                    }
                    return [
                        'error',
                        new RequireError(`Chain access failed at '${nameProp}' for module ${module}.`, {
                            type: 'ChainError',
                        }),
                    ];
                }
                return ['hit', result];
            }
            return ['hit', module];
        }
    }

    const EMPTY_FUNC = function () { };
    const NO_EXPORTS = Symbol('no-exports');
    let Module$1 = class Module {
        constructor(name) {
            this.name = name;
            this.defined = false;
            this.url = '';
            this.rootDir = '';
            this.extension = 'js';
            this.path = '';
            this.deps = [];
            this.callback = EMPTY_FUNC;
            this.exports = NO_EXPORTS;
            this.onDefine = null;
            this.loading = null;
        }
        define(deps, callback) {
            var _a;
            if (this.defined) {
                return;
            }
            this.defined = true;
            if (typeof deps === 'function') {
                this.callback = deps;
            }
            else {
                this.callback = callback || EMPTY_FUNC;
                this.deps = deps;
            }
            (_a = this.onDefine) === null || _a === void 0 ? void 0 : _a.call(this);
            this.loading = null;
            this.onDefine = null;
        }
        extractExports(depsValue) {
            const module = depsValue[this.deps.indexOf('module')];
            const exports = depsValue[this.deps.indexOf('exports')];
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
        getRelName(relName) {
            const result = this.name.split('/');
            const splitRelName = relName.split('/');
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
            return result.join('/');
        }
        static injectModuleName(obj, moduleName) {
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
                Object.getPrototypeOf(exports) === Object.prototype &&
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
    };

    async function fetchLoader (url, crossOrigin) {
        const response = await fetch(url, {
            mode: crossOrigin ? 'cors' : 'no-cors',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    }

    const loading$1 = new Map();
    function tagScript (url, name, crossOrigin) {
        if (loading$1.has(url)) {
            return loading$1.get(url);
        }
        const promise = new Promise((resolve, reject) => {
            const node = document.createElement('script');
            node.type = 'text/javascript';
            node.async = true;
            node.src = url;
            node.name = name;
            if (crossOrigin) {
                node.crossOrigin = 'anonymous';
            }
            node.addEventListener('load', () => {
                loading$1.delete(url);
                node.remove();
                resolve();
            });
            node.addEventListener('error', (err) => {
                loading$1.delete(url);
                node.remove();
                reject(err);
            });
            document.head.appendChild(node);
        });
        loading$1.set(url, promise);
        return promise;
    }

    const filesOfWithoutDdefine = [
        '/cdn/Punycode/1.0.0/punycode.js',
        '/cdn/JQuery/jquery-cookie/04-04-2014/jquery-cookie-min.js',
        '/cdn/JQuery/jquery-ui/1.12.1.3/jquery-ui-position-min.js',
        'Controls-Calculator/_view/third-party/big',
        '/cdn/AceEditor/1.2.3/src-min/ace.js',
        '/cdn/StaffCDN/PixiSpine/v1/spine-pixi-v8.min.js',
        '/cdn/AudioPlayerCDN/libs/id3-reader/v1.0.0-patched/id3-minimized.js',
        '/cdn/Codemirror/5.58.1.15/diff-min.js',
        '/cdn/Codemirror/5.58.1.14/linters-min.js',
        'SBIS3.CONTROLS/ColorPicker/resources/colpick',
    ];
    async function js (module, moduleInfo) {
        const { buildUrl, crossOrigin } = moduleInfo;
        module.url = buildUrl(module.path, 'js');
        await tagScript(module.url, module.name, crossOrigin);
        if (filesOfWithoutDdefine.includes(module.name)) {
            module.define([], () => null);
        }
    }

    // TODO https://rollupjs.org/troubleshooting/#eval2-eval
    // eslint-disable-next-line no-eval
    const eval2$1 = eval;
    async function wml (module, moduleInfo, context, ext = 'wml', deps = []) {
        const { buildUrl, crossOrigin, hasTailwind, templateExtension, ESVersion } = moduleInfo;
        if (templateExtension === 'js') {
            module.path = `${module.path}.${ext}`;
            return js(module, moduleInfo);
        }
        module.url = buildUrl(module.path, ext);
        const html = await fetchLoader(module.url, crossOrigin);
        const isCompiledModule = html && (html.startsWith('define') || html.startsWith('(function('));
        if (isCompiledModule) {
            eval2$1(html);
            return;
        }
        const ownDeps = ['Compiler/Compiler', ...deps];
        if (hasTailwind) {
            // При сборке исходных файлов в шаблоны вставляется такая зависимость тогда и только тогда,
            // когда в конкретном шаблоне имеется уникальный (не существующий в Tailwind) класс.
            // При сборке шаблона в runtime на клиенте нет возможности выполнить такую умную инъекцию зависимости,
            // поэтому загружаем существующие сгенерированные tailwind файлы для всего модуля
            // при первой компиляции шаблона на клиенте из этого модуля.
            ownDeps.push(`css!${module.rootDir}/tailwind`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [CompilerLib] = await context.require(ownDeps);
        const compiler = new CompilerLib.Compiler();
        const artifact = compiler.compileSync(html, {
            fileName: `${module.path}.${ext}`,
            ESVersion,
        });
        if (!artifact.stable) {
            throw artifact.errors[0];
        }
        eval2$1(artifact.text);
    }

    function tmpl (module, moduleInfo, context) {
        return wml(module, moduleInfo, context, 'tmpl', [
            'is!compatibleLayer?Lib/Control/Control.compatible',
            'is!compatibleLayer?Lib/Control/AreaAbstract/AreaAbstract.compatible',
        ]);
    }

    const loading = new Map();
    let notInit = true;
    const loadedLink = new Set();
    function tagLink (url, crossOrigin) {
        if (notInit) {
            const links = Array.from(document.getElementsByTagName('link'));
            for (const link of links) {
                loadedLink.add(link.getAttribute('href'));
            }
            notInit = false;
        }
        if (loadedLink.has(url)) {
            return Promise.resolve();
        }
        if (loading.has(url)) {
            return loading.get(url);
        }
        const promise = new Promise((resolve, reject) => {
            const node = document.createElement('link');
            node.rel = 'stylesheet';
            node.href = url;
            if (crossOrigin) {
                node.crossOrigin = 'anonymous';
            }
            node.addEventListener('load', () => {
                loading.delete(url);
                loadedLink.add(url);
                resolve();
            });
            node.addEventListener('error', (err) => {
                loading.delete(url);
                reject(err);
            });
            document.head.appendChild(node);
        });
        loading.set(url, promise);
        return promise;
    }

    var _a;
    // @ts-ignore
    const globalEnv$2 = globalThis;
    const disableLoadCss = !(((_a = globalEnv$2.wsConfig) === null || _a === void 0 ? void 0 : _a.loadCss) === undefined
        ? true
        : globalEnv$2.wsConfig.loadCss);
    const IGNORE_MODULE = 'SBIS3.CONTROLS';
    /*
     * Старые страницы хранят имя темы в wsConfig.themeName
     * Достаём из конфигурации тему. Если конфигурация отсутствует или
     * отсутствует свойство themeName, значит считаем, что работаем с онлайном и
     * позволяем грузить онлайновские контролы.
     * @param name
     * @returns {string}
     */
    function resolveSuffix(name) {
        var _a;
        return ((_a = globalEnv$2.wsConfig) === null || _a === void 0 ? void 0 : _a.themeName) && name === IGNORE_MODULE;
    }
    async function css (module, { buildUrl, crossOrigin }) {
        if (disableLoadCss || resolveSuffix(module.rootDir)) {
            module.define([], () => null);
            return;
        }
        module.url = buildUrl(module.path, 'css');
        await tagLink(module.url, crossOrigin);
        module.define([], () => null);
    }

    async function i18n (module, _moduleInfo, context) {
        const [{ controller, Translator }] = await context.require(['I18n/singletonI18n']);
        if (module.path === 'I18n/controller') {
            await controller.isReady();
            module.define([], () => controller);
            return;
        }
        const emptyTranslator = new Translator({}, controller);
        const defaultTranslator = (key, context, pluralNumber, isTemplate) => {
            return emptyTranslator.translate(key, context, pluralNumber, isTemplate);
        };
        if (!controller.isEnabled) {
            module.define([], () => defaultTranslator);
            return;
        }
        const contextName = module.rootDir;
        if (!contextName) {
            module.define([], () => defaultTranslator);
            return;
        }
        if (controller.translators.hasOwnProperty(contextName)) {
            const translator = controller.translators[contextName];
            module.define([], () => translator.translate.bind(translator));
            return;
        }
        try {
            const translator = await controller.getTranslator(contextName);
            module.define([], () => translator.translate.bind(translator));
        }
        catch (err) {
            module.define([], () => defaultTranslator);
        }
    }

    async function json (module, { buildUrl, crossOrigin }) {
        module.url = buildUrl(module.path, 'json');
        const result = JSON.parse(await fetchLoader(module.url, crossOrigin));
        module.define([], () => result);
    }

    async function text (module, { buildUrl, crossOrigin }) {
        const splitName = module.path.split('.');
        const ext = splitName.pop();
        const path = splitName.join('.');
        module.url = buildUrl(path, ext);
        const result = await fetchLoader(module.url, crossOrigin);
        module.define([], () => result);
    }

    // TODO https://rollupjs.org/troubleshooting/#eval2-eval
    // eslint-disable-next-line no-eval
    const eval2 = eval;
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
    async function html (module, { buildUrl, crossOrigin }, context) {
        module.url = buildUrl(module.path, 'xhtml');
        await context.require(['i18n!' + module.url.split('/')[0]]);
        const html = await fetchLoader(module.url, crossOrigin);
        const isCompiledModule = html && html.startsWith('define');
        if (isCompiledModule) {
            eval2(html);
            return;
        }
        const [doT] = await context.require(['optional!Core/js-template-doT']);
        const config = doT.getSettings();
        config.strip = false;
        const result = mkTemplate(doT.template(html, config, undefined, undefined, module.path), module.path);
        module.define([], () => result);
    }

    const PACKABLE_EXTENSION = ['js', 'css', 'wml', 'tmpl', 'html'];
    const BUNDLE_EXTENSION = '.package';
    const BUNDLE_MAP_NAME = 'packageMap.json';
    function isPackableExtension(extension) {
        return PACKABLE_EXTENSION.includes(extension);
    }
    function isBundle(path) {
        return path.endsWith(BUNDLE_EXTENSION);
    }
    function isBundlesMap(path) {
        return path.endsWith(BUNDLE_MAP_NAME);
    }
    async function bundleLoader (module, moduleInfo, context, defaultLoader) {
        if (isBundle(module.path) ||
            !isPackableExtension(module.extension) ||
            isBundlesMap(module.path)) {
            return defaultLoader(module, moduleInfo, context);
        }
        const [maps] = (await context.require([moduleInfo.packageMap]));
        if (maps.hasOwnProperty(module.name)) {
            // TODO Надо чтобы билдер возрвщал без min
            const [packagePath] = maps[module.name].split('.min.');
            module.path = packagePath;
            // TODO модуль может быть упакован в пакет из другого модуля.
            //  Поэтому необхоимо взяить moduleInfo по модулю, где живёт пакет, чтобы мы корректно построили url.
            //  Кастомные пакеты должны умереть с приходом паковки по pagex.
            const packageInfo = context.modulesInfo.get(packagePath.split('/')[0]);
            if (module.extension === 'css') {
                return css(module, packageInfo);
            }
            return js(module, packageInfo);
        }
        return defaultLoader(module, moduleInfo, context);
    }

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
    class Module extends Module$1 {
        constructor(name, loader) {
            super(name);
            this.loader = loader;
        }
        _createDefinitionPromise(timeout) {
            const resetController = new AbortController();
            let signal;
            let timeoutId;
            let clear;
            if (typeof AbortSignal.timeout === 'function') {
                signal = AbortSignal.timeout(timeout);
                clear = () => {
                    resetController.abort();
                    this.onDefine = null;
                };
            }
            else {
                const controller = new AbortController();
                signal = controller.signal;
                timeoutId = setTimeout(() => {
                    controller.abort();
                }, timeout);
                clear = () => {
                    clearTimeout(timeoutId);
                    resetController.abort();
                    this.onDefine = null;
                };
            }
            const promise = new Promise((resolve, reject) => {
                signal.addEventListener('abort', () => {
                    reject(new RequireError(`Module "${this.name}" by url "${this.url}" did not load within ${timeout} ms.`));
                }, { signal: resetController.signal });
                this.onDefine = resolve;
            });
            return {
                promise,
                clear,
            };
        }
        async _createDownLoadPromise(timeout) {
            const { promise, clear } = this._createDefinitionPromise(timeout);
            try {
                const moduleInfo = this.loader.modulesInfo.get(this.rootDir) ||
                    this.loader.modulesInfo.get('$default$');
                if (moduleInfo.packageMap) {
                    await bundleLoader(this, moduleInfo, this.loader, loaders[this.extension]);
                }
                else {
                    await loaders[this.extension](this, moduleInfo, this.loader);
                }
                await promise;
            }
            catch (err) {
                if (RequireError.isReqiureError(err)) {
                    throw err;
                }
                else {
                    throw new RequireError(`Failed to load module "${this.name}" file by url "${this.url}".`, {
                        cause: err,
                        type: 'load',
                    });
                }
            }
            finally {
                clear();
            }
        }
        load(timeout) {
            if (!this.loading) {
                this.loading = this._createDownLoadPromise(timeout);
            }
            return this.loading;
        }
        async getExports() {
            if (this.exports !== NO_EXPORTS) {
                return this.exports;
            }
            try {
                if (this.deps.length === 0) {
                    this.exports = this.callback();
                }
                else {
                    // Необходма для того чтобы require смог разрещить относительные пути.
                    this.loader.context = this;
                    const depExports = await this.loader.require(this.deps);
                    // В этой точке конетекст может быть перебить зависимостями, поэтому выставялем его снова.
                    // Внутри колбека могут вызывать синхроный require с относительным именем.
                    this.loader.context = this;
                    this.exports = this.callback(...depExports);
                    this.loader.context = null;
                    if (!this.exports) {
                        this.exports = this.extractExports(depExports);
                    }
                }
                if (this.extension === 'js' && this.exports) {
                    Module$1.injectModuleName(this.exports, this.name);
                }
                return this.exports;
            }
            catch (err) {
                if (RequireError.isReqiureError(err)) {
                    throw err;
                }
                throw new RequireError(`Failed to execute  callback function for module "${this.name}" loaded by url "${this.url}".`, {
                    cause: err,
                    type: 'Executing callback',
                });
            }
        }
    }

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
            pixi8: `${cdnName}PixiJS/8.7.2-p1/pixi.min.js`,
            'pixi-react7': `${cdnName}PixiReact/7.1.3-p1/pixi-react.min.js`,
            // jQuery must die
            jquery: `${cdnName}JQuery/jquery/3.3.1/jquery-min.js`,
        };
        const result = new Map();
        for (const [defineName, path] of Object.entries(map)) {
            result.set(defineName, [path.split('/')[0], path]);
        }
        return result;
    }

    // @ts-ignore
    const globalEnv$1 = globalThis;
    function getStaticsDomain() {
        var _a, _b;
        if (Array.isArray(globalEnv$1.wsConfig.staticDomains)) {
            return globalEnv$1.wsConfig.staticDomains[0];
        }
        return (_b = (_a = globalEnv$1.wsConfig.staticDomains) === null || _a === void 0 ? void 0 : _a.domains) === null || _b === void 0 ? void 0 : _b[0];
    }

    // @ts-ignore
    const globalEnv = globalThis;
    const DEFAULT_TIMEOUT = 30000;
    const EXTENSION_WITHOUT_MIN = new Set(['txt', 'woff2', 'webp', 'jpg', 'png', 'svg']);
    function getDebugModules(modules, buildMode) {
        var _a;
        if (buildMode === 'debug') {
            return new Set(Object.keys(modules));
        }
        const debug = (_a = document.cookie.match(/(?:^|;)\s*s3debug\s*=\s*([^;]+)/)) === null || _a === void 0 ? void 0 : _a[1];
        if (debug) {
            if (debug === 'true') {
                return new Set(Object.keys(modules));
            }
            return new Set([...debug.split(','), 'React']);
        }
        return new Set();
    }
    class WebRequire extends BaseRequire {
        constructor(config) {
            super(config);
            this.debugModules = getDebugModules(config.modules, this.buildMode);
            this.buildConfig(config);
            this.cache.set('require', this.require.bind(this));
            this.compatibleMode =
                window.location.href.indexOf('withoutLayout') === -1 &&
                    globalEnv.wsConfig.compatible !== false;
        }
        buildConfig({ modules, pagexPackages, staticsDomain, sharedDomain = '', rootDomain, staticsRoot = '/resources/', metaRoot = '', cdnRoot = '/cdn/', contents, }) {
            const domainForStatics = staticsDomain ? `//${staticsDomain}` : '';
            const crossOrigin = !!(domainForStatics && domainForStatics !== rootDomain);
            const { extensionForTemplate: templateExtension, buildnumber: defaultVersion = '99.9999-1', ESVersion: defaultESVersions, } = contents;
            for (const [name, moduleConfig] of Object.entries(modules)) {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                const { hasBundles, from_ps, buildnumber, path, hasTailwind, ESVersion } = moduleConfig;
                const domain = from_ps === 'true' ? '' : domainForStatics;
                const enableDebug = this.debugModules.has(name);
                const root = path ? path.slice(0, path.lastIndexOf('/') + 1) : staticsRoot;
                const postfixForMinVersion = enableDebug ? '' : '.min';
                const queryParams = `?x_module=${buildnumber || defaultVersion}`;
                const info = {
                    buildUrl(filePath, extension) {
                        if (EXTENSION_WITHOUT_MIN.has(extension)) {
                            return `${domain}${root}${filePath}.${extension}${queryParams}`;
                        }
                        return `${domain}${root}${filePath}${postfixForMinVersion}.${extension}${queryParams}`;
                    },
                    buildPath(filePath, extension) {
                        return this.buildUrl(filePath, extension);
                    },
                    crossOrigin,
                    hasTailwind,
                    templateExtension,
                    ESVersion: ESVersion || defaultESVersions,
                };
                if (hasBundles && !pagexPackages && !enableDebug) {
                    info.packageMap = `${name}/packageMap.json`;
                }
                this.modulesInfo.set(name, info);
            }
            this.modulesInfo.set('cdn', {
                buildUrl: (moduleName, extension) => {
                    const cdnFilePath = moduleName.replace('cdn/', '');
                    if (cdnFilePath.endsWith(extension)) {
                        return `${domainForStatics}${cdnRoot}${cdnFilePath}`;
                    }
                    return `${domainForStatics}${cdnRoot}${cdnFilePath}.${extension}`;
                },
                buildPath(moduleName, extension) {
                    return this.buildUrl(moduleName, extension);
                },
                ESVersion: defaultESVersions,
                crossOrigin,
            });
            const postfixForMinVersion = this.debugModules.size === 0 ? '.min' : '';
            const crossOriginMeta = !!(sharedDomain && sharedDomain !== rootDomain);
            this.modulesInfo.set('$default$', {
                buildUrl(filePath, extension) {
                    return `${sharedDomain}${metaRoot}${filePath}${postfixForMinVersion}.${extension}?x_module=${defaultVersion}`;
                },
                buildPath(filePath, extension) {
                    return this.buildUrl(filePath, extension);
                },
                crossOrigin: crossOriginMeta,
            });
        }
        createModule(name) {
            return new Module(name, this);
        }
        async processModule(module, { defineName, ignoreError, chain }) {
            if (!module.defined) {
                try {
                    await module.load(this.loadingTimeout);
                }
                catch (err) {
                    this.cache.set(defineName, err);
                    this.loadableModules.delete(defineName);
                    const [typeCache, value] = this.extractResult(err, ignoreError);
                    if (typeCache === 'hit') {
                        return value;
                    }
                    throw value;
                }
            }
            try {
                const exports = await module.getExports();
                for (const callback of this.listenerOnLoad) {
                    callback(defineName, exports);
                }
                this.cache.set(defineName, exports);
                this.loadableModules.delete(defineName);
                const [typeCache, value] = this.extractResult(exports, ignoreError, chain);
                if (typeCache === 'hit') {
                    return value;
                }
                else {
                    throw value;
                }
            }
            catch (err) {
                this.cache.set(defineName, err);
                this.loadableModules.delete(defineName);
                throw err;
            }
        }
        loadModule(fileInfo) {
            const { defineName, extension, filePath, rootDir } = fileInfo;
            if (this.loadableModules.has(defineName)) {
                return this.loadableModules.get(defineName);
            }
            const module = this.getModule(defineName, this);
            module.path = filePath;
            module.rootDir = rootDir;
            module.extension = extension;
            const promise = this.processModule(module, fileInfo);
            this.loadableModules.set(defineName, promise);
            return promise;
        }
        require(moduleNames, successCallback, errorCallback) {
            // Если передали только имя модуля, то пытемся извлечь, его из кеша, если не получиться выкидываем ошмбку.
            if (typeof moduleNames === 'string') {
                const info = this.parseName(moduleNames);
                const [cacheType, value] = this.extractCache(moduleNames, info);
                if (cacheType === 'hit') {
                    return value;
                }
                if (cacheType === 'error') {
                    throw value;
                }
                throw new RequireError(`Module ${moduleNames} has not been loaded. Use require([])`);
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
                const info = this.parseName(moduleName);
                const [cacheType, value] = this.extractCache(moduleName, info);
                if (cacheType === 'hit') {
                    promises.push(value);
                    continue;
                }
                if (cacheType === 'error') {
                    errors.push(value);
                    continue;
                }
                if (cacheType === 'miss') {
                    allGotFromCache = false;
                    promises.push(this.loadModule(info));
                }
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
        define(name, deps, callback) {
            let defineName = name;
            let dependencies = deps;
            let callbackFn = callback;
            // Если модуль анонимный будем искать его по url.
            if (typeof name !== 'string') {
                defineName = document.currentScript.name;
                dependencies = name;
                callbackFn = deps;
            }
            const module = this.getModule(defineName, this);
            module.define(dependencies, callbackFn);
        }
    }
    // @ts-ignore
    globalEnv.initRequire = () => {
        var _a, _b, _c, _d, _e;
        const modules = ((_a = globalEnv.contents) === null || _a === void 0 ? void 0 : _a.modules) || {};
        const reactVersion = ((_d = (_c = (_b = globalEnv.contents) === null || _b === void 0 ? void 0 : _b.modules) === null || _c === void 0 ? void 0 : _c.React) === null || _d === void 0 ? void 0 : _d.version) || 17;
        const localRequire = new WebRequire({
            modules,
            buildMode: (_e = globalEnv.contents) === null || _e === void 0 ? void 0 : _e.buildMode,
            rootDomain: location.host,
            staticsRoot: globalEnv.wsConfig.resourceRoot,
            metaRoot: globalEnv.wsConfig.metaRoot || globalEnv.metaRoot,
            staticsDomain: getStaticsDomain(),
            sharedDomain: globalEnv.wsConfig.shardDomain,
            cdnRoot: globalEnv.wsConfig.cdnRoot,
            loadingTimeout: globalEnv.wsConfig.moduleLoadingTimeout || DEFAULT_TIMEOUT,
            pagexPackages: globalEnv.wsConfig.pagexPackages,
            contents: globalEnv.contents,
            modulesResolution: getModuleResolution(reactVersion),
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
        globalEnv.requirejs.defined = (name) => {
            if (name && typeof name === 'string') {
                const fileInfo = localRequire.parseName(name);
                const [type] = localRequire.extractCache(name, fileInfo);
                return type === 'hit';
            }
            return false;
        };
        globalEnv.requirejs.undef = (name) => {
            const module = localRequire.modules.get(name);
            if (!module) {
                return;
            }
            const scripts = Array.from(document.getElementsByTagName('script'));
            for (const script of scripts) {
                if (script.name === module.name || script.src === module.url) {
                    break;
                }
            }
            localRequire.modules.delete(name);
            localRequire.cache.delete(name);
        };
        // TODO совместимость со старым require. Удалить когда переедм везде на новый.
        globalEnv.requirejs.toUrl = (name) => {
            const splitName = name.split('.');
            const ext = splitName.pop();
            const path = splitName.join('.');
            const [moduleName] = path.split('/');
            const moduleInfo = localRequire.modulesInfo.get(moduleName) ||
                localRequire.modulesInfo.get('$default$');
            return moduleInfo.buildUrl(path, ext);
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
            for (const [name, deps, callback] of globalEnv.preDefineModules) {
                const module = new Module(name, localRequire);
                module.define(deps, callback);
                localRequire.modules.set(name, module);
            }
            globalEnv.preDefineModules.clear();
        }
        if (globalEnv.preRequiredModules) {
            for (const argsRequire of globalEnv.preRequiredModules) {
                localRequire.require(...argsRequire);
            }
            globalEnv.preRequiredModules.clear();
        }
    };

})();
