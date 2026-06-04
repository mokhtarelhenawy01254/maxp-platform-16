export type ShippingClassOption = {
  key: string;
  label: string;
};

export const DEFAULT_SHIPPING_CLASS_FEES: Record<string, number> = {
  standard: 0,
  heavy: 20,
  fragile: 10,
  express: 30,
};

export const DEFAULT_SHIPPING_CLASSES: ShippingClassOption[] = [
  { key: "standard", label: "عادي" },
  { key: "heavy", label: "ثقيل" },
  { key: "fragile", label: "قابل للكسر" },
  { key: "express", label: "سريع" },
];

export const normalizeShippingClassKey = (value?: string | null): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
};

const normalizeShippingClassLabel = (value: any, fallback: string): string => {
  const label = value === null || value === undefined ? "" : String(value).trim();
  return label || fallback;
};

export const normalizeFeesMap = (
  fees?: Record<string, any>,
): Record<string, number> => {
  if (!fees || typeof fees !== "object") return {};
  return Object.entries(fees).reduce<Record<string, number>>(
    (acc, [key, value]) => {
      const normalizedKey = normalizeShippingClassKey(key);
      if (!normalizedKey) return acc;
      acc[normalizedKey] = Number(value) || 0;
      return acc;
    },
    {},
  );
};

export const mergeShippingClasses = (stored?: any): ShippingClassOption[] => {
  const map = new Map<string, ShippingClassOption>();

  DEFAULT_SHIPPING_CLASSES.forEach((option) => {
    const key = normalizeShippingClassKey(option.key);
    if (!key) return;
    map.set(key, { key, label: option.label });
  });

  const addClass = (rawKey: any, rawLabel: any) => {
    const key = normalizeShippingClassKey(rawKey);
    if (!key) return;
    const existing = map.get(key);
    const label = normalizeShippingClassLabel(rawLabel, existing?.label || key);
    map.set(key, { key, label });
  };

  if (Array.isArray(stored)) {
    stored.forEach((item) => {
      if (!item) return;
      if (typeof item === "string") {
        addClass(item, item);
        return;
      }
      if (typeof item === "object") {
        addClass(
          item.key ?? item.slug ?? item.value ?? item.id ?? item.name ?? item.label,
          item.label ?? item.name ?? item.key ?? item.value,
        );
      }
    });
  }

  return Array.from(map.values());
};

export const ensureShippingClassesForKeys = (
  classes: ShippingClassOption[],
  keys?: string[],
): ShippingClassOption[] => {
  if (!Array.isArray(keys) || keys.length === 0) return classes;
  const existing = new Set(
    classes.map((option) => normalizeShippingClassKey(option.key)),
  );

  let next = [...classes];
  keys.forEach((key) => {
    const normalized = normalizeShippingClassKey(key);
    if (!normalized || existing.has(normalized)) return;
    existing.add(normalized);
    next = [
      ...next,
      {
        key: normalized,
        label: normalizeShippingClassLabel(key, normalized),
      },
    ];
  });

  return next;
};

export const buildDefaultClassFees = (
  classes?: ShippingClassOption[],
): Record<string, number> => {
  const base = { ...DEFAULT_SHIPPING_CLASS_FEES };
  const list = classes && classes.length > 0 ? classes : DEFAULT_SHIPPING_CLASSES;
  list.forEach((option) => {
    const key = normalizeShippingClassKey(option.key);
    if (!key) return;
    if (!(key in base)) {
      base[key] = 0;
    }
  });
  return base;
};
