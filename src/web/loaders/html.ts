import type Module from '../../web/Module';
import type { IModuleInfo, IRequire } from '../../main/BaseRequire';
import fetchLoader from './fetch';

// TODO https://rollupjs.org/troubleshooting/#eval2-eval
// eslint-disable-next-line no-eval
const eval2 = eval;

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

export default async function (
    module: Module,
    { buildUrl, crossOrigin }: IModuleInfo,
    context: IRequire<Module>
): Promise<void> {
    module.url = buildUrl(module.path, 'xhtml');

    await context.require(['i18n!' + module.url.split('/')[0]]);

    const html = await fetchLoader(module.url, crossOrigin);

    const isCompiledModule = html && html.startsWith('define');

    if (isCompiledModule) {
        eval2(html);

        return;
    }

    const [doT]: any[] = await context.require(['optional!Core/js-template-doT']);

    const config = doT.getSettings();

    config.strip = false;

    const result = mkTemplate(
        doT.template(html, config, undefined, undefined, module.path),
        module.path
    );

    module.define([], () => result);
}
