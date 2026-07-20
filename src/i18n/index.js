import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

// Initialized once at module load with both locales bundled inline (no
// lazy-loading/backend needed - the whole app's copy is a few KB of JSON),
// so there's no async loading state or flash of untranslated content.
// French is the app's default per the product requirement; the persisted
// redux `i18n.language` (see redux/slices/i18nSlice.js) overrides it after
// rehydration if the user picked English.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: "fr",
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
