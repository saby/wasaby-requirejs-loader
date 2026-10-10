'use strict';

define('i18n', [
   'optional!I18n/singletonI18n',
   'optional!Env/Constants',
   'text',
   'native-css'
], function (singletonI18n, constant) {
   const controller = singletonI18n.controller;
   const Translator = singletonI18n.Translator;
   const constants = constant.default;
   const alias = {
      Core: 'WS.Core',
      // eslint-disable-next-line
      // eslint-disable-next-line deprecated-anywhere
      Deprecated: 'WS.Deprecated',
      Lib: 'WS.Core',
      Transport: 'WS.Core'
   };
   const emptyTranslator = new Translator({}, controller);
   const defaultTranslator = (key, context, pluralNumber, isTemplate) => {
      return emptyTranslator.translate(key, context, pluralNumber, isTemplate);
   };

   function getContextName(name) {
      const contextName = name.split('/')[0];

      return alias.hasOwnProperty(contextName) ? alias[contextName] : contextName;
   }

   return {
      load: function (name, require, onLoad) {
         if (name.includes('controller?')) {
            /*
              На сервисе представления мнимая асинхроность, которая костыльными путями превращается в синхроность,
              и попытка использовать честный асинхронный промис ломает загрузку файлов.
              Приходиться грузить все локали вручную require-ом и добавлять в контроллер.
             */
            if (constants.isServerSide) {
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
                  'LocalizationConfigs/localization_configs/region/TM.json'
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

                  onLoad(controller);
               });

               return;
            }

            controller.isReady().then(() => {
               onLoad(controller);
            });

            return;
         }

         if (!controller.isEnabled) {
            onLoad(defaultTranslator);

            return;
         }

         const contextName = getContextName(name);

         if (!contextName) {
            onLoad(defaultTranslator);

            return;
         }

         if (controller.translators.hasOwnProperty(contextName)) {
            const translator = controller.translators[contextName];

            onLoad(translator.translate.bind(translator));

            return;
         }

         if (constants.isServerSide) {
            const translator = controller.getTranslatorSync(contextName);

            onLoad(translator.translate.bind(translator));

            return;
         }

         controller
            .getTranslator(contextName)
            .then((translator) => {
               onLoad(translator.translate.bind(translator));
            })
            .catch(() => {
               onLoad(defaultTranslator);
            });
      }
   };
});
