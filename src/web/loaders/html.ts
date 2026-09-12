/**
 * Браузерный загрузчик для xhtml
 * @author Кудрявцев И.С.
 */
import { DEFINE_MODULE } from '../../main/BaseRequire';
import type WebRequire from '../../WebRequire';
import RequireError from '../../main/RequireError';

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
 * Загружает и дефанит модули с именем html!${ModuleName}
 * @param module Модуль
 * @param buildUrl Функция для формирования URL
 * @param crossOrigin Являеться запрос cross origin
 * @param context Require
 */
export default async function (
    defineName: string,
    filePath: string,
    context: WebRequire
): Promise<unknown> {
    const url = context.buildUrl(filePath, 'xhtml');

    try {
        await context.require(['i18n!' + context.getRootDir(filePath)]);

        const html = await context.loader.fetch(url);
        const isCompiledModule = html && html.startsWith('define');

        if (isCompiledModule) {
            eval2(html);

            return DEFINE_MODULE;
        }

        const [doT]: any[] = await context.require(['optional!Core/js-template-doT']);

        const config = doT.getSettings();

        config.strip = false;

        return mkTemplate(doT.template(html, config, undefined, undefined, filePath), filePath);
    } catch (err) {
        throw new RequireError(`Failed to load HTML module "${defineName}" file by url "${url}".`, {
            cause: err as Error,
            type: 'load',
        });
    }
}
