import type Module from '../../web/Module';
import type { IModuleInfo, IRequire } from '../../main/BaseRequire';
import fetchLoader from './fetch';
import jsLoader from './js';

// TODO https://rollupjs.org/troubleshooting/#eval2-eval
// eslint-disable-next-line no-eval
const eval2 = eval;

export default async function (
    module: Module,
    moduleInfo: IModuleInfo,
    context: IRequire<Module>,
    ext: string = 'wml',
    deps: string[] = []
): Promise<void> {
    const { buildUrl, crossOrigin, hasTailwind, templateExtension, ESVersion } = moduleInfo;

    if (templateExtension === 'js') {
        module.path = `${module.path}.${ext}`;

        return jsLoader(module, moduleInfo);
    }

    module.url = buildUrl(module.path, ext);

    const html = await fetchLoader(module.url, crossOrigin);
    const isCompiledModule = html && (html.startsWith('define') || html.startsWith('(function('));

    if (isCompiledModule) {
        eval2(html);

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
    const [CompilerLib]: any[] = await context.require(ownDeps);

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
