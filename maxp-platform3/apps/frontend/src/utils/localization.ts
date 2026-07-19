import i18n from '../i18n';

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

const ENGLISH_PATTERN = /^[A-Za-z0-9\s.,!?;:'"\-()&$#@%*+/\\[\]{}|_~`<>]+$/;

export function assertArabic(text: string, context?: string): void {
  if (!isDev) return;
  if (!text || text.length < 3) return;
  if (ENGLISH_PATTERN.test(text) && !/^[\d\s.,%]+$/.test(text)) {
    console.warn(`[Localization] Potential hardcoded English text: "${text}"${context ? ` at ${context}` : ''}`);
  }
}

export function validateTranslations(keys: string[]): void {
  if (!isDev) return;
  keys.forEach(key => {
    const value = i18n.t(key);
    if (value === key) {
      console.warn(`[Localization] Missing translation key: "${key}"`);
    }
  });
}

export function getLocalizedDate(dateStr: string): string {
  const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
  return new Date(dateStr).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getLocalizedDateTime(dateStr: string): string {
  const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
  return new Date(dateStr).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default { assertArabic, validateTranslations, getLocalizedDate, getLocalizedDateTime };
