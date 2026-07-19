import type { Category } from '../hooks/useCategories';

const normalizeCatalogCategoryToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');

const uniqueTokens = (tokens: string[]): string[] => {
  const seen = new Set<string>();

  return tokens.filter((token) => {
    if (!token || seen.has(token)) {
      return false;
    }

    seen.add(token);
    return true;
  });
};

export const parseCatalogCategorySlugs = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return uniqueTokens(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => normalizeCatalogCategoryToken(item))
        .filter(Boolean),
    );
  }

  if (typeof value === 'string' && value.trim()) {
    return uniqueTokens(
      value
        .split(/\r?\n|,|\|/)
        .map((item) => normalizeCatalogCategoryToken(item))
        .filter(Boolean),
    );
  }

  return [];
};

const categoryMatchesToken = (category: Category, token: string): boolean => {
  const normalizedToken = normalizeCatalogCategoryToken(token);

  return (
    normalizeCatalogCategoryToken(category.slug || '') === normalizedToken ||
    normalizeCatalogCategoryToken(category.name || '') === normalizedToken
  );
};

const WOMENS_FOOTWEAR_CATEGORY_TOKENS = [
  'womens-shoes',
  "women's shoes",
  'shoes',
  'footwear',
  'womens-footwear',
  'women-footwear',
  'a7dhya-7rymy',
  'a7dhya-harimy',
  'a7dhya-hrimy',
  'a7zya-7rymy',
  'ahdhiya-harimi',
  'ahziya-harimi',
];

const GENERAL_FOOTWEAR_CATEGORY_TOKENS = uniqueTokens([
  'shoes',
  'footwear',
  ...WOMENS_FOOTWEAR_CATEGORY_TOKENS,
]);

const SANDAL_CATEGORY_TOKENS = uniqueTokens([
  'shoes',
  'slippers',
  'footwear',
  ...WOMENS_FOOTWEAR_CATEGORY_TOKENS,
]);

const CATALOG_CATEGORY_ALIASES: Record<string, string[]> = {
  sneaker: WOMENS_FOOTWEAR_CATEGORY_TOKENS,
  sneakers: WOMENS_FOOTWEAR_CATEGORY_TOKENS,
  trainer: WOMENS_FOOTWEAR_CATEGORY_TOKENS,
  trainers: WOMENS_FOOTWEAR_CATEGORY_TOKENS,
  kotshy: WOMENS_FOOTWEAR_CATEGORY_TOKENS,
  flats: GENERAL_FOOTWEAR_CATEGORY_TOKENS,
  flat: GENERAL_FOOTWEAR_CATEGORY_TOKENS,
  sandals: SANDAL_CATEGORY_TOKENS,
  sandal: SANDAL_CATEGORY_TOKENS,
};

export const resolveCatalogCategoryBySlug = (
  categories: Category[],
  slug: string | null | undefined,
): Category | null => {
  if (!slug) {
    return null;
  }

  return categories.find((category) => categoryMatchesToken(category, slug)) || null;
};

export const resolveCatalogCategoryByToken = (
  categories: Category[],
  token: string | null | undefined,
): Category | null => {
  if (!token) {
    return null;
  }

  const idMatch = categories.find((category) => category.id === token);
  if (idMatch) {
    return idMatch;
  }

  const slugMatch = resolveCatalogCategoryBySlug(categories, token);
  if (slugMatch) {
    return slugMatch;
  }

  const aliasTokens = CATALOG_CATEGORY_ALIASES[normalizeCatalogCategoryToken(token)] || [];
  for (const aliasToken of aliasTokens) {
    const aliasMatch = resolveCatalogCategoryBySlug(categories, aliasToken);
    if (aliasMatch) {
      return aliasMatch;
    }
  }

  return null;
};

export const filterCatalogCategoriesBySlugs = (
  categories: Category[],
  slugs: string[],
): Category[] => {
  if (slugs.length === 0) {
    return categories;
  }

  const matches: Category[] = [];
  const seen = new Set<string>();

  slugs.forEach((slug) => {
    const match = resolveCatalogCategoryBySlug(categories, slug);
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      matches.push(match);
    }
  });

  return matches;
};
