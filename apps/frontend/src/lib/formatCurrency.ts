export interface FormatCurrencyOptions {
  locale?: string;
  currency?: boolean;
}

/**
 * Unifies currency formatting across the Procurement module according to P3 specification.
 * - Thousands separator
 * - 2 decimal places fixed
 * - Correct symbol based on locale (ج.م for Arabic, EGP for English)
 * - Safe against string numbers, Decimals, null, undefined, or NaN
 */
export function formatCurrency(
  value: number | string | null | undefined,
  options: FormatCurrencyOptions = {}
): string {
  const { locale = 'ar', currency = true } = options;

  if (value === null || value === undefined || value === '') {
    const zero = (0).toFixed(2);
    if (!currency) return zero;
    return locale.startsWith('ar') ? `${zero} ج.م` : `${zero} EGP`;
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) {
    const zero = (0).toFixed(2);
    if (!currency) return zero;
    return locale.startsWith('ar') ? `${zero} ج.م` : `${zero} EGP`;
  }

  const formattedNumber = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (!currency) {
    return formattedNumber;
  }

  return locale.startsWith('ar')
    ? `${formattedNumber} ج.م`
    : `${formattedNumber} EGP`;
}

/**
 * Formats dates according to user interface language (P3 section 3.4).
 * Returns 'ar-EG' date for Arabic and 'en-GB' date for English/others.
 */
export function formatProcurementDate(
  dateValue: string | Date | null | undefined,
  locale: string = 'ar'
): string {
  if (!dateValue) return '—';
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(locale.startsWith('ar') ? 'ar-EG' : 'en-GB');
  } catch {
    return '—';
  }
}
