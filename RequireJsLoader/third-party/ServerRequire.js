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

    function globalConsole(level, args) {
        /* eslint-disable-next-line no-console */
        if (typeof console === 'object' && typeof console[level] === 'function') {
            /* eslint-disable-next-line no-console */
            console[level].apply(undefined, args);
        }
    }
    class ServerConsole {
        info(...args) {
            if (typeof sbis === 'object' && typeof sbis.LogMsg === 'function') {
                sbis.LogMsg(2, `[js][info]: ${this.argsToString(args)}`);
            }
            globalConsole('info', args);
        }
        log(...args) {
            if (typeof sbis === 'object' && typeof sbis.LogMsg === 'function') {
                sbis.LogMsg(2, `[js][log]: ${this.argsToString(args)}`);
            }
            globalConsole('log', args);
        }
        warn(...args) {
            if (typeof sbis === 'object' && typeof sbis.WarningMsg === 'function') {
                sbis.WarningMsg(`[js]: ${this.argsToString(args)}`);
            }
            globalConsole('warn', args);
        }
        error(...args) {
            if (typeof sbis === 'object' && typeof sbis.ErrorMsg === 'function') {
                sbis.ErrorMsg(`[js]: ${this.argsToString(args)}`);
            }
            globalConsole('error', args);
        }
        argsToString(args) {
            return args.map(this.dataToString).join(', ');
        }
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

    let load$1;
    if (typeof TextRequest !== 'undefined') {
        load$1 = TextRequest;
    }
    var loadString = (url) => {
        return load$1(url);
    };

    let load;
    if (typeof importScripts !== 'undefined') {
        load = importScripts;
    }
    var importSript = (url) => {
        load(url);
    };

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
    ];
    var js = (module, { buildPath }) => {
        module.url = buildPath(module.path, 'js');
        importSript(module.url);
        if (filesOfWithoutDdefine.includes(module.name)) {
            module.define([], () => null);
        }
    };

    // TODO https://rollupjs.org/troubleshooting/#eval2-eval
    // eslint-disable-next-line no-eval
    const eval2$1 = eval;
    function wml (module, moduleInfo, context, ext = 'wml', deps = []) {
        const { buildPath, templateExtension, ESVersion } = moduleInfo;
        if (templateExtension === 'js') {
            module.path = `${module.path}.${ext}`;
            return js(module, moduleInfo);
        }
        if (context.buildMode === 'release') {
            module.url = buildPath(module.path, `min.${ext}`);
        }
        else {
            module.url = buildPath(module.path, ext);
        }
        const html = loadString(module.url);
        const isCompiledModule = html && (html.startsWith('define') || html.startsWith('(function('));
        if (isCompiledModule) {
            eval2$1(html);
            return;
        }
        for (const dep of deps) {
            context.require(dep);
        }
        const CompilerLib = context.require('Compiler/Compiler');
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

    async function css (module) {
        module.define([], () => null);
    }

    function i18n (module, _moduleInfo, context) {
        const { controller, Translator } = context.require('I18n/singletonI18n');
        if (module.path === 'I18n/controller') {
            require([
                'I18n/locales/en',
                'I18n/locales/ru',
                'I18n/locales/ar',
                'I18n/locales/he',
                'I18n/locales/fr',
                'I18n/locales/kk',
                'I18n/locales/uz',
                'I18n/locales/tk',
                'LocalizationConfigs/localization_configs/region/RU.json',
                'LocalizationConfigs/localization_configs/region/KZ.json',
                'LocalizationConfigs/localization_configs/region/UZ.json',
                'LocalizationConfigs/localization_configs/region/TM.json',
                //@ts-ignore
            ], (en, ru, ar, he, fr, kk, uz, tk, RU, KZ, UZ, TM) => {
                controller.addRegion('RU', RU, false);
                controller.addRegion('KZ', KZ, false);
                controller.addRegion('UZ', UZ, false);
                controller.addRegion('TM', TM, false);
                controller.addLang('en', en.default, false);
                controller.addLang('ru', ru.default, false);
                controller.addLang('ar', ar.default, false);
                controller.addLang('he', he.default, false);
                controller.addLang('fr', fr.default, false);
                controller.addLang('kk', kk.default, false);
                controller.addLang('uz', uz.default, false);
                controller.addLang('tk', tk.default, false);
                module.define([], () => controller);
            });
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
        const translator = controller.getTranslatorSync(contextName);
        module.define([], () => translator.translate.bind(translator));
        return;
    }

    function json (module, { buildPath }) {
        module.url = buildPath(module.path, 'json');
        const result = JSON.parse(loadString(module.url));
        module.define([], () => result);
    }

    function text (module, { buildPath }) {
        const splitName = module.path.split('.');
        const ext = splitName.pop();
        const path = splitName.join('.');
        module.url = buildPath(path, ext);
        const result = loadString(module.url);
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
    function html (module, { buildPath }, context) {
        module.url = buildPath(module.path, 'xhtml');
        context.require('i18n!' + module.url.split('/')[0]);
        const html = loadString(module.url);
        const isCompiledModule = html && html.startsWith('define');
        if (isCompiledModule) {
            eval2(html);
            return;
        }
        const doT = context.require('optional!Core/js-template-doT');
        const config = doT.getSettings();
        config.strip = false;
        const result = mkTemplate(doT.template(html, config, undefined, undefined, module.path), module.path);
        module.define([], () => result);
    }

    const MAX_SERIALIZATION_LOOKUP_DEPTH = 4;
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
    function isClass(objt) {
        return !!objt.constructor;
    }
    class Module extends Module$1 {
        constructor(name, loader) {
            super(name);
            this.loader = loader;
        }
        load() {
            try {
                const moduleInfo = this.loader.modulesInfo.get(this.rootDir) ||
                    this.loader.modulesInfo.get('$default$');
                loaders[this.extension](this, moduleInfo, this.loader);
            }
            catch (err) {
                if (RequireError.isReqiureError(err)) {
                    throw err;
                }
                throw new RequireError(`Failed to load module "${this.name}" file by url "${this.url}".`, {
                    cause: err,
                    type: 'load',
                });
            }
        }
        getExports() {
            if (this.exports !== NO_EXPORTS) {
                return this.exports;
            }
            if (this.deps.length === 0) {
                this.exports = this.callback();
            }
            else {
                // Необходма для того чтобы require смог разрещить относительные пути.
                this.loader.context = this;
                this.loader.require(this.deps, (...depsExport) => {
                    // В этой точке конетекст может быть перебить зависимостями, поэтому выставялем его снова.
                    // Внутри колбека могут вызывать синхроный require с относительным именем.
                    this.loader.context = this;
                    this.exports = this.callback(depsExport);
                    this.loader.context = null;
                    if (!this.exports) {
                        this.exports = this.extractExports(depsExport);
                    }
                    if (this.extension === 'js' && this.exports) {
                        Module$1.injectModuleName(this.exports, this.name);
                        Module.injectToJson(this.exports, this.name);
                    }
                }, (err) => {
                    if (RequireError.isReqiureError(err)) {
                        throw err;
                    }
                    throw new RequireError(`Failed to execute  callback function for module "${this.name}" loaded by url "${this.url}".`, {
                        cause: err,
                        type: 'Executing callback',
                    });
                });
                return this.exports;
            }
        }
        static makeFunctionSerializable(func, resolver) {
            func.toJSON = () => {
                const [moduleName, path] = resolver(func);
                return {
                    $serialized$: 'func',
                    module: moduleName,
                    path: path || undefined,
                };
            };
        }
        static makeArraySerializable(arr, moduleName, initialPrefix, depth) {
            const arrLength = arr.length;
            const prefix = initialPrefix ? `${initialPrefix}.` : '';
            for (let i = 0; i < arrLength; i++) {
                Module.makeSerializable(depth || 0, arr[i], moduleName, prefix + i);
            }
        }
        static makeObjectSerializable(obj, resolver, depth) {
            const [moduleName, resolvedPrefix] = resolver(obj);
            const prefix = resolvedPrefix ? `${resolvedPrefix}.` : '';
            Object.keys(obj).forEach((prop) => {
                // Go through data descriptors only
                const descriptor = Object.getOwnPropertyDescriptor(obj, prop) || {};
                if (!('value' in descriptor)) {
                    return;
                }
                try {
                    Module.makeSerializable(depth || 0, obj[prop], moduleName, prefix + prop);
                }
                catch (err) {
                    logger.error(`resourceLoadHandler: something went wrong during '${prefix + prop}' property serialization in module '${moduleName}'`, err.message, err);
                }
            });
        }
        /*
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
         */
        static makeSerializable(initialDepth, obj, moduleName, prefix) {
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
                                func.prototype.hasOwnProperty('_moduleName') &&
                                    func.prototype._moduleName;
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
                        Module.makeObjectSerializable(obj, getNameAndPath, depth);
                    }
                    // Secondly add a new property and this way prevent to go through it
                    if (!obj.hasOwnProperty('toJSON')) {
                        Module.makeFunctionSerializable(obj, getNameAndPath);
                    }
                    break;
                }
                case 'object': {
                    const isObject = (objt) => {
                        return Object.getPrototypeOf(objt) === Object.prototype;
                    };
                    if (Array.isArray(obj)) {
                        Module.makeArraySerializable(obj, moduleName, prefix, depth);
                    }
                    else if (isObject(obj)) {
                        // is plain Object
                        Module.makeObjectSerializable(obj, () => [moduleName, prefix], depth);
                    }
                    break;
                }
            }
        }
        static injectToJson(exports, moduleName) {
            Module.makeSerializable(MAX_SERIALIZATION_LOOKUP_DEPTH, exports, moduleName);
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

    const EXTENSION_WITHOUT_MIN = new Set(['txt', 'woff2', 'webp', 'jpg', 'png', 'svg']);
    let loadingModule;
    class ServerRequire extends BaseRequire {
        constructor(config) {
            super(config);
            if (config.buildMode === 'debug') {
                this.debugModules = new Set(Object.keys(config.modules));
            }
            this.buildConfig(config);
        }
        currentDebugModule() {
            var _a, _b, _c;
            if (this.debugModules.size !== 0) {
                return this.debugModules;
            }
            // @ts-ignore
            const debug = ((_c = (_b = (_a = process === null || process === void 0 ? void 0 : process.domain) === null || _a === void 0 ? void 0 : _a.req) === null || _b === void 0 ? void 0 : _b.cookies) === null || _c === void 0 ? void 0 : _c.s3debug) || null;
            if (debug) {
                if (debug === 'true') {
                    return new Set(this.modulesInfo.keys());
                }
                return new Set([...debug.split(','), 'React']);
            }
            return new Set();
        }
        buildConfig({ root = '/', modules, pagexPackages, staticsDomain, sharedDomain = '', staticsRoot = '/resources/', metaRoot = '', cdnRoot = '/cdn/', contents, }) {
            const domainForStatics = staticsDomain ? `//${staticsDomain}` : '';
            const { extensionForTemplate: templateExtension, buildnumber: defaultVersion = '99.9999-1', ESVersion: defaultESVersions, } = contents;
            for (const [name, moduleConfig] of Object.entries(modules)) {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                const { hasBundles, from_ps, buildnumber, path, hasTailwind, ESVersion } = moduleConfig;
                const domain = from_ps === 'true' ? '' : domainForStatics;
                const rootUrl = path ? path.slice(0, path.lastIndexOf('/') + 1) : staticsRoot;
                const queryParams = `?x_module=${buildnumber || defaultVersion}`;
                const enableDebug = () => {
                    return this.currentDebugModule().has(name);
                };
                const info = {
                    buildUrl(filePath, extension) {
                        if (EXTENSION_WITHOUT_MIN.has(extension) || enableDebug()) {
                            return `${domain}${rootUrl}${filePath}.${extension}${queryParams}`;
                        }
                        return `${domain}${rootUrl}${filePath}.min.${extension}${queryParams}`;
                    },
                    buildPath(filePath, extension) {
                        return `${root}${staticsRoot}${filePath}.${extension}`;
                    },
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
                buildPath(filePath, extension) {
                    return `${root}/cdn/${filePath}.${extension}`;
                },
                ESVersion: defaultESVersions,
            });
            const postfixForMinVersion = this.debugModules.size === 0 ? '.min' : '';
            this.modulesInfo.set('$default$', {
                buildUrl(filePath, extension) {
                    return `${sharedDomain}${metaRoot}${filePath}${postfixForMinVersion}.${extension}?x_module=${defaultVersion}`;
                },
                buildPath(filePath, extension) {
                    return `${root}${staticsRoot}${filePath}.${extension}`;
                },
            });
        }
        createModule(name) {
            return new Module(name, this);
        }
        loadModule(fileInfo) {
            const { defineName, ignoreError, chain, extension, filePath, rootDir } = fileInfo;
            loadingModule = defineName;
            const module = this.getModule(defineName, this);
            module.path = filePath;
            module.rootDir = rootDir;
            module.extension = extension;
            if (!module.defined) {
                try {
                    module.load();
                }
                catch (err) {
                    this.cache.set(defineName, err);
                    this.loadableModules.delete(defineName);
                    const [typeCache, value] = this.extractResult(err, ignoreError);
                    if (typeCache === 'hit') {
                        return value;
                    }
                    else {
                        throw value;
                    }
                }
            }
            try {
                const exports = module.getExports();
                for (const callback of this.listenerOnLoad) {
                    callback(defineName, exports);
                }
                const [typeCache, value] = this.extractResult(exports, ignoreError, chain);
                if (typeCache === 'hit') {
                    this.cache.set(defineName, exports);
                    this.loadableModules.delete(defineName);
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
                return this.loadModule(info);
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
                const info = this.parseName(moduleName);
                const [cacheType, value] = this.extractCache(moduleName, info);
                if (cacheType === 'hit') {
                    results.push(value);
                    continue;
                }
                if (cacheType === 'error') {
                    errors.push(value);
                    continue;
                }
                if (cacheType === 'miss') {
                    results.push(this.loadModule(info));
                }
            }
            if (typeof successCallback === 'function') {
                return this.fireCallbacks(results, errors, successCallback, errorCallback);
            }
            return this.firePromise(results, errors);
        }
        define(name, deps, callback) {
            let defineName = name;
            let dependencies = deps;
            let callbackFn = callback;
            // Если модуль анонимный будем искать его по url.
            if (typeof name !== 'string') {
                defineName = loadingModule;
                dependencies = name;
                callbackFn = deps;
            }
            const module = this.getModule(defineName, this);
            module.define(dependencies, callbackFn);
        }
    }
    // @ts-ignore
    const globalEnv = globalThis;
    // @ts-ignore
    globalEnv.initRequire = (root) => {
        var _a, _b, _c, _d, _e;
        const modules = ((_a = globalEnv.contents) === null || _a === void 0 ? void 0 : _a.modules) || {};
        const reactVersion = ((_d = (_c = (_b = globalEnv.contents) === null || _b === void 0 ? void 0 : _b.modules) === null || _c === void 0 ? void 0 : _c.React) === null || _d === void 0 ? void 0 : _d.version) || 17;
        const localRequire = new ServerRequire({
            root,
            modules,
            buildMode: (_e = globalEnv.contents) === null || _e === void 0 ? void 0 : _e.buildMode,
            rootDomain: location.host,
            staticsRoot: globalEnv.wsConfig.resourceRoot,
            metaRoot: globalEnv.wsConfig.metaRoot || globalEnv.metaRoot,
            staticsDomain: getStaticsDomain(),
            sharedDomain: globalEnv.wsConfig.shardDomain,
            cdnRoot: globalEnv.wsConfig.cdnRoot,
            loadingTimeout: 0,
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
    };

})();
