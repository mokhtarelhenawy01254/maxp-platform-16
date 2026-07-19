export const DEFAULT_STOREFRONT_CURRENCY = 'EGP';

export const normalizeStorefrontCurrency = (currency?: string | null): string => {
  const normalized = typeof currency === 'string' ? currency.trim().toUpperCase() : '';
  return normalized || DEFAULT_STOREFRONT_CURRENCY;
};

export const formatStorefrontCurrency = (
  amount: number,
  currency?: string | null,
  locale = 'en-US',
): string => {
  const numericAmount = Number.isFinite(amount) ? amount : 0;
  const normalizedCurrency = normalizeStorefrontCurrency(currency);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${normalizedCurrency} ${numericAmount.toFixed(2)}`;
  }
};
