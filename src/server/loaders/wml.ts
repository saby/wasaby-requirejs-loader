/**
 * Серверный загрузчик для wml
 * @author Кудрявцев И.С.
 */
import type Module from '../../server/Module';
import type { IRequire } from '../../main/BaseRequire';
import type ModuleInfo from '../../main/ModuleInfo';
import loadString from './loadString';
import jsLoader from './js';

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
    module: Module,
    moduleInfo: ModuleInfo,
    context: IRequire<Module>,
    ext: string = 'wml',
    deps: string[] = []
): void {
    const { buildPath, templateExtension, ESVersion } = moduleInfo;

    if (templateExtension === 'js') {
        module.path = `${module.path}.${ext}`;

        return jsLoader(module, moduleInfo);
    }

    if (context.buildMode === 'release') {
        module.url = buildPath(module.path, `min.${ext}`);
    } else {
        module.url = buildPath(module.path, ext);
    }

    const html = loadString(module.url);
    const isCompiledModule = html && (html.startsWith('define') || html.startsWith('(function('));

    if (isCompiledModule) {
        eval2(html);

        return;
    }

    for (const dep of deps) {
        context.require(dep);
    }

    const CompilerLib: any = context.require('Compiler/Compiler');

    const compiler = new CompilerLib.Compiler();
    const artifact = compiler.compileSync(html, {
        fileName: `${module.path}.${ext}`,
        ESVersion,
    });

    if (!artifact.stable) {
        throw artifact.errors[0];
    }

    eval2(artifact.text);
}
