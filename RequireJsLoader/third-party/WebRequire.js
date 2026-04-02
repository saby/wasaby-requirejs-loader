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
                this.message += `\nCaused by: ${cause.message} \nStack: ${cause.stack}`;
            }
            this.type = (options === null || options === void 0 ? void 0 : options.type) || '';
        }
        /**
         * Проверка что это ошибка от Require
         * @param err Проверяемая ошибка
         */
        static isReqiureError(err) {
            // Не убирать явную проверку на true, отвалятся юниты из-за .ccs.json,
            // они там прокси возвращают, который просто имя запращиваемого поля вернёт.
            return (err === null || err === void 0 ? void 0 : err.requireError) === true;
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
    /**
     * Базовый класс require-а
     */
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
            this.debugModules = new Set();
            this.compatibleMode = false;
            this.context = null;
            this.enablePagexPackage = false;
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
        /**
         * Возвращает модуль из хранилища, если его ещё нет, создаёт.
         * @param name Имя модуля
         * @param context Require в контексте которого получаем модуль.
         */
        getModule(name, context) {
            const module = this.modules.get(name);
            if (module) {
                return module;
            }
            const newModule = context.createModule(name);
            this.modules.set(name, newModule);
            return newModule;
        }
        defined(name) {
            if (name && typeof name === 'string') {
                const fileInfo = this.parseName(name);
                const [type] = this.extractCache(name, fileInfo);
                return type === 'hit';
            }
            return false;
        }
        loaded(name) {
            if (name && typeof name === 'string') {
                const fileInfo = this.parseName(name);
                const module = this.modules.get(fileInfo.defineName);
                if (module) {
                    return module.defined;
                }
            }
            return false;
        }
        /**
         * Приводит имя к нормальному виду.
         * @param name Имя модуля
         */
        normalizeName(name) {
            if (name[0] === '.' && this.context) {
                return this.context.getRelName(name);
            }
            return name;
        }
        /**
         * Функция парсит имя модуля, преобразуя его в обект с информацией о модуле.
         * @param moduleName Имя модуля
         */
        parseName(moduleName) {
            const normalizeName = this.normalizeName(moduleName);
            const cache = this.parseNameCache.get(normalizeName);
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
            let isRootDir = true;
            let isChain = false;
            let hasOptional = false;
            let hasIs = false;
            let part = '';
            for (const symbol of normalizeName) {
                if (symbol === '/' && isRootDir) {
                    // Откидываем лидирующий слеш для пути, но нужно оставить для имени define-а.
                    if (part === '') {
                        result.defineName = `${result.defineName}${symbol}`;
                        continue;
                    }
                    const normalizeRoot = ALIAS_MAP.get(part);
                    result.defineName = `${result.defineName}${part}`;
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
                        part = `${part}${symbol}`;
                        result.defineName = `${result.defineName}${part}`;
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
                    result.filePath = `${result.filePath}${part}`;
                    result.defineName = `${result.defineName}${part}`;
                    part = '';
                    isChain = true;
                    continue;
                }
                if (symbol === '.' && isChain) {
                    result.chain.push(part);
                    part = '';
                    continue;
                }
                part = `${part}${symbol}`;
            }
            if (isChain) {
                result.chain.push(part);
            }
            else {
                result.filePath = `${result.filePath}${part}`;
                result.defineName = `${result.defineName}${part}`;
            }
            if (isRootDir) {
                result.rootDir = result.filePath;
            }
            const resolvedName = this.modulesResolution.get(result.defineName);
            if (resolvedName) {
                result.rootDir = resolvedName[0];
                result.filePath = resolvedName[1];
            }
            this.parseNameCache.set(normalizeName, result);
            return result;
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
                return ['hit', null];
            }
            // Проверяем нет ли в кеши модуля по имене, которое указано у него в define.
            if (this.cache.has(defineName)) {
                return this.extractResult(this.cache.get(defineName), ignoreError, chain);
            }
            return ['miss', undefined];
        }
        /**
         * Извлекает нужные данные.
         * @param module Имя модуля
         * @param ignoreError Необходимо ли грузить модуль, если его нет.
         * @param chain Цепочка для получения результата.
         */
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
    /**
     * Базовый класс модуля
     */
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
        /**
         * Извлекает экспортируюмую сущность из модуля.
         * @param depsValue Экспорты зависимостей
         */
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
        /**
         * Резолвит относительную зависимость до полноценного имени модуля.
         * @param relName
         */
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
        /**
         * Проверяет, что экспортируюмая сущность это объект.
         * @param exports
         */
        isObject(exports) {
            return Object.getPrototypeOf(exports) === Object.prototype;
        }
        /**
         * Внедряет имя модуля в поле _moduleName в экспортируюмую сущность.
         * @param obj Экспортируемая сущность
         * @param moduleName Имя модуля.
         */
        injectModuleName(obj, moduleName) {
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
                this.isObject(exports) &&
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

    /**
     * Fetch загрузчик
     * @author Кудрявцев И.С.
     */
    const NOT_FOUND_CODE = 404;
    /**
     * Получить объекет Response от fetch
     * @param url URL адресс файла
     * @param crossOrigin У запроса домен отличается от корневого
     */
    function getResponse(url, crossOrigin) {
        try {
            return fetch(url, {
                mode: crossOrigin ? 'cors' : 'no-cors',
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
     * @param crossOrigin У запроса домен отличается от корневого
     */
    async function fetchLoader (url, crossOrigin) {
        const response = await getResponse(url, crossOrigin);
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
    const loading$1 = new Map();
    /**
     * Загрузка файла через тег script
     * @param url URL адресс файла
     * @param name Имя модуля
     * @param crossOrigin У запроса домен отличается от корневого
     */
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

    const filesOfWithoutDefine = [
        '/cdn/Punycode/1.0.0/punycode.js',
        '/cdn/JQuery/jquery-cookie/04-04-2014/jquery-cookie-min.js',
        '/cdn/JQuery/jquery-ui/1.12.1.3/jquery-ui-position-min.js',
        '/cdn/JQuery/jquery-jcrop/1.0.0/jquery-Jcrop.js',
        'Controls-Calculator/_view/third-party/big',
        '/cdn/AceEditor/1.2.3/src-min/ace.js',
        '/cdn/StaffCDN/PixiSpine/v1/spine-pixi-v8.min.js',
        '/cdn/AudioPlayerCDN/libs/id3-reader/v1.0.0-patched/id3-minimized.js',
        '/cdn/Codemirror/5.58.1.15/diff-min.js',
        '/cdn/Codemirror/5.58.1.14/linters-min.js',
        'SBIS3.CONTROLS/ColorPicker/resources/colpick',
        '/cdn/BankCDN/qr-code-styling/1.5.0/source.min.js',
        '/cdn/BankCDN/21.01.21/qrcode.js',
        'SbisUI/polyfill/polyfill-ioBundle',
    ];
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
     * @param module Модуль
     * @param moduleInfo Информация о UI модулей, в котором живём модуль.
     */
    async function js (module, moduleInfo) {
        const { buildUrl, crossOrigin } = moduleInfo;
        module.url = buildUrl(module.path, 'js');
        try {
            await tagScript(module.url, module.name, crossOrigin);
        }
        catch (err) {
            eval2$2(await fetchLoader(module.url, crossOrigin));
        }
        if (module.defined) {
            return;
        }
        const error = errors.get(module.url);
        if (error) {
            errors.delete(module.url);
            throw error;
        }
        if (filesOfWithoutDefine.includes(module.name)) {
            module.define([], () => null);
            return;
        }
    }

    // TODO https://rollupjs.org/troubleshooting/#eval2-eval
    // eslint-disable-next-line no-eval
    const eval2$1 = eval;
    /**
     * Загружает и дефанит модули с именем wml!${ModuleName}
     * @param module Модуль
     * @param moduleInfo Информация о UI модулей, в котором живём модуль.
     * @param context Require
     * @param ext Расширения шаблона.
     * @param deps Дополнительные зависимости.
     */
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

    /**
     * Загружает и дефанит модули с именем tmpl!${ModuleName}
     * @param module Модуль
     * @param moduleInfo Информация о UI модулей, в котором живём модуль.
     * @param context Require
     */
    function tmpl (module, moduleInfo, context) {
        return wml(module, moduleInfo, context, 'tmpl', [
            'is!compatibleLayer?Lib/Control/Control.compatible',
            'is!compatibleLayer?Lib/Control/AreaAbstract/AreaAbstract.compatible',
        ]);
    }

    /**
     * Загрузчик через тег link
     * @author Кудрявцев И.С.
     */
    const loading = new Map();
    let notInit = true;
    const loadedLink = new Set();
    /**
     * Загрузка файла через тег link
     * @param url  URL адресс файла
     * @param crossOrigin У запроса домен отличается от корневого
     */
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
    const globalEnv$1 = globalThis;
    const disableLoadCss = !(((_a = globalEnv$1.wsConfig) === null || _a === void 0 ? void 0 : _a.loadCss) === undefined
        ? true
        : globalEnv$1.wsConfig.loadCss);
    const IGNORE_MODULE = 'SBIS3.CONTROLS';
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
    async function css (module, { buildUrl, crossOrigin }) {
        if (disableLoadCss || resolveSuffix(module.rootDir)) {
            module.define([], () => null);
            return;
        }
        module.url = buildUrl(module.path, 'css');
        await tagLink(module.url, crossOrigin);
        module.define([], () => null);
    }

    /**
     * Загружает и дефанит модули с именем i18n!${ModuleName}
     * @param module Модуль
     * @param _moduleInfo
     * @param context Require
     */
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

    /**
     * Загружает и дефанит модули с именем json!${ModuleName}
     * @param module Модуль
     * @param buildUrl Функция для формирования URL
     * @param crossOrigin Являеться запрос cross origin
     */
    async function json (module, { buildUrl, crossOrigin }) {
        module.url = buildUrl(module.path, 'json');
        const result = JSON.parse(await fetchLoader(module.url, crossOrigin));
        module.define([], () => result);
    }

    /**
     * Загружает и дефанит модули с именем text!${ModuleName}
     * @param module Модуль
     * @param buildUrl Функция для формирования URL
     * @param crossOrigin Являеться запрос cross origin
     */
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
    const PERCENTAGE_BASE = 100;
    // Задаем сколько процентов модулей из пакета должны быть загружены, чтобы мы его не грузили.
    const PERCENTAGE_OF_LOADED_MODULES_TO_DISABLE = 50;
    const loadingMap = new Map();
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
     * Проверяет что инормация о пакетах полная
     * @param packagesInfo
     */
    function isFullPackagesMap(packagesInfo) {
        return packagesInfo.hasOwnProperty('map');
    }
    /**
     * Получить полную информацию по пакетам.
     * @param packagesInfo Информация о пакетах.
     * @param context Require
     */
    async function getFullPackagesInfo(packagesInfo, context) {
        let promise = loadingMap.get(packagesInfo.mapPath);
        if (!promise) {
            promise = loadFullPackageInfo(packagesInfo, context);
            loadingMap.set(packagesInfo.mapPath, promise);
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
    async function loadFullPackageInfo(packagesInfo, context) {
        const packagesLoadedStatus = {};
        const disabledPackages = new Set();
        const normalizeMap = {};
        const map = (await context.require([packagesInfo.mapPath]))[0];
        for (const [moduleName, packagePath] of Object.entries(map)) {
            const packageName = packagePath.split('.min.')[0];
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
            const percentageLoaded = Math.floor((loaded / all) * PERCENTAGE_BASE);
            if (percentageLoaded > PERCENTAGE_OF_LOADED_MODULES_TO_DISABLE) {
                disabledPackages.add(packageName);
            }
        }
        packagesInfo.map = normalizeMap;
        packagesInfo.disabledPackages = disabledPackages;
        packagesInfo.disabledMap = Object.keys(packagesInfo).length === disabledPackages.size;
        return packagesInfo;
    }
    /**
     * Определяет и вызывает загрузчик, для пакета или для файла.
     * @param packagesInfo Информация о пакетах UI модуля
     * @param module Запрашиваемый модуль
     * @param moduleInfo Информация о UI модулей, в котором живём модуль.
     * @param context Require
     * @param defaultLoader Дефолтный загрузчик, применяется, если модуль не в пакете.
     */
    function callLoader(packagesInfo, module, moduleInfo, context, defaultLoader) {
        if (packagesInfo.map.hasOwnProperty(module.name)) {
            const packagePath = packagesInfo.map[module.name];
            if (packagesInfo.disabledPackages.has(packagePath)) {
                return defaultLoader(module, moduleInfo, context);
            }
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
    /**
     * Проверяет что у модуля есть пакеты.
     * @param moduleInfo Информация о UI модулей, в котором живём модуль.
     */
    function hasPackages(moduleInfo) {
        return moduleInfo.hasOwnProperty('packagesInfo');
    }
    /**
     * Загружает и дефанит модули из пакетов
     * @param module Модуль
     * @param moduleInfo Информация о UI модулей, в котором живём модуль.
     * @param context Require
     * @param defaultLoader Дефолтный загрузчик, применяется, если модуль не в пакете.
     */
    async function bundleLoader (module, moduleInfo, context, defaultLoader) {
        if (isBundle(module.path) ||
            !isPackableExtension(module.extension) ||
            isBundlesMap(module.path) ||
            moduleInfo.packagesInfo.disabledMap) {
            return defaultLoader(module, moduleInfo, context);
        }
        if (isFullPackagesMap(moduleInfo.packagesInfo)) {
            return callLoader(moduleInfo.packagesInfo, module, moduleInfo, context, defaultLoader);
        }
        const packagesInfo = await getFullPackagesInfo(moduleInfo.packagesInfo, context);
        return callLoader(packagesInfo, module, moduleInfo, context, defaultLoader);
    }

    /**
     * Браузерный функционал для работы с модулем.
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
    /**
     * Браузерный класс модуля
     */
    class Module extends Module$1 {
        constructor(name, loader) {
            super(name);
            this.loader = loader;
        }
        /**
         * Создаёт промисс с таймаутом на исполление
         * @param timeout На сколько таймаут
         */
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
        /**
         * Создаёт промис на загрузку
         * @param timeout Таймаут на загрузку
         */
        async _createDownLoadPromise(timeout) {
            const { promise, clear } = this._createDefinitionPromise(timeout);
            try {
                const moduleInfo = this.loader.modulesInfo.get(this.rootDir) ||
                    this.loader.modulesInfo.get('$default$');
                if (hasPackages(moduleInfo)) {
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
        /**
         * Загрузка модуля
         * @param timeout Таймаут на загрузку
         */
        load(timeout) {
            if (!this.loading) {
                this.loading = this._createDownLoadPromise(timeout);
            }
            return this.loading;
        }
        /**
         * Получения экпорта модуля
         */
        async getExports() {
            if (this.exports !== NO_EXPORTS) {
                return this.exports;
            }
            try {
                if (this.deps.length === 0) {
                    this.exports = this.executeCallback();
                }
                else {
                    // Необходма для того чтобы require смог разрещить относительные пути.
                    this.loader.context = this;
                    const depExports = await this.loader.require(this.deps);
                    // В этой точке конетекст может быть перебить зависимостями, поэтому выставялем его снова.
                    // Внутри колбека могут вызывать синхроный require с относительным именем.
                    this.loader.context = this;
                    this.exports = this.executeCallback(depExports);
                    this.loader.context = null;
                    if (!this.exports) {
                        this.exports = this.extractExports(depExports);
                    }
                }
                if (this.extension === 'js' && this.exports) {
                    this.injectModuleName(this.exports, this.name);
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
        /**
         * Исполняет калбел из define-а
         * @param depsExports Экспорты зависимостей
         */
        executeCallback(depsExports = []) {
            // В этой точке конетекст может быть перебить зависимостями, поэтому выставялем его снова.
            // Внутри колбека могут вызывать синхроный require с относительным именем.
            this.loader.context = this;
            const result = this.callback(...depsExports);
            this.loader.context = null;
            return result;
        }
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
            'pixi-react8': `${cdnName}PixiReact/8.0.3/pixi-react.min.js`,
            // jQuery must die
            jquery: `${cdnName}JQuery/jquery/3.3.1/jquery-min.js`,
        };
        const result = new Map();
        for (const [defineName, path] of Object.entries(map)) {
            result.set(defineName, [path.split('/')[0], path]);
        }
        return result;
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
     * Возвращает шардированый домен, если он есть
     */
    function getShardDomain() {
        // @ts-ignore
        const globalEnv = globalThis;
        return globalEnv.wsConfig.shardDomain || '';
    }

    /**
     * Веб версия require.js
     * @author Кудрявцев И.С.
     */
    // @ts-ignore
    const globalEnv = globalThis;
    const DEFAULT_TIMEOUT = 30000;
    //TODO надо это вывернут ьв обратну сторону, списко тог очто надо минифицировать куда меньше,
    // плюс убрать в констаны, чтобын не дублировать между web и server
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
    function getDebugModules(modules, buildMode, isDebugReact) {
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
        if (isDebugReact) {
            return new Set([]);
        }
        return new Set();
    }
    class WebRequire extends BaseRequire {
        constructor(config) {
            super(config);
            this.enablePagexPackage = !!config.pagexPackages;
            this.debugModules = getDebugModules(config.modules, this.buildMode, config.isDebugReact);
            this.fixLoadingTimeoutForDebug(Object.keys(config.modules).length);
            this.buildConfig(config);
            this.cache.set('require', this.require.bind(this));
            this.compatibleMode =
                window.location.href.indexOf('withoutLayout') === -1 &&
                    globalEnv.wsConfig.compatible !== false;
        }
        /**
         * Увеличивает базовый таймаует по количеству дебажных модулей.
         * @param modules Список всех модулей
         */
        fixLoadingTimeoutForDebug(modules) {
            const half = Math.floor(modules / 2);
            if (this.debugModules.size < half) {
                return this.loadingTimeout;
            }
            const oneModuleTime = this.loadingTimeout / half;
            const debugModules = this.debugModules.size - half;
            return Math.floor(this.loadingTimeout + oneModuleTime * debugModules);
        }
        /**
         * Собирает кофиги для UI-модулей, заранее вычисляя всё, что статично.
         * @param modules Список UI модулей
         * @param pagexPackages Включена ли паковка по pagex на странице.
         * @param rootDomain Корневой домейн
         * @param staticsRoot URL путь до UI модулей
         * @param metaRoot URL путь до метафайлов(Сервис представления)
         * @param cdnRoot URL путь до CDN модулей
         * @param contents Оглавление, которое доставляеться через contents.js
         */
        // 1) мы не можем использовать cdn-домены для svg. Svg <use> элементы имеют ограничения на кросс-доменные
        // запросы, допускается только same-origin
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/use#usage_notes
        // есть решение данной проблемы через тег <feImage>
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/use#usage_notes
        // но внедрить его пока не можем из-за того, что данная технология работает только начиная с
        // Chrome 118, Safari 17.2 и тд, данный костыль и переход сможем сделать после поднятия в Тензоре
        // минимально поддерживаемых версий браузеров
        // 2) we can't use domains for contents/router meta requests, cdn domain may contain contents/router
        // meta from another application.
        // 3) we can't use domains for manifest.json requests because manifest uses relative urls
        // and with cdn-domain there will be cross domain request for this manifest, but cross domain
        buildConfig({ modules, rootDomain, staticsRoot = '/resources/', metaRoot = '', cdnRoot = '/cdn/', contents, }) {
            const shardDomain = getShardDomain();
            const domainForStatics = getStaticsDomain();
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
                        var _a;
                        if (extension === 'svg') {
                            return `${root}${filePath}.${extension}${queryParams}`;
                        }
                        if (EXTENSION_WITHOUT_MIN.has(extension)) {
                            return `${domain}${root}${filePath}.${extension}${queryParams}`;
                        }
                        if (extension === 'css' &&
                            ((_a = document.body) === null || _a === void 0 ? void 0 : _a.dir) === 'rtl' &&
                            !filePath.endsWith('.rtl')) {
                            return `${domain}${root}${filePath}.rtl${postfixForMinVersion}.${extension}${queryParams}`;
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
                if (hasBundles && !enableDebug) {
                    info.packagesInfo = {
                        mapPath: `${name}/packageMap.json`,
                    };
                }
                this.modulesInfo.set(name, info);
            }
            this.modulesInfo.set('cdn', {
                buildUrl: (moduleName, extension) => {
                    const cdnFilePath = moduleName.replace('cdn/', '');
                    let staticDomain = domainForStatics;
                    if (extension === 'svg' || moduleName.endsWith('manifest.json')) {
                        staticDomain = '';
                    }
                    if (cdnFilePath.endsWith(extension)) {
                        return `${staticDomain}${cdnRoot}${cdnFilePath}`;
                    }
                    return `${staticDomain}${cdnRoot}${cdnFilePath}.${extension}`;
                },
                buildPath(moduleName, extension) {
                    return this.buildUrl(moduleName, extension);
                },
                ESVersion: defaultESVersions,
                crossOrigin,
            });
            const postfixForMinVersion = this.debugModules.size === 0 ? '.min' : '';
            const crossOriginMeta = !!(shardDomain && shardDomain !== rootDomain);
            this.modulesInfo.set('$default$', {
                buildUrl(filePath, extension) {
                    return `${shardDomain}${metaRoot}${filePath}${postfixForMinVersion}.${extension}?x_module=${defaultVersion}`;
                },
                buildPath(filePath, extension) {
                    return this.buildUrl(filePath, extension);
                },
                crossOrigin: crossOriginMeta,
            });
        }
        /**
         * Создаёт веб модуль
         * @param name имя модуля
         */
        createModule(name) {
            return new Module(name, this);
        }
        /**
         * Загрузить модули по имени дефайна
         * @param fileInfo Информация о модуле.
         */
        async loadModuleByDefineName(fileInfo) {
            const { defineName, ignoreError, filePath, rootDir, extension } = fileInfo;
            const module = this.getModule(defineName, this);
            module.path = filePath;
            module.rootDir = rootDir;
            module.extension = extension;
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
                return exports;
            }
            catch (err) {
                this.cache.set(defineName, err);
                throw err;
            }
            finally {
                this.loadableModules.delete(defineName);
            }
        }
        /**
         * Обработать запрашиваемый модуль
         * @param fullName Полное имя запрашиваемого модуля
         * @param fileInfo Информация о модуле
         */
        async processModule(fullName, fileInfo) {
            const { defineName, chain } = fileInfo;
            let getExports = this.loadableModules.get(defineName);
            if (!getExports) {
                getExports = this.loadModuleByDefineName(fileInfo);
                this.loadableModules.set(defineName, getExports);
            }
            try {
                const exports = await getExports;
                const [typeCache, value] = this.extractResult(exports, false, chain);
                if (typeCache === 'hit') {
                    return value;
                }
                else {
                    throw value;
                }
            }
            catch (err) {
                throw err;
            }
            finally {
                this.loadableModules.delete(fullName);
            }
        }
        loadModule(fullName, fileInfo) {
            let promise = this.loadableModules.get(fullName);
            if (promise) {
                return promise;
            }
            promise =
                fullName === fileInfo.defineName
                    ? this.loadModuleByDefineName(fileInfo)
                    : this.processModule(fullName, fileInfo);
            this.loadableModules.set(fullName, promise);
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
                    promises.push(this.loadModule(moduleName, info));
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
            //@ts-ignore
            module.define(dependencies, callbackFn);
        }
    }
    /**
     * Глоабльаня функция для иницилизации веб require в глобальном окружение.
     */
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
            cdnRoot: globalEnv.wsConfig.cdnRoot,
            loadingTimeout: globalEnv.wsConfig.moduleLoadingTimeout || DEFAULT_TIMEOUT,
            pagexPackages: globalEnv.wsConfig.pagexPackages,
            contents: globalEnv.contents,
            modulesResolution: getModuleResolution(reactVersion),
            isDebugReact: globalEnv.wsConfig.isDebugReact,
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
        globalEnv.requirejs.undef = (name) => {
            const { defineName } = localRequire.parseName(name);
            const module = localRequire.modules.get(defineName);
            if (!module) {
                return;
            }
            const scripts = Array.from(document.getElementsByTagName('script'));
            for (const script of scripts) {
                const url = script.getAttribute('src') || script.getAttribute('href');
                if (script.name === module.name || url === module.url) {
                    script.remove();
                }
            }
            localRequire.modules.delete(defineName);
            localRequire.cache.delete(defineName);
        };
        // TODO совместимость со старым require. Удалить когда переедм везде на новый.
        globalEnv.requirejs.toUrl = (name) => {
            const splitName = name.split('.');
            const ext = splitName.pop();
            const path = splitName.join('.');
            const moduleName = path.split('/')[0];
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
