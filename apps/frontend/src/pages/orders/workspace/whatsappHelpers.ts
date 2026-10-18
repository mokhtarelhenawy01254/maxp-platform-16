export const normalizeArabicDigits = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
};

export const sanitizeWhatsAppPhone = (rawPhone: string): { cleanPhone: string; standardPhone: string } => {
  const normalized = normalizeArabicDigits(rawPhone || '');
  const clean = normalized.replace(/\D/g, '');
  if (!clean) {
    return { cleanPhone: '', standardPhone: '' };
  }

  let standard = clean;
  if (standard.startsWith('00')) {
    standard = standard.slice(2);
  }

  if (standard.startsWith('05')) {
    // Saudi Arabia (05 -> 9665)
    standard = `9665${standard.slice(2)}`;
  } else if (standard.startsWith('01')) {
    // Egypt (01 -> 201)
    standard = `201${standard.slice(2)}`;
  } else if (standard.startsWith('0')) {
    standard = `2${standard}`;
  }

  return { cleanPhone: clean, standardPhone: standard };
};

export default {
  normalizeArabicDigits,
  sanitizeWhatsAppPhone,
};
