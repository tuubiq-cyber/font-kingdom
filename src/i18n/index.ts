import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ar from "./locales/ar";
import en from "./locales/en";
import fr from "./locales/fr";
import es from "./locales/es";
import de from "./locales/de";
import tr from "./locales/tr";
import zh from "./locales/zh";
import ja from "./locales/ja";
import ko from "./locales/ko";
import pt from "./locales/pt";
import ru from "./locales/ru";
import hi from "./locales/hi";
import ur from "./locales/ur";
import fa from "./locales/fa";
import id from "./locales/id";
import ms from "./locales/ms";
import it from "./locales/it";
import nl from "./locales/nl";
import th from "./locales/th";
import vi from "./locales/vi";
import pl from "./locales/pl";

const resources = {
  ar: { translation: ar },
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  de: { translation: de },
  tr: { translation: tr },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
  pt: { translation: pt },
  ru: { translation: ru },
  hi: { translation: hi },
  ur: { translation: ur },
  fa: { translation: fa },
  id: { translation: id },
  ms: { translation: ms },
  it: { translation: it },
  nl: { translation: nl },
  th: { translation: th },
  vi: { translation: vi },
  pl: { translation: pl },
};

export const rtlLanguages = ["ar", "ur", "fa"];

export const languages = [
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "ur", name: "اردو", flag: "🇵🇰" },
  { code: "fa", name: "فارسی", flag: "🇮🇷" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "ar",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
