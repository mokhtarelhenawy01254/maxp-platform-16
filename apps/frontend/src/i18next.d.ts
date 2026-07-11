import "react-i18next";
import ar from "./locales/ar/translation.json";

declare module "react-i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof ar;
    };
  }
}