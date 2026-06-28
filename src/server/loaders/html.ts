/**
 * Серверный загрузчик для xhtml
 * @author Кудрявцев И.С.
 */
import type Module from '../../server/Module';
import type { IRequire } from '../../main/BaseRequire';
import type ModuleInfo from '../../main/ModuleInfo';
import loadString from './loadString';

// TODO https://rollupjs.org/troubleshooting/#eval2-eval
// eslint-disable-next-line no-eval
const eval2 = eval;

/**
 * Компилирует шаблон
 * @param f
 * @param name
 */
function mkTemplate(f: any, name: string) {
    const fname = name.replace(/[^a-z0-9]/gi, '_');

    // Создается именованая функция с понятным названием чтобы из стэка можно было понять битый шаблон
    // eslint-disable-next-line no-new-func
    const factory = new Function(
        'f',
        'return function ' + fname + '(){ return f.apply(this, arguments); }'
    );

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
 * @param buildPath Функция для формирования пути до файла
 * @param context Require
 */
export default function (
    module: Module,
    { buildPath }: ModuleInfo,
    context: IRequire<Module>
): void {
    if (context.buildMode === 'release') {
        module.url = buildPath(module.path, 'min.xhtml');
    } else {
        module.url = buildPath(module.path, 'xhtml');
    }

    context.require('i18n!' + module.path.split('/')[0]);

    const html = loadString(module.url);

    const isCompiledModule = html && html.startsWith('define');

    if (isCompiledModule) {
        eval2(html);

        return;
    }

    const doT: any = context.require('optional!Core/js-template-doT');

    const config = doT.getSettings();

    config.strip = false;

    const result = mkTemplate(
        doT.template(html, config, undefined, undefined, module.path),
        module.path
    );

    module.define([], () => result);
}
