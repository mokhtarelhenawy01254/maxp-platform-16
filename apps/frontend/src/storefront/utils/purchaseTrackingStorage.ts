export interface StorefrontPurchaseTrackingItem {
  id: string;
  productId?: string;
  variantId?: string;
  name?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  attributes?: Record<string, string>;
  metadata?: unknown;
  quantityOffer?: {
    groupId: string;
    offerId: string;
    offerLabel: string;
    offerQuantity: number;
    slotIndex?: number;
    freeShipping?: boolean;
  };
}

export interface StorefrontPurchaseTrackingState {
  eventId?: string;
  orderNumber: string;
  companyId?: string;
  total: number;
  storePromotionDiscount?: number;
  storePromotionLabel?: string;
  phone?: string;
  customerName?: string;
  paymentMethod?: string;
  items: StorefrontPurchaseTrackingItem[];
}

type StoredPurchaseTrackingState = StorefrontPurchaseTrackingState & {
  savedAt: number;
};

type PurchaseTrackingIdentity = {
  eventId?: unknown;
  orderNumber?: unknown;
  companyId?: unknown;
};

const PURCHASE_TRACKING_PREFIX = "storefront_purchase_tracking:";
const RECENT_PURCHASE_TRACKING_KEY = `${PURCHASE_TRACKING_PREFIX}recent`;
const PURCHASE_TRACKED_PREFIX = "storefront_purchase_pixel_tracked:";
const PURCHASE_TRACKING_TTL_MS = 24 * 60 * 60 * 1000;
const PURCHASE_TRACKED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const getSessionStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getLocalStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const normalizeText = (value: unknown): string =>
  typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";

const normalizeAmount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeQuantityOffer = (
  value: unknown,
): StorefrontPurchaseTrackingItem["quantityOffer"] => {
  if (!isRecord(value)) {
    return undefined;
  }

  const groupId = normalizeText(value.groupId);
  const offerId = normalizeText(value.offerId);
  const offerLabel = normalizeText(value.offerLabel);
  const offerQuantity = normalizeAmount(value.offerQuantity);

  if (!groupId || !offerId || !offerLabel || offerQuantity <= 0) {
    return undefined;
  }

  return {
    groupId,
    offerId,
    offerLabel,
    offerQuantity,
    slotIndex:
      value.slotIndex !== undefined
        ? normalizeAmount(value.slotIndex)
        : undefined,
    freeShipping:
      typeof value.freeShipping === "boolean" ? value.freeShipping : undefined,
  };
};

const resolveRecentPurchaseTrackingKey = (companyId?: string | null): string => {
  const normalizedCompanyId = normalizeText(companyId);
  return normalizedCompanyId
    ? `${PURCHASE_TRACKING_PREFIX}recent:${encodeURIComponent(normalizedCompanyId)}`
    : RECENT_PURCHASE_TRACKING_KEY;
};

const resolvePurchaseTrackingKey = (
  orderNumber: string,
  companyId?: string | null,
): string => {
  const normalizedOrderNumber = encodeURIComponent(normalizeText(orderNumber));
  const normalizedCompanyId = normalizeText(companyId);
  const baseKey = `${PURCHASE_TRACKING_PREFIX}${normalizedOrderNumber}`;
  return normalizedCompanyId
    ? `${baseKey}:${encodeURIComponent(normalizedCompanyId)}`
    : baseKey;
};

const purchaseTrackingKey = (orderNumber: string): string =>
  `${PURCHASE_TRACKING_PREFIX}${encodeURIComponent(orderNumber)}`;

const normalizePurchaseTracking = (
  raw: unknown,
): StorefrontPurchaseTrackingState | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const orderNumber = normalizeText(raw.orderNumber);
  const total = normalizeAmount(raw.total);
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items = rawItems
    .map((item): StorefrontPurchaseTrackingItem | null => {
      if (!isRecord(item)) {
        return null;
      }

      const id = normalizeText(item.id || item.productId);
      const quantity = Math.max(1, Math.floor(normalizeAmount(item.quantity)));
      const price = normalizeAmount(item.price);

      if (!id || quantity <= 0) {
        return null;
      }

      return {
        id,
        productId: normalizeText(item.productId) || undefined,
        variantId: normalizeText(item.variantId) || undefined,
        name: normalizeText(item.name) || undefined,
        quantity,
        price,
        imageUrl: normalizeText(item.imageUrl) || undefined,
        attributes: isRecord(item.attributes)
          ? Object.fromEntries(
              Object.entries(item.attributes)
                .map(([key, value]) => [normalizeText(key), normalizeText(value)])
                .filter(([key, value]) => key && value),
            )
          : undefined,
        metadata: item.metadata,
        quantityOffer: normalizeQuantityOffer(item.quantityOffer),
      };
    })
    .filter((item): item is StorefrontPurchaseTrackingItem => Boolean(item));

  if (!orderNumber || items.length === 0) {
    return null;
  }

  return {
    eventId: normalizeText(raw.eventId) || undefined,
    orderNumber,
    companyId: normalizeText(raw.companyId) || undefined,
    total,
    storePromotionDiscount:
      raw.storePromotionDiscount !== undefined
        ? normalizeAmount(raw.storePromotionDiscount)
        : undefined,
    storePromotionLabel: normalizeText(raw.storePromotionLabel) || undefined,
    phone: normalizeText(raw.phone) || undefined,
    customerName: normalizeText(raw.customerName) || undefined,
    paymentMethod: normalizeText(raw.paymentMethod) || undefined,
    items,
  };
};

const readStoredPurchaseTracking = (
  storageKey: string,
): StoredPurchaseTrackingState | null => {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredPurchaseTrackingState>;
    const normalized = normalizePurchaseTracking(parsed);
    const savedAt = Number(parsed.savedAt);

    if (!normalized || !Number.isFinite(savedAt)) {
      storage.removeItem(storageKey);
      return null;
    }

    if (Date.now() - savedAt > PURCHASE_TRACKING_TTL_MS) {
      storage.removeItem(storageKey);
      return null;
    }

    return { ...normalized, savedAt };
  } catch {
    storage.removeItem(storageKey);
    return null;
  }
};

export const persistPurchaseTracking = (
  tracking: StorefrontPurchaseTrackingState,
  companyIdOverride?: string | null,
): StorefrontPurchaseTrackingState | null => {
  const resolvedCompanyId = normalizeText(companyIdOverride || tracking.companyId);
  const normalized = normalizePurchaseTracking({
    ...tracking,
    ...(resolvedCompanyId ? { companyId: resolvedCompanyId } : {}),
  });
  const storage = getSessionStorage();
  if (!normalized || !storage) {
    return normalized;
  }

  const stored: StoredPurchaseTrackingState = {
    ...normalized,
    savedAt: Date.now(),
  };
  const serialized = JSON.stringify(stored);

  try {
    if (resolvedCompanyId) {
      storage.setItem(
        resolvePurchaseTrackingKey(normalized.orderNumber, resolvedCompanyId),
        serialized,
      );
      storage.setItem(
        resolveRecentPurchaseTrackingKey(resolvedCompanyId),
        serialized,
      );
    }
    // Also save base unscoped keys for backward compatibility or when companyId is unspecified
    storage.setItem(purchaseTrackingKey(normalized.orderNumber), serialized);
    storage.setItem(RECENT_PURCHASE_TRACKING_KEY, serialized);
  } catch {
    // The checkout must keep working in restricted storage contexts.
  }

  return normalized;
};

export const getStoredPurchaseTracking = (
  orderNumber?: string | null,
  companyId?: string | null,
): StorefrontPurchaseTrackingState | null => {
  const normalizedOrderNumber = normalizeText(orderNumber);
  const normalizedCompanyId = normalizeText(companyId);

  let stored: StoredPurchaseTrackingState | null = null;

  // 1. Try reading from tenant-scoped key first if companyId is provided
  if (normalizedCompanyId) {
    const scopedKey = normalizedOrderNumber
      ? resolvePurchaseTrackingKey(normalizedOrderNumber, normalizedCompanyId)
      : resolveRecentPurchaseTrackingKey(normalizedCompanyId);
    stored = readStoredPurchaseTracking(scopedKey);
  }

  // 2. Fall back to unscoped key if not found in scoped storage
  if (!stored) {
    const unscopedKey = normalizedOrderNumber
      ? purchaseTrackingKey(normalizedOrderNumber)
      : RECENT_PURCHASE_TRACKING_KEY;
    const candidate = readStoredPurchaseTracking(unscopedKey);

    // If companyId is specified and candidate has a companyId that does NOT match, reject it (anti-leak)
    if (candidate) {
      if (
        normalizedCompanyId &&
        candidate.companyId &&
        candidate.companyId.toLowerCase() !== normalizedCompanyId.toLowerCase()
      ) {
        stored = null;
      } else {
        stored = candidate;
      }
    }
  }

  if (!stored) {
    return null;
  }

  if (
    normalizedOrderNumber &&
    stored.orderNumber.toLowerCase() !== normalizedOrderNumber.toLowerCase()
  ) {
    return null;
  }

  const { savedAt: _savedAt, ...tracking } = stored;
  return tracking;
};

export const clearStoredPurchaseTracking = (
  orderNumber?: string | null,
  companyId?: string | null,
) => {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  const normalizedOrderNumber = normalizeText(orderNumber);
  const normalizedCompanyId = normalizeText(companyId);

  try {
    if (normalizedOrderNumber) {
      storage.removeItem(purchaseTrackingKey(normalizedOrderNumber));
      if (normalizedCompanyId) {
        storage.removeItem(
          resolvePurchaseTrackingKey(normalizedOrderNumber, normalizedCompanyId),
        );
      }
    }
    storage.removeItem(RECENT_PURCHASE_TRACKING_KEY);
    if (normalizedCompanyId) {
      storage.removeItem(resolveRecentPurchaseTrackingKey(normalizedCompanyId));
    }
  } catch {
    // Ignore storage failures.
  }
};

const purchaseTrackedKey = (
  tracking: PurchaseTrackingIdentity,
  companyIdOverride?: string | null,
): string | null => {
  const identity = normalizeText(tracking.orderNumber || tracking.eventId);
  const companyId = normalizeText(companyIdOverride || tracking.companyId);
  if (!identity) {
    return null;
  }
  const baseKey = `${PURCHASE_TRACKED_PREFIX}${encodeURIComponent(identity)}`;
  return companyId ? `${baseKey}:${encodeURIComponent(companyId)}` : baseKey;
};

export const hasMarkedPurchaseTracked = (
  tracking: PurchaseTrackingIdentity,
  companyId?: string | null,
): boolean => {
  const storage = getLocalStorage();
  const key = purchaseTrackedKey(tracking, companyId);
  if (!storage || !key) {
    return false;
  }

  try {
    const raw = storage.getItem(key);
    if (raw) {
      const trackedAt = Number(raw);
      if (!Number.isFinite(trackedAt)) {
        storage.removeItem(key);
      } else if (Date.now() - trackedAt <= PURCHASE_TRACKED_TTL_MS) {
        return true;
      } else {
        storage.removeItem(key);
      }
    }

    // Also check unscoped key if scoped was not found
    const unscopedKey = purchaseTrackedKey(tracking);
    if (unscopedKey && unscopedKey !== key) {
      const unscopedRaw = storage.getItem(unscopedKey);
      if (unscopedRaw) {
        const trackedAt = Number(unscopedRaw);
        if (Number.isFinite(trackedAt) && Date.now() - trackedAt <= PURCHASE_TRACKED_TTL_MS) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
};

export const markPurchaseTracked = (
  tracking: PurchaseTrackingIdentity,
  companyId?: string | null,
) => {
  const storage = getLocalStorage();
  const key = purchaseTrackedKey(tracking, companyId);
  if (!storage || !key) {
    return;
  }

  try {
    const now = String(Date.now());
    storage.setItem(key, now);
    const unscopedKey = purchaseTrackedKey(tracking);
    if (unscopedKey && unscopedKey !== key) {
      storage.setItem(unscopedKey, now);
    }
  } catch {
    // Ignore storage failures.
  }
};
