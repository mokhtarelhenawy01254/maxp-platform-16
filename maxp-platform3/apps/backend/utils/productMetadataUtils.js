const NUMERIC_KEY_PATTERN = /^\d+$/;
const DEFAULT_MAX_DEPTH = 12;

const isRecord = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getSortedNumericKeys = (value) => {
  if (!isRecord(value)) {
    return [];
  }

  return Object.keys(value)
    .filter((key) => NUMERIC_KEY_PATTERN.test(key))
    .sort((left, right) => Number(left) - Number(right));
};

const normalizeCharacterMapValue = (value) => {
  if (typeof value === 'string' && value.length <= 1) {
    return value;
  }

  if (Number.isInteger(value) && value >= 0 && value <= 9) {
    return String(value);
  }

  return null;
};

const isCharacterMapObject = (value) => {
  const numericKeys = getSortedNumericKeys(value);
  if (numericKeys.length === 0) {
    return false;
  }

  for (let index = 0; index < numericKeys.length; index += 1) {
    const key = numericKeys[index];
    if (key !== String(index)) {
      return false;
    }

    if (normalizeCharacterMapValue(value[key]) === null) {
      return false;
    }
  }

  const preview = numericKeys
    .slice(0, 8)
    .map((key) => normalizeCharacterMapValue(value[key]))
    .join('');

  return preview.startsWith('{') || preview.startsWith('[') || preview.startsWith('"');
};

const mergeRecords = (base, overlay) => ({
  ...(isRecord(base) ? base : {}),
  ...(isRecord(overlay) ? overlay : {}),
});

const normalizeProductMetadata = (value, options = {}) => {
  const maxDepth = Number.isInteger(options.maxDepth) && options.maxDepth > 0
    ? options.maxDepth
    : DEFAULT_MAX_DEPTH;

  let current = value;
  let overlay = {};

  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (current === null || current === undefined || current === '') {
      break;
    }

    if (typeof current === 'string') {
      const trimmed = current.trim();
      if (!trimmed) {
        break;
      }

      try {
        current = JSON.parse(trimmed);
        continue;
      } catch {
        break;
      }
    }

    if (!isRecord(current)) {
      break;
    }

    if (isCharacterMapObject(current)) {
      const siblingEntries = Object.fromEntries(
        Object.entries(current).filter(([key]) => !NUMERIC_KEY_PATTERN.test(key)),
      );

      overlay = mergeRecords(siblingEntries, overlay);
      current = getSortedNumericKeys(current)
        .map((key) => normalizeCharacterMapValue(current[key]) || '')
        .join('');
      continue;
    }

    return mergeRecords(current, overlay);
  }

  return mergeRecords({}, overlay);
};

const parseProductMetadata = (value, options = {}) => {
  const normalized = normalizeProductMetadata(value, options);
  return isRecord(normalized) ? normalized : {};
};

const isCorruptedProductMetadata = (value, options = {}) => {
  const maxDepth = Number.isInteger(options.maxDepth) && options.maxDepth > 0
    ? options.maxDepth
    : DEFAULT_MAX_DEPTH;

  let current = value;

  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (current === null || current === undefined || current === '') {
      return false;
    }

    if (typeof current === 'string') {
      const trimmed = current.trim();
      if (!trimmed) {
        return false;
      }

      try {
        current = JSON.parse(trimmed);
        continue;
      } catch {
        return false;
      }
    }

    if (!isRecord(current)) {
      return false;
    }

    return isCharacterMapObject(current);
  }

  return false;
};

module.exports = {
  isRecord,
  isCharacterMapObject,
  normalizeProductMetadata,
  parseProductMetadata,
  isCorruptedProductMetadata,
};
