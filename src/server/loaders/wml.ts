/**
 * Серверный загрузчик для wml
 * @author Кудрявцев И.С.
 */
import { DEFINE_MODULE } from '../../main/BaseRequire';
import type ServerRequire from '../../ServerRequire';
import loadString from './loadString';
import jsLoader from './js';
import RequireError from '../../main/RequireError';

// TODO https://rollupjs.org/troubleshooting/#eval2-eval
// eslint-disable-next-line no-eval
const eval2 = eval;

/**
 * Загружает модули с именем wml!${ModuleName}
 * @param module Модуль
 * @param moduleInfo Информация о UI модулей, в котором живём модуль.
 * @param context Require
 * @param ext Расширение файла
 * @param deps Доп зависмости, которые надо загрузить
 */
export default function (
    defineName: string,
    filePath: string,
    context: ServerRequire,
    ext: string = 'wml',
    deps: string[] = []
): unknown {
    if (context.templateExtension === 'js') {
        return jsLoader(defineName, `${filePath}.${ext}`, context);
    }

    const path = context.buildPath(filePath, context.buildMode === 'release' ? `min.${ext}` : ext);

    try {
        const html = loadString(path);
        const isCompiledModule =
            html && (html.startsWith('define') || html.startsWith('(function('));

        if (isCompiledModule) {
            eval2(html);

            return DEFINE_MODULE;
        }

        for (const dep of deps) {
            context.require(dep);
        }

        const CompilerLib: any = context.require('Compiler/Compiler');
        const moduleInfo = context.modules[context.getRootDir(filePath)];

        if (!moduleInfo) {
            throw new Error(`Not exists UIModule for module ${defineName}`);
        }

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
        throw new RequireError(`Failed to load template "${defineName}" file by path "${path}".`, {
            cause: err as Error,
            type: 'load',
        });
    }
}
