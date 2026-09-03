import type { Product } from "../hooks/useProducts";
import { sanitizeStorefrontHtml } from "./html";

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

export const formatInlineMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs">$1</code>');
};

export const formatCustomSizeGuide = (content?: string | null): string => {
  if (typeof content !== 'string' || !content.trim()) {
    return '';
  }

  const raw = content.trim();

  // If already full HTML
  if (/<(p|div|table|tr|td|th|ul|ol|li|br|h[1-6]|span|strong|em)\b[^>]*>/i.test(raw)) {
    return sanitizeStorefrontHtml(raw);
  }

  // Parse Markdown / Plain text to structured semantic HTML
  const lines = raw.split(/\r?\n/);
  const htmlParts: string[] = [];
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableRows: string[][] = [];

  const flushList = () => {
    if (inUl) {
      htmlParts.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      htmlParts.push('</ol>');
      inOl = false;
    }
  };

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      const [headerRow, ...bodyRows] = tableRows;
      let tableHtml = '<div class="overflow-x-auto my-3"><table class="w-full border-collapse border border-border text-sm">';
      if (headerRow) {
        tableHtml += '<thead class="bg-secondary/40"><tr>';
        headerRow.forEach((cell) => {
          tableHtml += `<th class="border border-border px-3 py-2 text-start font-bold">${formatInlineMarkdown(cell)}</th>`;
        });
        tableHtml += '</tr></thead>';
      }
      if (bodyRows.length > 0) {
        tableHtml += '<tbody>';
        bodyRows.forEach((row) => {
          tableHtml += '<tr class="border-t border-border">';
          row.forEach((cell) => {
            tableHtml += `<td class="border border-border px-3 py-2">${formatInlineMarkdown(cell)}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</tbody>';
      }
      tableHtml += '</table></div>';
      htmlParts.push(tableHtml);
      tableRows = [];
      inTable = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushTable();
      continue;
    }

    // Markdown Table row: | col1 | col2 | ... |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      // Skip separator row like |---|---|
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
        continue;
      }
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      inTable = true;
      tableRows.push(cells);
      continue;
    } else {
      flushTable();
    }

    // Heading: ### Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text = formatInlineMarkdown(headingMatch[2]);
      const headingClass = level <= 2 ? 'text-lg font-black my-2.5 text-foreground' : 'text-base font-bold my-1.5 text-foreground';
      htmlParts.push(`<h${level} class="${headingClass}">${text}</h${level}>`);
      continue;
    }

    // Unordered List item: * item or - item
    const ulMatch = trimmed.match(/^[\*\-]\s+(.*)$/);
    if (ulMatch) {
      if (inOl) flushList();
      if (!inUl) {
        htmlParts.push('<ul class="list-disc ps-5 space-y-1.5 my-2">');
        inUl = true;
      }
      htmlParts.push(`<li>${formatInlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered List item: 1. item
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) flushList();
      if (!inOl) {
        htmlParts.push('<ol class="list-decimal ps-5 space-y-1.5 my-2">');
        inOl = true;
      }
      htmlParts.push(`<li>${formatInlineMarkdown(olMatch[1])}</li>`);
      continue;
    }

    // Regular paragraph
    flushList();
    htmlParts.push(`<p class="mb-2 leading-relaxed">${formatInlineMarkdown(trimmed)}</p>`);
  }

  flushList();
  flushTable();

  return sanitizeStorefrontHtml(htmlParts.join('\n'));
};

