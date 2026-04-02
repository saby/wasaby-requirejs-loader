/**
 * Серверный загрузчик для локализации
 * @author Кудрявцев И.С.
 */
import type Module from '../../server/Module';
import type { IModuleInfo, IRequire } from '../../main/BaseRequire';

/**
 * Загружает модули с именем i18n!${ModuleName}
 * @param module Модуль
 * @param _moduleInfo
 * @param context Require
 */
export default function (
    module: Module,
    _moduleInfo: IModuleInfo,
    context: IRequire<Module>
): void {
    const { controller, Translator }: any = context.require('I18n/singletonI18n');

    if (module.path === 'I18n/controller') {
        controller.addRegion(
            'RU',
            context.require('LocalizationConfigs/localization_configs/region/RU.json'),
            false
        );
        controller.addRegion(
            'KZ',
            context.require('LocalizationConfigs/localization_configs/region/KZ.json'),
            false
        );
        controller.addRegion(
            'UZ',
            context.require('LocalizationConfigs/localization_configs/region/UZ.json'),
            false
        );
        controller.addRegion(
            'TM',
            context.require('LocalizationConfigs/localization_configs/region/TM.json'),
            false
        );

        //@ts-ignore
        controller.addLang('en', context.require('I18n/locales/en').default, false);
        //@ts-ignore
        controller.addLang('ru', context.require('I18n/locales/ru').default, false);
        //@ts-ignore
        controller.addLang('ar', context.require('I18n/locales/ar').default, false);
        //@ts-ignore
        controller.addLang('he', context.require('I18n/locales/he').default, false);
        //@ts-ignore
        controller.addLang('fr', context.require('I18n/locales/fr').default, false);
        //@ts-ignore
        controller.addLang('kk', context.require('I18n/locales/kk').default, false);
        //@ts-ignore
        controller.addLang('uz', context.require('I18n/locales/uz').default, false);
        //@ts-ignore
        controller.addLang('tk', context.require('I18n/locales/tk').default, false);

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

    const translator = controller.getTranslatorSync(contextName);

    module.define([], () => translator.translate.bind(translator));

    return;
}
