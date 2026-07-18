import { useEffect } from "react";
import { useSelector } from "react-redux";
import i18n from "./index";

// Keeps the i18next instance's active language in sync with the persisted
// redux choice. Lives inside PersistGate so it only runs once rehydration
// (and therefore the real persisted language, if any) is available.
export default function I18nSync() {
  const language = useSelector((state) => state.i18n.language);

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  return null;
}
