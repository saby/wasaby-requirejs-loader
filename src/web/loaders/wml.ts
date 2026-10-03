/**
 * Браузерный загрузчик для wml
 * @author Кудрявцев И.С.
 */
import { DEFINE_MODULE } from '../../main/BaseRequire';
import type WebRequire from '../../WebRequire';
import fetchLoader from './fetch';
import jsLoader from './js';
import RequireError from '../../main/RequireError';

// TODO https://rollupjs.org/troubleshooting/#eval2-eval
// eslint-disable-next-line no-eval
const eval2 = eval;

/**
 * Загружает и дефанит модули с именем wml!${ModuleName}
 * @param fileInfo
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context Require
 * @param ext Расширения шаблона.
 * @param deps Дополнительные зависимости.
 */
export default async function (
    defineName: string,
    filePath: string,
    context: WebRequire,
    ext: string = 'wml',
    deps: string[] = []
): Promise<unknown> {
    if (context.templateExtension === 'js') {
        return jsLoader(defineName, `${filePath}.${ext}`, context);
    }

    const url = context.buildUrl(filePath, ext);

    try {
        const html = await fetchLoader(url);
        const isCompiledModule =
            html && (html.startsWith('define') || html.startsWith('(function('));

        if (isCompiledModule) {
            eval2(html);

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
        const [CompilerLib]: any[] = await context.require(ownDeps);

        const compiler = new CompilerLib.Compiler();
        const artifact = compiler.compileSync(html, {
            fileName: `${filePath}.${ext}`,
            ESVersion: moduleInfo.ESVersion || context.defaultESVersion,
        });

        if (!artifact.stable) {
            throw artifact.errors[0];
        }

        eval2(artifact.text);

        return DEFINE_MODULE;
    } catch (err) {
        throw new RequireError(`Failed to load template "${defineName}" file by url "${url}".`, {
            cause: err as Error,
            type: 'load',
        });
    }
}
