export interface OrderCustomFieldEntry {
  label: string;
  value: string;
}

export interface ExtractOrderCustomFieldsOptions {
  defaultLabel?: string;
}

const CAR_BRAND_KEYWORDS = [
  "سيار", "موديل", "عربيه", "عربية", "ماركة", "طراز", "مواصفات", "مواصفة", "حقول مخصصة", "مخصص", "حقل مخصص",
  "هيونداي", "تويوتا", "كيا", "سيراتو", "النترا", "توسان", "نيسان", "صني", "سنترا", "قشقاي",
  "شيفروليه", "شيفرولي", "اوبترا", "افيو", "كروز", "رينو", "ميجان", "لوجان", "داستر", "ستيب واي",
  "مرسيدس", "بي ام", "بي إم", "bmw", "شيري", "تيجو", "اريزو", "ام جي", "mg", "جيلى", "جيلي",
  "امجراند", "ميتسوبيشي", "لانسر", "اكليبس", "سوزوكي", "سويفت", "ديزاير", "فورد", "فوكاس", "فيستا",
  "فيات", "تيبو", "بونتو", "سكودا", "اوكتافيا", "فولكس", "فولكسفاجن", "باسات", "جولف", "بيجو",
  "اوبل", "استرا", "كورسا", "انسيجنيا", "هوندا", "سيفيك", "جيب", "شيروكي", "رينيجيد", "سوبارو"
];

const CUSTOM_FIELD_PREFIXES = [
  "تفاصيل الطلب:",
  "تفاصيل الطلب",
  "المواصفات والحقول المخصصة:",
  "المواصفات والحقول المخصصة",
  "المواصفات والتفاصيل:",
  "المواصفات والتفاصيل",
  "المواصفات الخاصة:",
  "مواصفات خاصة:",
  "المواصفات:",
  "مواصفات:",
  "حقول مخصصة:",
  "الحقول المخصصة:",
  "بيانات السيارة:"
];

export const isSystemBulkStatusNote = (note: string | null | undefined): boolean => {
  if (!note || typeof note !== "string") return false;
  const trimmed = note.trim();
  return (
    trimmed === "Bulk status update" ||
    trimmed === "Bulk preparation queue update" ||
    trimmed === "Bulk restore" ||
    trimmed === "Bulk move to trash" ||
    /^bulk\s+/i.test(trimmed)
  );
};

const matchesCarSpec = (line: string): boolean => {
  const lower = line.toLowerCase();
  return CAR_BRAND_KEYWORDS.some((kw) => lower.includes(kw));
};

export function extractOrderCustomFields(
  source: any,
  options?: ExtractOrderCustomFieldsOptions | string,
): OrderCustomFieldEntry[] {
  if (!source) return [];
  const entries: OrderCustomFieldEntry[] = [];
  const seenKeys = new Set<string>();

  const configuredFallbackLabel =
    (typeof options === "string" ? options : options?.defaultLabel)?.trim() || "";
  const defaultFallbackLabel = configuredFallbackLabel || "نوع وموديل وسنة صنع السيارة";

  const addEntry = (label: string, value: string) => {
    const cleanLabel = String(label || "").trim();
    const cleanValue = String(value || "").trim();
    if (!cleanLabel || !cleanValue) return;
    const dedupeKey = `${cleanLabel.toLowerCase()}:${cleanValue.toLowerCase()}`;
    if (seenKeys.has(dedupeKey)) return;
    seenKeys.add(dedupeKey);
    entries.push({ label: cleanLabel, value: cleanValue });
  };

  // 1. Check metadata
  let metadata: any = source.metadata;
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = null;
    }
  }
  if (!metadata && source.order?.metadata) {
    let orderMeta = source.order.metadata;
    if (typeof orderMeta === "string") {
      try {
        orderMeta = JSON.parse(orderMeta);
      } catch {
        orderMeta = null;
      }
    }
    metadata = orderMeta;
  }

  if (metadata && typeof metadata === "object") {
    // Array of custom fields / attributes
    const rawList = Array.isArray(metadata.customFields)
      ? metadata.customFields
      : Array.isArray(metadata.customAttributes)
      ? metadata.customAttributes
      : null;

    if (rawList) {
      for (const item of rawList) {
        if (item && typeof item === "object") {
          const lbl = item.label || item.name || item.key;
          const val = item.value || item.val;
          if (lbl && val) addEntry(lbl, val);
        }
      }
    }

    // Direct object of custom fields
    if (
      metadata.customFields &&
      typeof metadata.customFields === "object" &&
      !Array.isArray(metadata.customFields)
    ) {
      Object.entries(metadata.customFields).forEach(([k, v]) => {
        if (v && typeof v === "string") addEntry(k, v);
      });
    }

    // Direct object of attributeValues in order metadata
    if (
      metadata.attributeValues &&
      typeof metadata.attributeValues === "object" &&
      !Array.isArray(metadata.attributeValues)
    ) {
      Object.entries(metadata.attributeValues).forEach(([k, v]) => {
        if (v && typeof v === "string") {
          const lowerK = k.toLowerCase().replace(/[-_]/g, "");
          const isCarKey = lowerK === "carmodel" || lowerK === "car" || matchesCarSpec(k) || matchesCarSpec(v) || k.includes("سيار") || k.includes("موديل") || k.includes("مواصف");
          if (isCarKey) {
            const label = (lowerK === "carmodel" || lowerK === "car") ? defaultFallbackLabel : k;
            addEntry(label, v);
          }
        }
      });
    }

    // Specific known keys like carModel / car_model
    if (metadata.carModel && typeof metadata.carModel === "string") {
      addEntry(defaultFallbackLabel, metadata.carModel);
    }
    if (metadata.car_model && typeof metadata.car_model === "string") {
      addEntry(defaultFallbackLabel, metadata.car_model);
    }
  }

  // 2. Check items attributes/metadata
  const items = Array.isArray(source.order?.orderItems)
    ? source.order.orderItems
    : Array.isArray(source.orderItems)
    ? source.orderItems
    : Array.isArray(source.items)
    ? source.items
    : [];
  for (const item of items) {
    if (!item) continue;
    let itemMeta: any = item.metadata;
    if (typeof itemMeta === "string" && itemMeta.trim()) {
      try {
        itemMeta = JSON.parse(itemMeta);
      } catch {
        itemMeta = null;
      }
    }

    const itemAttrs = item.attributes || item.customAttributes || item.customFields || itemMeta?.customAttributes || itemMeta?.customFields;
    if (Array.isArray(itemAttrs)) {
      for (const attr of itemAttrs) {
        if (attr && typeof attr === "object") {
          const lbl = attr.label || attr.name || attr.key;
          const val = attr.value || attr.val;
          if (lbl && val) addEntry(lbl, val);
        }
      }
    } else if (itemAttrs && typeof itemAttrs === "object") {
      Object.entries(itemAttrs).forEach(([k, v]) => {
        if (v && typeof v === "string") addEntry(k, v);
      });
    }

    const attrValues = itemMeta?.attributeValues || item.attributeValues;
    if (attrValues && typeof attrValues === "object" && !Array.isArray(attrValues)) {
      Object.entries(attrValues).forEach(([k, v]) => {
        if (v && typeof v === "string") {
          const lowerK = k.toLowerCase().replace(/[-_]/g, "");
          const isCarKey = lowerK === "carmodel" || lowerK === "car" || matchesCarSpec(k) || matchesCarSpec(v) || k.includes("سيار") || k.includes("موديل") || k.includes("مواصف");
          if (isCarKey) {
            const label = (lowerK === "carmodel" || lowerK === "car") ? defaultFallbackLabel : k;
            addEntry(label, v);
          }
        }
      });
    }

    const resolvedCarModel = item.carModel || item.car_model || itemMeta?.carModel || itemMeta?.car_model;
    if (resolvedCarModel) addEntry(defaultFallbackLabel, String(resolvedCarModel));
  }

  // 3. Check notes (both source.notes AND source.order.notes, preserving all candidates)
  const notesPool = [
    typeof source.notes === "string" ? source.notes : "",
    typeof source.order?.notes === "string" ? source.order.notes : "",
    typeof source.customerNotes === "string" ? source.customerNotes : "",
    typeof metadata?.customerNotes === "string" ? metadata.customerNotes : "",
    typeof metadata?.notes === "string" ? metadata.notes : "",
    typeof metadata?.originalNotes === "string" ? metadata.originalNotes : "",
  ].filter((n) => Boolean(n && n.trim() && !isSystemBulkStatusNote(n)));

  const notesStr = Array.from(new Set(notesPool)).join("\n").trim();
  if (notesStr) {
    const lines = notesStr.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || isSystemBulkStatusNote(line)) continue;

      // Match known custom field prefixes
      const matchedPrefix = CUSTOM_FIELD_PREFIXES.find((p) => line.startsWith(p));
      if (matchedPrefix) {
        const afterPrefix = line.slice(matchedPrefix.length).replace(/^:?\s*/, "").trim();
        if (afterPrefix.includes(":")) {
          const parts = afterPrefix.split(":");
          const label = parts[0].trim();
          const value = parts.slice(1).join(":").trim();
          addEntry(label, value);
        } else if (afterPrefix.includes("-")) {
          const parts = afterPrefix.split("-");
          const label = parts[0].trim();
          const value = parts.slice(1).join("-").trim();
          addEntry(label, value);
        } else if (afterPrefix) {
          const fallbackPrefixLabel = matchedPrefix.replace(/:$/, "").trim();
          addEntry(
            configuredFallbackLabel ||
              (fallbackPrefixLabel !== "تفاصيل الطلب"
                ? fallbackPrefixLabel
                : "مواصفات وتفاصيل الطلب"),
            afterPrefix,
          );
        }
      } else if (matchesCarSpec(line)) {
        if (line.includes(":")) {
          const [lbl, ...val] = line.split(":");
          addEntry(lbl.trim(), val.join(":").trim());
        } else {
          addEntry(defaultFallbackLabel, line);
        }
      }
    }
  }

  return entries;
}

/**
 * Removes custom fields / car specs lines from notes when they are displayed
 * in their own dedicated section, preventing duplicate text in the notes box.
 */
export function cleanNotesWithoutCustomFields(
  notes: string | null | undefined,
  customFields?: OrderCustomFieldEntry[]
): string {
  const notesStr = String(notes || "").trim();
  if (!notesStr || isSystemBulkStatusNote(notesStr)) return "";

  const lines = notesStr.split(/\r?\n/);
  const filteredLines = lines.filter((rawLine) => {
    const line = rawLine.trim();
    if (!line || isSystemBulkStatusNote(line)) return false;

    // Filter out lines starting with known custom field prefixes
    const startsWithPrefix = CUSTOM_FIELD_PREFIXES.some((p) => line.startsWith(p));
    if (startsWithPrefix) return false;

    // Filter out lines mentioning car specs
    if (matchesCarSpec(line)) {
      return false;
    }

    // Filter out if line matches any custom field value or label
    if (customFields && customFields.length > 0) {
      for (const cf of customFields) {
        if (cf.value && line.includes(cf.value)) return false;
        if (cf.label && line.includes(cf.label)) return false;
      }
    }

    return true;
  });

  return filteredLines.join("\n").trim();
}

export interface OrderCustomFieldsDisplayResult {
  isEnabled: boolean;
  customFields: OrderCustomFieldEntry[];
  displayNotes: string;
}

/**
 * Single source of truth for Order Details, Invoice, and Shipping Label.
 * Determines custom fields and notes for display according to the enabled setting.
 */
export function resolveCustomFieldsForDisplay(
  source: any,
  options?: {
    showCustomFields?: boolean;
    defaultLabel?: string;
  },
): OrderCustomFieldsDisplayResult {
  const customFields = extractOrderCustomFields(source, options?.defaultLabel);
  const hasCustomFields = customFields.length > 0;

  // Explicit opt-out check: when options?.showCustomFields === false, keep disabled
  const isExplicitlyDisabled = options?.showCustomFields === false;
  const isEnabled =
    options?.showCustomFields === true || (hasCustomFields && !isExplicitlyDisabled);

  const rawNotesPool = [
    typeof source?.notes === "string" ? source.notes : "",
    typeof source?.order?.notes === "string" ? source.order.notes : "",
    typeof source?.customerNotes === "string" ? source.customerNotes : "",
  ].filter((n) => Boolean(n && n.trim()));
  const rawNotes = Array.from(new Set(rawNotesPool)).join("\n").trim();

  // If company explicitly enabled showCustomFields, but this specific order didn't have custom fields extracted:
  if (options?.showCustomFields === true && !hasCustomFields) {
    const items = Array.isArray(source?.order?.orderItems)
      ? source.order.orderItems
      : Array.isArray(source?.orderItems)
      ? source.orderItems
      : Array.isArray(source?.items)
      ? source.items
      : [];

    const isCustomOrCarProduct = items.some((it: any) => {
      const name = String(it.productName || it.name || "").toLowerCase();
      return name.includes("سيار") || name.includes("عرب") || name.includes("تفصيل") || name.includes("ستائر");
    });

    if (isCustomOrCarProduct || items.length > 0) {
      const fallbackLabel = options?.defaultLabel?.trim() || "نوع وموديل وسنة صنع السيارة";
      const fallbackFields: OrderCustomFieldEntry[] = [
        { label: fallbackLabel, value: "—" },
      ];
      return {
        isEnabled: true,
        customFields: fallbackFields,
        displayNotes: rawNotes,
      };
    }
  }

  if (!isEnabled || !hasCustomFields) {
    return {
      isEnabled: false,
      customFields: [],
      displayNotes: rawNotes,
    };
  }

  const displayNotes = cleanNotesWithoutCustomFields(rawNotes, customFields);

  return {
    isEnabled: true,
    customFields,
    displayNotes,
  };
}
