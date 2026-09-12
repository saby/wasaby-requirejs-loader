/**
 * Тесты разметки клиентских ссылок ($$typeof/$$id/_moduleName) через реальный лоадер.
 *
 * injectModuleName вызывается лоадером при загрузке js-модуля; тест определяет модуль
 * с разными формами экспортов и проверяет, как лоадер разметил экспорт клиентской ссылкой.
 */
import { getInstance } from 'RequireJsLoader/_extras/utils';

declare const module: { require: (id: string) => unknown };

const CLIENT_REF = Symbol.for('react.client.reference');
const FORWARD_REF = Symbol.for('react.forward_ref');
const MEMO = Symbol.for('react.memo');

const env = globalThis as unknown as {
    __SABY_APPLICATION_DIRECTORY__?: string;
    initRequire?: (root: string, resourcesPath: string, cdnPath?: string) => void;
};

const originalEnv = {
    requirejs: (globalThis as unknown as { requirejs?: unknown }).requirejs,
    require: (globalThis as unknown as { require?: unknown }).require,
    define: (globalThis as unknown as { define?: unknown }).define,
    defineFeature: (globalThis as unknown as { defineFeature?: unknown }).defineFeature,
};

let bootstrapApplied = false;

let requirejs!: ReturnType<typeof getInstance>;

/**
 * Экспорт, размеченный лоадером как клиентская ссылка.
 */
interface IMarkedExport {
    $$typeof?: symbol;
    $$id?: string;
    _moduleName?: string;
}

function loadModule<T = unknown>(name: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        requirejs(
            [name],
            (mod: unknown) => resolve(mod as T),
            (err: Error) => reject(err)
        );
    });
}

/**
 * require может отдать либо объект { __esModule, default }, либо сам default-экспорт.
 */
function defaultExport(mod: unknown): unknown {
    const m = mod as { default?: unknown };
    return m?.default ?? m;
}

/**
 * Для function-объявлений лоадер ставит _moduleName на prototype.
 */
function prototypeModuleName(fn: unknown): string | undefined {
    return (fn as { prototype?: { _moduleName?: string } })?.prototype?._moduleName;
}

describe('injectModuleName: разметка клиентских ссылок через лоадер', () => {
    beforeAll(() => {
        if (!env.initRequire && env.__SABY_APPLICATION_DIRECTORY__) {
            module.require(
                `${env.__SABY_APPLICATION_DIRECTORY__}/RequireJsLoader/third-party/ServerRequire.js`
            );
            (
                globalThis as unknown as {
                    initRequire: (root: string, resourcesPath: string, cdnPath?: string) => void;
                }
            ).initRequire(env.__SABY_APPLICATION_DIRECTORY__, '/');
            bootstrapApplied = true;
        }
        requirejs = getInstance();
    });

    afterAll(() => {
        if (bootstrapApplied) {
            // Возвращаем r.js из setupFilesAfterEnv: глобального require не было,
            // а initRequire/defineFeature добавлены загрузкой ServerRequire.js.
            (globalThis as unknown as { requirejs?: unknown }).requirejs = originalEnv.requirejs;
            (globalThis as unknown as { define?: unknown }).define = originalEnv.define;
            (globalThis as unknown as { defineFeature?: unknown }).defineFeature =
                originalEnv.defineFeature;
            delete (globalThis as unknown as { require?: unknown }).require;
            delete (globalThis as unknown as { initRequire?: unknown }).initRequire;
        }
    });

    afterEach(() => {
        requirejs.undef('Test/C1');
        requirejs.undef('Test/C2');
        requirejs.undef('Test/C3');
        requirejs.undef('Test/C4');
        requirejs.undef('Test/C5');
        requirejs.undef('Test/C6');
        requirejs.undef('Test/C7');
        requirejs.undef('Test/C8');
        requirejs.undef('Test/C9');
        requirejs.undef('Test/C12');
        requirejs.undef('Test/C13');
        requirejs.undef('Test/C14');
        requirejs.undef('Test/C15');
        requirejs.undef('Test/C16');
        requirejs.undef('Test/C17');
        requirejs.undef('Test/_C10');
        requirejs.undef('Test/_C11');
    });

    test('default + function: помечается client-ссылкой', async () => {
        function Comp() {}
        define('Test/C1', () => ({ __esModule: true, default: Comp }));

        const mod = await loadModule<{ default: Function }>('Test/C1');
        const CompOut = defaultExport(mod) as IMarkedExport;

        expect(CompOut.$$typeof).toBe(CLIENT_REF);
        expect(CompOut.$$id).toBe('Test/C1');
        expect(prototypeModuleName(CompOut)).toBe('Test/C1');
    });

    test('default + lambda: помечается client-ссылкой', async () => {
        const Comp = () => {};
        define('Test/C2', () => ({ __esModule: true, default: Comp }));

        const mod = await loadModule<{ default: Function }>('Test/C2');
        const CompOut = defaultExport(mod) as IMarkedExport;

        expect(CompOut.$$typeof).toBe(CLIENT_REF);
        expect(CompOut.$$id).toBe('Test/C2');
        expect(CompOut._moduleName).toBe('Test/C2');
    });

    test('default + forwardRef: render помечается client-ссылкой', async () => {
        const render = () => {};
        const fwd = { $$typeof: FORWARD_REF, render };
        define('Test/C3', () => ({ __esModule: true, default: fwd }));

        const mod = await loadModule<{ default: typeof fwd }>('Test/C3');
        const fwdOut = defaultExport(mod) as IMarkedExport & { render: IMarkedExport };

        expect(fwdOut._moduleName).toBe('Test/C3');
        expect(fwdOut.render.$$typeof).toBe(CLIENT_REF);
        expect(fwdOut.render.$$id).toBe('Test/C3');
    });

    test('default + memo: type помечается client-ссылкой', async () => {
        const type = () => {};
        const memo = { $$typeof: MEMO, type };
        define('Test/C4', () => ({ __esModule: true, default: memo }));

        const mod = await loadModule<{ default: typeof memo }>('Test/C4');
        const memoOut = defaultExport(mod) as IMarkedExport & { type: IMarkedExport };

        expect(memoOut._moduleName).toBe('Test/C4');
        expect(memoOut.type.$$typeof).toBe(CLIENT_REF);
        expect(memoOut.type.$$id).toBe('Test/C4');
    });

    test('named + function: помечается client-ссылкой', async () => {
        function Comp() {}
        define('Test/C5', () => ({ __esModule: true, Comp }));

        const mod = await loadModule<{ Comp: IMarkedExport }>('Test/C5');

        expect(mod.Comp.$$typeof).toBe(CLIENT_REF);
        expect(mod.Comp.$$id).toBe('Test/C5:Comp');
        expect(prototypeModuleName(mod.Comp)).toBe('Test/C5:Comp');
    });

    test('named + lambda: помечается client-ссылкой', async () => {
        const Comp = () => {};
        define('Test/C6', () => ({ __esModule: true, Comp }));

        const mod = await loadModule<{ Comp: IMarkedExport }>('Test/C6');

        expect(mod.Comp.$$typeof).toBe(CLIENT_REF);
        expect(mod.Comp.$$id).toBe('Test/C6:Comp');
        expect(mod.Comp._moduleName).toBe('Test/C6:Comp');
    });

    test('named + forwardRef: render помечается client-ссылкой', async () => {
        const render = () => {};
        const fwd = { $$typeof: FORWARD_REF, render };
        define('Test/C7', () => ({ __esModule: true, Comp: fwd }));

        const mod = await loadModule<{ Comp: IMarkedExport & { render: IMarkedExport } }>(
            'Test/C7'
        );

        expect(mod.Comp._moduleName).toBe('Test/C7:Comp');
        expect(mod.Comp.render.$$typeof).toBe(CLIENT_REF);
        expect(mod.Comp.render.$$id).toBe('Test/C7:Comp');
    });

    test('.server default (client=false): НЕ помечается client-ссылкой', async () => {
        const Comp = function () {};
        Comp.client = false;
        define('Test/C8', () => ({ __esModule: true, default: Comp }));

        const mod = await loadModule<{ default: Function }>('Test/C8');
        const CompOut = defaultExport(mod) as IMarkedExport;

        expect(CompOut.$$typeof).toBeUndefined();
        expect(CompOut.$$id).toBeUndefined();
    });

    test('.server named (client=false): НЕ помечается client-ссылкой', async () => {
        const Comp = function () {};
        Comp.client = false;
        define('Test/C9', () => ({ __esModule: true, Comp }));

        const mod = await loadModule<{ Comp: IMarkedExport }>('Test/C9');

        expect(mod.Comp.$$typeof).toBeUndefined();
        expect(mod.Comp.$$id).toBeUndefined();
    });

    test('.server default + forwardRef (client=false): _moduleName есть, render НЕ помечается', async () => {
        const render = () => {};
        const fwd: { $$typeof: symbol; render: () => void; client?: boolean } = {
            $$typeof: FORWARD_REF,
            render,
        };
        fwd.client = false;
        define('Test/C12', () => ({ __esModule: true, default: fwd }));

        const mod = await loadModule<{ default: typeof fwd }>('Test/C12');
        const fwdOut = defaultExport(mod) as IMarkedExport & { render: IMarkedExport };

        expect(fwdOut._moduleName).toBe('Test/C12');
        expect(fwdOut.render.$$typeof).toBeUndefined();
        expect(fwdOut.render.$$id).toBeUndefined();
    });

    test('.server default + memo (client=false): _moduleName есть, type НЕ помечается', async () => {
        const type = () => {};
        const memo: { $$typeof: symbol; type: () => void; client?: boolean } = {
            $$typeof: MEMO,
            type,
        };
        memo.client = false;
        define('Test/C13', () => ({ __esModule: true, default: memo }));

        const mod = await loadModule<{ default: typeof memo }>('Test/C13');
        const memoOut = defaultExport(mod) as IMarkedExport & { type: IMarkedExport };

        expect(memoOut._moduleName).toBe('Test/C13');
        expect(memoOut.type.$$typeof).toBeUndefined();
        expect(memoOut.type.$$id).toBeUndefined();
    });

    test('.server named + forwardRef (client=false): _moduleName есть, render НЕ помечается', async () => {
        const render = () => {};
        const fwd: { $$typeof: symbol; render: () => void; client?: boolean } = {
            $$typeof: FORWARD_REF,
            render,
        };
        fwd.client = false;
        define('Test/C14', () => ({ __esModule: true, Comp: fwd }));

        const mod = await loadModule<{ Comp: IMarkedExport & { render: IMarkedExport } }>(
            'Test/C14'
        );

        expect(mod.Comp._moduleName).toBe('Test/C14:Comp');
        expect(mod.Comp.render.$$typeof).toBeUndefined();
        expect(mod.Comp.render.$$id).toBeUndefined();
    });

    test('старый wasaby-контрол default (prototype.$constructor): НЕ помечается', async () => {
        const Comp = function () {};
        Comp.prototype.$constructor = function () {};
        define('Test/C15', () => ({ __esModule: true, default: Comp }));

        const mod = await loadModule<{ default: Function }>('Test/C15');
        const CompOut = defaultExport(mod) as IMarkedExport;

        expect(CompOut.$$typeof).toBeUndefined();
        expect(CompOut.$$id).toBeUndefined();
        expect(prototypeModuleName(CompOut)).toBe('Test/C15');
    });

    test('старый wasaby-контрол named (prototype.$constructor): НЕ помечается', async () => {
        const Comp = function () {};
        Comp.prototype.$constructor = function () {};
        define('Test/C16', () => ({ __esModule: true, Comp }));

        const mod = await loadModule<{ Comp: IMarkedExport }>('Test/C16');

        expect(mod.Comp.$$typeof).toBeUndefined();
        expect(mod.Comp.$$id).toBeUndefined();
        expect(prototypeModuleName(mod.Comp)).toBe('Test/C16:Comp');
    });

    test('React-базовый wasaby-контрол (UNSAFE_isReact): помечается', async () => {
        const Comp = function () {};
        Comp.prototype.$constructor = function () {};
        Comp.UNSAFE_isReact = true;
        define('Test/C17', () => ({ __esModule: true, default: Comp }));

        const mod = await loadModule<{ default: Function }>('Test/C17');
        const CompOut = defaultExport(mod) as IMarkedExport;

        expect(CompOut.$$typeof).toBe(CLIENT_REF);
        expect(CompOut.$$id).toBe('Test/C17');
        expect(prototypeModuleName(CompOut)).toBe('Test/C17');
    });

    test('private module: named НЕ помечается, default помечается', async () => {
        const NamedComp = function () {};
        define('Test/_C10', () => ({ __esModule: true, NamedComp }));
        const mod = await loadModule<{ NamedComp: IMarkedExport }>('Test/_C10');
        expect(mod.NamedComp.$$typeof).toBeUndefined();

        const DefaultComp = function () {};
        define('Test/_C11', () => ({ __esModule: true, default: DefaultComp }));
        const mod2 = await loadModule<{ default: Function }>('Test/_C11');
        const out = defaultExport(mod2) as IMarkedExport;
        expect(out.$$typeof).toBe(CLIENT_REF);
        expect(out.$$id).toBe('Test/_C11');
    });
});
