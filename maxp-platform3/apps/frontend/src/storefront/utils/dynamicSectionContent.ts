import type { Product } from "../hooks/useProducts";

export interface CategoryLookbookCardConfig {
  categoryKey: string;
  title: string;
  subtitle: string;
  mood: string;
  image?: string;
  link?: string;
}

export interface SizeGuideRowConfig {
  target: string;
  eu: string;
  uk: string;
  us: string;
  cm: string;
}

export interface SizeGuideOverrideConfig {
  target: string;
  title?: string;
  subtitle?: string;
  note?: string;
}

const normalizeValue = (value: string): string => value.trim().toLowerCase();

const splitLines = (value: unknown): string[] =>
  typeof value === "string"
    ? value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

export const parseCategoryLookbookCards = (
  value: unknown,
): CategoryLookbookCardConfig[] =>
  splitLines(value).reduce<CategoryLookbookCardConfig[]>((acc, line) => {
    const [categoryKey, title, subtitle, mood, image, link] = line
      .split("|")
      .map((part) => part.trim());

    if (!categoryKey || !title || !subtitle || !mood) {
      return acc;
    }

    acc.push({
      categoryKey,
      title,
      subtitle,
      mood,
      ...(image ? { image } : {}),
      ...(link ? { link } : {}),
    });

    return acc;
  }, []);

export const serializeCategoryLookbookCards = (
  cards: CategoryLookbookCardConfig[],
): string =>
  cards
    .map((card) =>
      [
        card.categoryKey,
        card.title,
        card.subtitle,
        card.mood,
        card.image || "",
        card.link || "",
      ].join("|"),
    )
    .join("\n");

export const parseSizeGuideRows = (value: unknown): SizeGuideRowConfig[] =>
  splitLines(value).reduce<SizeGuideRowConfig[]>((acc, line) => {
    const [target, eu, uk, us, cm] = line.split("|").map((part) => part.trim());

    if (!target || !eu || !uk || !us || !cm) {
      return acc;
    }

    acc.push({ target, eu, uk, us, cm });
    return acc;
  }, []);

export const serializeSizeGuideRows = (rows: SizeGuideRowConfig[]): string =>
  rows
    .map((row) => [row.target, row.eu, row.uk, row.us, row.cm].join("|"))
    .join("\n");

export const parseSizeGuideOverrides = (
  value: unknown,
): SizeGuideOverrideConfig[] =>
  splitLines(value).reduce<SizeGuideOverrideConfig[]>((acc, line) => {
    const [target, title, subtitle, note] = line
      .split("|")
      .map((part) => part.trim());

    if (!target) {
      return acc;
    }

    acc.push({
      target,
      ...(title ? { title } : {}),
      ...(subtitle ? { subtitle } : {}),
      ...(note ? { note } : {}),
    });

    return acc;
  }, []);

export const serializeSizeGuideOverrides = (
  overrides: SizeGuideOverrideConfig[],
): string =>
  overrides
    .map((item) =>
      [item.target, item.title || "", item.subtitle || "", item.note || ""].join("|"),
    )
    .join("\n");

const buildGuideTargets = (product: Product | null): string[] => {
  if (!product) {
    return ["default"];
  }

  const targets = [
    typeof product.slug === "string" && product.slug.trim()
      ? `product:${normalizeValue(product.slug)}`
      : "",
    typeof product.id === "string" && product.id.trim()
      ? `product:${normalizeValue(product.id)}`
      : "",
    typeof product.categoryId === "string" && product.categoryId.trim()
      ? `category:${normalizeValue(product.categoryId)}`
      : "",
    typeof product.category?.id === "string" && product.category.id.trim()
      ? `category:${normalizeValue(product.category.id)}`
      : "",
    typeof product.category?.name === "string" && product.category.name.trim()
      ? `category:${normalizeValue(product.category.name)}`
      : "",
    "default",
  ].filter(Boolean);

  return Array.from(new Set(targets));
};

export const resolveSizeGuideRowsForProduct = (
  rows: SizeGuideRowConfig[],
  product: Product | null,
): SizeGuideRowConfig[] => {
  const targets = buildGuideTargets(product);

  for (const target of targets) {
    const matchedRows = rows.filter(
      (row) => normalizeValue(row.target) === normalizeValue(target),
    );
    if (matchedRows.length > 0) {
      return matchedRows;
    }
  }

  return rows.filter((row) => normalizeValue(row.target) === "default");
};

export const resolveSizeGuideOverrideForProduct = (
  overrides: SizeGuideOverrideConfig[],
  product: Product | null,
): SizeGuideOverrideConfig | null => {
  const targets = buildGuideTargets(product);

  for (const target of targets) {
    const matchedOverride = overrides.find(
      (item) => normalizeValue(item.target) === normalizeValue(target),
    );
    if (matchedOverride) {
      return matchedOverride;
    }
  }

  return (
    overrides.find((item) => normalizeValue(item.target) === "default") || null
  );
};
