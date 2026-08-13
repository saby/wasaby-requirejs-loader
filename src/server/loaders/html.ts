/**
 * Серверный загрузчик для xhtml
 * @author Кудрявцев И.С.
 */
import { DEFINE_MODULE } from '../../main/BaseRequire';
import type ServerRequire from '../../ServerRequire';
import loadString from './loadString';
import RequireError from '../../main/RequireError';

// TODO https://rollupjs.org/troubleshooting/#eval2-eval
// eslint-disable-next-line no-eval
const eval2 = eval;

/**
 * Компилирует шаблон
 * @param f
 * @param name
 */
function mkTemplate(f: any, name: string): Function {
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
 * @param defineName
 * @param filePath
 * @param buildPath Функция для формирования пути до файла
 * @param context Require
 */
export default function (defineName: string, filePath: string, context: ServerRequire): unknown {
    const path = context.buildPath(
        filePath,
        context.buildMode === 'release' ? 'min.xhtml' : 'xhtml'
    );

    try {
        context.require('i18n!' + context.getRootDir(filePath));

        const html = loadString(path);

        const isCompiledModule = html && html.startsWith('define');

        if (isCompiledModule) {
            eval2(html);

            return DEFINE_MODULE;
        }

        const doT: any = context.require('optional!Core/js-template-doT');

        const config = doT.getSettings();

        config.strip = false;

        return mkTemplate(doT.template(html, config, undefined, undefined, filePath), filePath);
    } catch (err) {
        throw new RequireError(
            `Failed to load HTML template "${defineName}" file by path "${path}".`,
            {
                cause: err as Error,
                type: 'load',
            }
        );
    }
}
