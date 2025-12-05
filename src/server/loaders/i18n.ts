import type Module from '../../server/Module';
import type { IModuleInfo, IRequire } from '../../main/BaseRequire';

export default function (
    module: Module,
    _moduleInfo: IModuleInfo,
    context: IRequire<Module>
): void {
    const { controller, Translator }: any = context.require('I18n/singletonI18n');

    if (module.path === 'I18n/controller') {
        require([
            'I18n/locales/en',
            'I18n/locales/ru',
            'I18n/locales/ar',
            'I18n/locales/he',
            'I18n/locales/fr',
            'I18n/locales/kk',
            'I18n/locales/uz',
            'I18n/locales/tk',

            'LocalizationConfigs/localization_configs/region/RU.json',
            'LocalizationConfigs/localization_configs/region/KZ.json',
            'LocalizationConfigs/localization_configs/region/UZ.json',
            'LocalizationConfigs/localization_configs/region/TM.json',
            //@ts-ignore
        ], (en, ru, ar, he, fr, kk, uz, tk, RU, KZ, UZ, TM) => {
            controller.addRegion('RU', RU, false);
            controller.addRegion('KZ', KZ, false);
            controller.addRegion('UZ', UZ, false);
            controller.addRegion('TM', TM, false);

            controller.addLang('en', en.default, false);
            controller.addLang('ru', ru.default, false);
            controller.addLang('ar', ar.default, false);
            controller.addLang('he', he.default, false);
            controller.addLang('fr', fr.default, false);
            controller.addLang('kk', kk.default, false);
            controller.addLang('uz', uz.default, false);
            controller.addLang('tk', tk.default, false);

            module.define([], () => controller);
        });

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
