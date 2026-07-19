const decodeHtmlEntity = (entity: string): string => {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  const normalizedEntity = entity.toLowerCase();
  if (namedEntities[normalizedEntity] !== undefined) {
    return namedEntities[normalizedEntity];
  }

  if (normalizedEntity.startsWith('#x')) {
    const codePoint = Number.parseInt(normalizedEntity.slice(2), 16);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : `&${entity};`;
  }

  if (normalizedEntity.startsWith('#')) {
    const codePoint = Number.parseInt(normalizedEntity.slice(1), 10);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : `&${entity};`;
  }

  return `&${entity};`;
};

export const sanitizeProductCopy = (value: unknown): string =>
  String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&([a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);/g, (_, entity: string) =>
      decodeHtmlEntity(entity),
    )
    .replace(/\s+/g, ' ')
    .trim();

export const truncateProductCopy = (value: string, limit: number): string =>
  value.length > limit ? `${value.slice(0, limit).trim()}...` : value;
