/**
 * Браузерный загрузчик для локализации
 * @author Кудрявцев И.С.
 */
import type WebRequire from '../../WebRequire';

let defaultTranslator: unknown;
let controller: any;

function getDefaultTranslator(context: WebRequire): unknown {
    if (defaultTranslator) {
        return defaultTranslator;
    }

    // Здесь можно заюзать синхроный require, потому что I18n/singletonI18n точно был загржен ради контроллера.
    const { Translator }: any = context.require('I18n/singletonI18n');
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
 * Загружает и дефанит модули с именем i18n!${ModuleName}
 * @param module Модуль
 * @param context Require
 */
export default async function (
    _defineName: string,
    filePath: string,
    context: WebRequire
): Promise<unknown> {
    if (!controller) {
        controller = (await context.require(['I18n/singletonI18n:controller']))[0];
    }

    if (filePath === 'controller?I18n/controller') {
        await controller.isReady();

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

    try {
        const translator = await controller.getTranslator(rootDir);

        return translator.translate.bind(translator);
    } catch (err) {
        return getDefaultTranslator(context);
    }
}
