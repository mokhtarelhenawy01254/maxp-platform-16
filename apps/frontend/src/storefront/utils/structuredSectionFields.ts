export type StorefrontEditorSectionSettings = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const cloneStructuredValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => (isRecord(item) ? { ...item } : item));
  }

  if (isRecord(value)) {
    return { ...value };
  }

  return value;
};

const keepSectionSettingValue = (value: unknown): boolean => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  if (typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isRecord(value)) {
    return Object.keys(value).length > 0;
  }

  return false;
};

const serializePipeDelimitedLines = (
  value: unknown,
  fields: readonly string[],
): string | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const lines = value
    .filter(isRecord)
    .map((item) =>
      fields
        .map((fieldKey) =>
          typeof item[fieldKey] === "string" ? item[fieldKey].trim() : "",
        )
        .join("|"),
    )
    .filter((line) => line.replace(/\|/g, "").trim().length > 0);

  return lines.length > 0 ? lines.join("\n") : null;
};

const STRUCTURED_FIELD_SERIALIZERS: Record<
  string,
  (value: unknown) => string | null
> = {
  items: (value) =>
    serializePipeDelimitedLines(value, [
      "eyebrow",
      "title",
      "subtitle",
      "link",
      "tone",
      "chip",
    ]),
  cards: (value) =>
    serializePipeDelimitedLines(value, [
      "label",
      "title",
      "subtitle",
      "ctaText",
      "link",
      "tone",
      "stat",
    ]),
  collections: (value) => {
    if (!Array.isArray(value)) {
      return null;
    }

    const lines = value
      .filter(isRecord)
      .map((item) =>
        [
          typeof item.title === "string"
            ? item.title.trim()
            : typeof item.name === "string"
              ? item.name.trim()
              : "",
          typeof item.subtitle === "string"
            ? item.subtitle.trim()
            : typeof item.description === "string"
              ? item.description.trim()
              : "",
          typeof item.image === "string" ? item.image.trim() : "",
          typeof item.link === "string" ? item.link.trim() : "",
        ].join("|"),
      )
      .filter((line) => line.replace(/\|/g, "").trim().length > 0);

    return lines.length > 0 ? lines.join("\n") : null;
  },
};

export const extractStorefrontSectionSettings = (
  value: unknown,
): StorefrontEditorSectionSettings => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [key, currentValue]) => {
    if (
      typeof currentValue === "string" ||
      typeof currentValue === "number" ||
      typeof currentValue === "boolean" ||
      Array.isArray(currentValue) ||
      isRecord(currentValue)
    ) {
      acc[key] = cloneStructuredValue(currentValue);
    }

    return acc;
  }, {} as StorefrontEditorSectionSettings);
};

export const cleanStorefrontSectionSettings = (
  settings: StorefrontEditorSectionSettings = {},
): StorefrontEditorSectionSettings =>
  Object.entries(settings).reduce((acc, [key, value]) => {
    if (keepSectionSettingValue(value)) {
      acc[key] = value;
    }

    return acc;
  }, {} as StorefrontEditorSectionSettings);

export const getStorefrontSectionFieldDisplayValue = (
  settings: StorefrontEditorSectionSettings,
  fieldKey: string,
): string => {
  const value = settings[fieldKey];

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (typeof record.ar === "string" && record.ar.trim()) {
      return record.ar;
    }
    if (typeof record.en === "string" && record.en.trim()) {
      return record.en;
    }
  }

  const serializer = STRUCTURED_FIELD_SERIALIZERS[fieldKey];
  return serializer?.(value) || "";
};
