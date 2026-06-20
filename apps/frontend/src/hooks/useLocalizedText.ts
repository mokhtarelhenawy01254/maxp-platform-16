import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

export function useLocalizedText() {
  const { t } = useTranslation();

  const safeT = (key: string, defaultValue?: string): string => {
    const translated = t(key);
    if (translated === key && isDev) {
      console.warn(`[i18n] Missing translation key: "${key}"`);
    }
    if (translated === key && defaultValue) {
      return defaultValue;
    }
    return translated;
  };

  const formatDate = (dateStr: string, options?: Intl.DateTimeFormatOptions): string => {
    const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
    return new Date(dateStr).toLocaleDateString(locale, options);
  };

  const formatDateTime = (dateStr: string, options?: Intl.DateTimeFormatOptions): string => {
    const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
    return new Date(dateStr).toLocaleString(locale, options);
  };

  const formatPrice = (price: number, currency?: string): string => {
    const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
    const formatted = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
    if (currency) return `${formatted} ${currency}`;
    return formatted;
  };

  const dir = i18n.dir();

  return { t: safeT, formatDate, formatDateTime, formatPrice, dir, language: i18n.language };
}

export default useLocalizedText;
