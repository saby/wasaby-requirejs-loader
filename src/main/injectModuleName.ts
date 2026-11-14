/**
 * Внедряет имя модуля в поле _moduleName в экспортируюмую сущность.
 * @author Кудрявцев И.С.
 */
import { ITensorFunction } from 'RequireJsLoader/requireTypes';

type isObjectChecker = (exports: object) => boolean;

const TYPEOF_MODULE = Symbol.for('react.client.reference');
const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
const REACT_MEMO_TYPE = Symbol.for('react.memo');

function isForwardRefOrMemo(value: any): boolean {
    return (
        value !== null &&
        typeof value === 'object' &&
        (value.$$typeof === REACT_FORWARD_REF_TYPE || value.$$typeof === REACT_MEMO_TYPE)
    );
}

/**
 * Навешивает клиентскую ссылку ($$typeof/$$id) на функцию с учётом основных проверок:
 *  - разметка только на сервере (markClientReferences) — в браузере лишние поля ломают обход;
 *  - не размечаем .server-модули (builder ставит exports.<name>.client = false);
 *  - не размечаем старые wasaby-контролы (isWasabyControl): платформа по hasOwnProperty('$$typeof')
 *    считает их React-контролами (NeedToBeCompatible), и их построение ломается.
 * @param component Функция-компонент.
 * @param fullId $$id (модуль:экспорт).
 * @param markClientReferences Размечать клиентские ссылки (ServerRequire) или нет (WebRequire).
 */
function markClientComponent(component: any, fullId: string, markClientReferences: boolean): void {
    if (!markClientReferences) {
        return;
    }
    if (component.client === false) {
        return;
    }
    if (
        typeof component === 'function' &&
        !!component.prototype &&
        !component.UNSAFE_isReact &&
        (!!component.superclass || // класс созданный с Core/core-extend
            typeof component.prototype.$constructor === 'function')
    ) {
        return;
    }
    component.$$typeof = TYPEOF_MODULE;
    component.$$id = fullId;
}

/**
 * Раскрывает React-обёртки forwardRef/memo (render/type) и помечает клиентский компонент внутри.
 * Объект размечать нельзя — его $$typeof читает react-dom/server.
 * @param component Функция, forwardRef или memo.
 * @param fullId $$id (модуль:экспорт).
 * @param markClientReferences Размечать клиентские ссылки (ServerRequire) или нет (WebRequire).
 */
function markClientInWrapper(component: any, fullId: string, markClientReferences: boolean): void {
    if (!markClientReferences) {
        return;
    }
    // Флаг .server (client === false) лежит на самой обёртке (forwardRef/memo), а не на render/type.
    if (component.client === false) {
        return;
    }

    let target = component;
    let depth = 0;

    while (target && typeof target === 'object' && depth < 4) {
        if (target.$$typeof === REACT_FORWARD_REF_TYPE) {
            target = target.render;
            depth++;
            continue;
        }
        if (target.$$typeof === REACT_MEMO_TYPE) {
            target = target.type;
            depth++;
            continue;
        }
        break;
    }
    if (typeof target === 'function') {
        markClientComponent(target, fullId, markClientReferences);
    }
}

/**
 * Внедряет имя модуля в поле _moduleName в экспортируюмую сущность.
 * @param obj Экспортируемая сущность
 * @param moduleName Имя модуля.
 * @param isObject
 * @param markClientReferences Размечать экспорты как клиентские ссылки ($$typeof/$$id).
 *        Включается только на сервере (ServerRequire): в браузере (WebRequire) разметка
 *        добавляет лишние поля в экспорты и ломает обход полей модуля.
 */
export default function injectModuleName(
    obj: any,
    moduleName: string,
    isObject: isObjectChecker,
    markClientReferences: boolean = false
): void {
    const exports = obj.__esModule && obj.default ? (obj.default as Record<string, unknown>) : obj;

    if (typeof exports === 'function') {
        // Give _moduleName to each class and BTW mark private classes
        const proto = (exports as ITensorFunction).prototype;
        const isPrivateModule = moduleName.indexOf('/_') !== -1;

        if (proto) {
            if (!proto.hasOwnProperty('_moduleName')) {
                proto._moduleName = moduleName;
                proto._isPrivateModule = isPrivateModule || undefined;
            }

            // arrow function has no prototype
        } else {
            if (!(exports as ITensorFunction).hasOwnProperty('_moduleName')) {
                (exports as ITensorFunction)._moduleName = moduleName;
                (exports as ITensorFunction)._isPrivateModule = isPrivateModule || undefined;
            }
        }

        // Клиентский компонент (default-функция) — размечаем как client-ссылку:
        // RSC-сериализатор смотрит $$typeof (react.client.reference) + $$id.
        markClientComponent(exports, moduleName, markClientReferences);
    } else if (isForwardRefOrMemo(exports)) {
        // default-экспорт — forwardRef/memo: _moduleName ставим всегда (независимо от .client,
        // как в rc-26.5000), а client-разметку ($$typeof/$$id) — только на сервере
        // и только для не-".server"-модулей.
        if (!(exports as any).hasOwnProperty('_moduleName')) {
            (exports as any)._moduleName = moduleName;
        }
        markClientInWrapper(exports, moduleName, markClientReferences);
    } else if (
        // Give _moduleName to each private or unnamed class in public library
        typeof exports === 'object' &&
        isObject(exports) &&
        moduleName.indexOf('/_') === -1
    ) {
        Object.keys(exports).forEach((name) => {
            const module = (exports as Record<string, unknown>)[name];
            const fullName = moduleName + ':' + name;
            // Модуль, у которого основной экспорт — forwardRef/memo (default), размечаем его render/type.
            if (isForwardRefOrMemo(module)) {
                // forwardRef/memo: _moduleName ставим всегда (независимо от .client,
                // как в rc-26.5000), а client-разметку ($$typeof/$$id) — только на сервере
                // и только для не-".server"-модулей.
                if (!(module as any).hasOwnProperty('_moduleName')) {
                    (module as any)._moduleName = fullName;
                }
                markClientInWrapper(module, fullName, markClientReferences);
                return;
            }
            // Обычные функции — только из публичных модулей. Приватные реализации
            // (resolver-компоненты плеера и т.п.) должны исполняться на сервере.
            if (typeof module === 'function') {
                const proto = module.prototype;

                if (proto) {
                    if (proto._isPrivateModule || !proto.hasOwnProperty('_moduleName')) {
                        proto._moduleName = fullName;
                    }

                    // Named function-компонент (не из .server-модуля) — размечаем как client-ссылку.
                    // .server-модули builder помечает exports.<name>.client = false.
                    markClientComponent(module, fullName, markClientReferences);

                    // arrow function has no prototype
                } else {
                    if (
                        (module as ITensorFunction)._isPrivateModule ||
                        !module.hasOwnProperty('_moduleName')
                    ) {
                        (module as ITensorFunction)._moduleName = fullName;
                        markClientComponent(module, fullName, markClientReferences);
                    }
                }
            }
        });
    }
}
