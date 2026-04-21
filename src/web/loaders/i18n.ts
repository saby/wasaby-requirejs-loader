/**
 * Браузерный загрузчик для локализации
 * @author Кудрявцев И.С.
 */
import type Module from '../../web/Module';
import type { IModuleInfo, IRequire } from '../../main/BaseRequire';

/**
 * Загружает и дефанит модули с именем i18n!${ModuleName}
 * @param module Модуль
 * @param _moduleInfo
 * @param context Require
 */
export default async function (
    module: Module,
    _moduleInfo: IModuleInfo,
    context: IRequire<Module>
): Promise<void> {
    const [{ controller, Translator }]: any[] = await context.require(['I18n/singletonI18n']);

    if (module.path === 'I18n/controller') {
        await controller.isReady();

        module.define([], () => controller);

        return;
    }

    const emptyTranslator = new Translator({}, controller);
    const defaultTranslator = (
        key: string,
        context?: string | number,
        pluralNumber?: number,
        isTemplate?: boolean
    ) => {
        return emptyTranslator.translate(key, context, pluralNumber, isTemplate);
    };

    if (!controller.isEnabled) {
        module.define([], () => defaultTranslator);

        return;
    }

    const contextName = module.rootDir;

    if (!contextName) {
        module.define([], () => defaultTranslator);

        return;
    }

    if (controller.translators.hasOwnProperty(contextName)) {
        const translator = controller.translators[contextName];

        module.define([], () => translator.translate.bind(translator));

        return;
    }

    try {
        const translator = await controller.getTranslator(contextName);

        module.define([], () => translator.translate.bind(translator));
    } catch (err) {
        module.define([], () => defaultTranslator);
    }
}
