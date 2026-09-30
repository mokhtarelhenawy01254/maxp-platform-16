export interface OrderCustomFieldEntry {
  label: string;
  value: string;
}

export interface ExtractOrderCustomFieldsOptions {
  defaultLabel?: string;
}

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

    // Specific known keys like carModel / car_model
    if (metadata.carModel && typeof metadata.carModel === "string") {
      addEntry(defaultFallbackLabel, metadata.carModel);
    }
    if (metadata.car_model && typeof metadata.car_model === "string") {
      addEntry(defaultFallbackLabel, metadata.car_model);
    }
  }

  // 2. Check notes (order.notes or invoice.notes or source.notes)
  const notesStr = String(source.notes || source.order?.notes || "").trim();
  if (notesStr) {
    const lines = notesStr.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Match "تفاصيل الطلب: <label>: <val>" or "تفاصيل الطلب: <content>"
      if (line.startsWith("تفاصيل الطلب:")) {
        const afterPrefix = line.replace(/^تفاصيل الطلب:\s*/, "").trim();
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
        } else {
          addEntry(configuredFallbackLabel || "مواصفات وتفاصيل الطلب", afterPrefix);
        }
      } else if (
        line.includes("سيار") ||
        line.includes("موديل") ||
        line.startsWith("نوع وموديل")
      ) {
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
  if (!notesStr) return "";

  const lines = notesStr.split(/\r?\n/);
  const filteredLines = lines.filter((rawLine) => {
    const line = rawLine.trim();
    if (!line) return false;

    // Filter out lines starting with "تفاصيل الطلب:"
    if (line.startsWith("تفاصيل الطلب:") || line.startsWith("تفاصيل الطلب")) return false;

    // Filter out lines mentioning car specs
    if (
      line.includes("سيار") ||
      line.includes("موديل") ||
      line.startsWith("نوع وموديل")
    ) {
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
  const isEnabled = options?.showCustomFields === true;
  const rawNotes = String(source?.notes || source?.order?.notes || "").trim();

  if (!isEnabled) {
    return {
      isEnabled: false,
      customFields: [],
      displayNotes: rawNotes,
    };
  }

  const customFields = extractOrderCustomFields(source, options?.defaultLabel);
  const displayNotes = cleanNotesWithoutCustomFields(rawNotes, customFields);

  return {
    isEnabled: true,
    customFields,
    displayNotes,
  };
}
