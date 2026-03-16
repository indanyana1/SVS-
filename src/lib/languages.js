export const DEFAULT_LANGUAGE_CODE = 'en';

const LANGUAGE_DEFINITIONS = [
  { code: 'af', englishName: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦' },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية', flag: '🌍' },
  { code: 'bn', englishName: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'nl', englishName: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', englishName: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fil', englishName: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭' },
  { code: 'fr', englishName: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'id', englishName: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'it', englishName: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', englishName: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', englishName: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', englishName: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'mr', englishName: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'pcm', englishName: 'Nigerian Pidgin', nativeName: 'Naijá', flag: '🇳🇬' },
  { code: 'pl', englishName: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ro', englishName: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'ru', englishName: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'st', englishName: 'Southern Sotho', nativeName: 'Sesotho', flag: '🇱🇸' },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'sw', englishName: 'Swahili', nativeName: 'Kiswahili', flag: '🌍' },
  { code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', englishName: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'th', englishName: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'tr', englishName: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'uk', englishName: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'vi', englishName: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zu', englishName: 'Zulu', nativeName: 'IsiZulu', flag: '🇿🇦' },
];

export const SUPPORTED_LANGUAGES = [...LANGUAGE_DEFINITIONS].sort((left, right) =>
  left.englishName.localeCompare(right.englishName),
);

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
