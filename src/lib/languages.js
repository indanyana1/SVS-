export const DEFAULT_LANGUAGE_CODE = 'en';

export const SUPPORTED_LANGUAGES = [
  { code: 'zu', englishName: 'Zulu', nativeName: 'IsiZulu', flag: '🇿🇦' },
  { code: 'en', englishName: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'af', englishName: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
  { code: 'sw', englishName: 'Swahili', nativeName: 'Kiswahili', flag: '🌍' },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ar', englishName: 'Modern Standard Arabic', nativeName: 'العربية', flag: '🌍' },
  { code: 'fr', englishName: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'zh', englishName: 'Mandarin', nativeName: '中文', flag: '🇨🇳' },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ru', englishName: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'bn', englishName: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  { code: 'ja', englishName: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'id', englishName: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'vi', englishName: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'te', englishName: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'tr', englishName: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'mr', englishName: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'st', englishName: 'Sesotho', nativeName: 'Sesotho', flag: '🇱🇸' },
  { code: 'pcm', englishName: 'Nigerian Pidgin', nativeName: 'Naijá', flag: '🇳🇬' },
  { code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'ro', englishName: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'pl', englishName: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'uk', englishName: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'it', englishName: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ko', englishName: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'th', englishName: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'fil', englishName: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭' },
  { code: 'nl', englishName: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
];

const languageByCode = SUPPORTED_LANGUAGES.reduce((accumulator, language) => {
  accumulator[language.code] = language;
  return accumulator;
}, {});

export const normalizeLanguageCode = (value) => {
  if (!value || typeof value !== 'string') {
    return DEFAULT_LANGUAGE_CODE;
  }

  return value.toLowerCase().split('-')[0];
};

export const getLanguageByCode = (value) => {
  const code = normalizeLanguageCode(value);
  return languageByCode[code] || languageByCode[DEFAULT_LANGUAGE_CODE];
};

export const isRtlLanguage = (value) => normalizeLanguageCode(value) === 'ar';
