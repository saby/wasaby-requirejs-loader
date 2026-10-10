/**
 * Серверный загрузчик для локализации
 * @author Кудрявцев И.С.
 */
import type ServerRequire from '../../ServerRequire';

let defaultTranslator: unknown;

let cacheController: any;

function getController(context: ServerRequire): any {
    if (cacheController) {
        return cacheController;
    }

    const { controller }: any = context.require('I18n/singletonI18n');

    cacheController = controller;

    return cacheController;
}

function getDefaultTranslator(context: ServerRequire): unknown {
    if (defaultTranslator) {
        return defaultTranslator;
    }

    const { controller, Translator }: any = context.require('I18n/singletonI18n');
    const emptyTranslator = new Translator({}, controller);

    defaultTranslator = (
        key: string,
        module?: string | number,
        pluralNumber?: number,
        isTemplate?: boolean
    ) => {
        return emptyTranslator.translate(key, module, pluralNumber, isTemplate);
    };

    return defaultTranslator;
}

/**
 * Загружает модули с именем i18n!${ModuleName}
 * @param module Модуль
 * @param _moduleInfo
 * @param context Require
 */
export default function (_defineName: string, filePath: string, context: ServerRequire): unknown {
    const controller = getController(context);

    if (filePath === 'controller?I18n/controller') {
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

        return controller;
    }

    if (!controller.isEnabled) {
        return getDefaultTranslator(context);
    }

    const rootDir = context.getRootDir(filePath);

    if (!rootDir) {
        return getDefaultTranslator(context);
    }

    if (controller.translators.hasOwnProperty(rootDir)) {
        const translator = controller.translators[rootDir];

        return translator.translate.bind(translator);
    }

    const translator = controller.getTranslatorSync(rootDir);

    return translator.translate.bind(translator);
}
