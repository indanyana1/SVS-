import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE_CODE, SUPPORTED_LANGUAGES } from './lib/languages';

const supportedLanguageCodes = SUPPORTED_LANGUAGES.map((language) => language.code);

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(
      resourcesToBackend((language, namespace) =>
        import(`./locales/${language}/${namespace}.json`)
      )
    )
    .use(initReactI18next)
    .init({
      fallbackLng: DEFAULT_LANGUAGE_CODE,
      supportedLngs: supportedLanguageCodes,
      nonExplicitSupportedLngs: true,
      load: 'languageOnly',
      defaultNS: 'translation',
      ns: ['translation'],
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: 'svs-language',
        caches: ['localStorage'],
      },
      react: {
        useSuspense: false,
      },
    });
}

export default i18n;
