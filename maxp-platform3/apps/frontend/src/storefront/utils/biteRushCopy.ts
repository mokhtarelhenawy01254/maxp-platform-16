const PRODUCT_NAME_OVERRIDES: Record<string, string> = {
  'rush combo': 'راش كومبو',
  'rush-combo': 'راش كومبو',
  firebird: 'فايربيرد تشيكن',
  'firebird chicken': 'فايربيرد تشيكن',
  'volcano-fries': 'فولكانو فرايز',
  'volcano fries': 'فولكانو فرايز',
  'citrus-fizz': 'سيتروس فيز',
  'citrus fizz': 'سيتروس فيز',
  'cookie-bomb': 'كوكي بومب',
  'cookie bomb': 'كوكي بومب',
  'family-rush': 'فاميلي راش ميل',
  'family rush meal': 'فاميلي راش ميل',
};

const TEXT_OVERRIDES: Record<string, string> = {
  sauce: 'الصوص',
  drink: 'المشروب',
  cola: 'كولا',
  rush: 'راش',
};

const normalize = (value?: string | null) => String(value || '').trim().toLowerCase();

export const localizeBiteRushName = (
  name?: string | null,
  ...keys: Array<string | null | undefined>
): string => {
  for (const candidate of keys) {
    const translated = PRODUCT_NAME_OVERRIDES[normalize(candidate)];
    if (translated) return translated;
  }

  const directMatch = PRODUCT_NAME_OVERRIDES[normalize(name)];
  if (directMatch) return directMatch;

  return String(name || '').trim();
};

export const localizeBiteRushText = (value?: string | null): string =>
  TEXT_OVERRIDES[normalize(value)] || String(value || '').trim();

export const localizeBiteRushAttributeEntries = (
  entries: Array<[string, string]>,
): Array<[string, string]> =>
  entries.map(([key, value]) => [localizeBiteRushText(key), localizeBiteRushText(value)]);

export const localizeBiteRushAttributeRecord = (
  attributes?: Record<string, string>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(attributes || {}).map(([key, value]) => [
      localizeBiteRushText(key),
      localizeBiteRushText(value),
    ]),
  );
