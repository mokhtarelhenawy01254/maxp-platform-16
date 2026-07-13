import { getMarketplacePreviewCartItems } from "./marketplacePreviewCart";
import {
  getMarketplacePreviewThemeDisplayName,
  resolveMarketplacePreviewThemeId,
} from "./marketplaceSampleData";
import { ELESSI_PACK_ORDER_PROFILES } from "./elessiPackMarketplaceData";
import { buildCartItemId } from "../store/useCartStore";

type PreviewOrderProfile = {
  orderNumber: string;
  phone: string;
  customerName: string;
  paymentMethod: "cod" | "card" | "wallet";
  status: string;
  shippingAddress: {
    governorate: string;
    city: string;
    street: string;
    address: string;
    addressLine1: string;
  };
};

type PreviewTrackedOrderItem = {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  attributes?: Record<string, string>;
  quantityOffer?: Record<string, unknown>;
};

type StoredPreviewOrder = {
  eventId: string;
  orderNumber: string;
  status: string;
  paymentMethod: "cod" | "card" | "wallet";
  total: number;
  finalTotal: number;
  subtotal: number;
  shippingCost: number;
  phone: string;
  customerName: string;
  shippingAddress: PreviewOrderProfile["shippingAddress"];
  items: PreviewTrackedOrderItem[];
};

const MARKETPLACE_PREVIEW_ORDER_STORAGE_PREFIX = "sf-marketplace-preview-order";
const MARKETPLACE_PREVIEW_ORDER_LATEST_SUFFIX = "latest";
const PREVIEW_ORDER_STATUSES = new Set([
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

const hasWindow = typeof window !== "undefined";

const getSearchParam = (key: string) => {
  if (!hasWindow) {
    return "";
  }

  try {
    return new URLSearchParams(window.location.search).get(key) || "";
  } catch {
    return "";
  }
};

const normalizePreviewOrderStatus = (value: unknown, fallback = "PROCESSING") => {
  const normalized = String(value || "").trim().toUpperCase();
  if (PREVIEW_ORDER_STATUSES.has(normalized)) {
    return normalized;
  }

  return fallback;
};

const getPreviewOrderStorageKey = (previewThemeId: string, orderNumber: string) =>
  `${MARKETPLACE_PREVIEW_ORDER_STORAGE_PREFIX}:${previewThemeId}:${orderNumber}`;

const getLatestPreviewOrderStorageKey = (previewThemeId: string) =>
  `${MARKETPLACE_PREVIEW_ORDER_STORAGE_PREFIX}:${previewThemeId}:${MARKETPLACE_PREVIEW_ORDER_LATEST_SUFFIX}`;

const readPreviewOrderStorageEntry = (
  storage: Storage | undefined,
  storageKey: string,
): StoredPreviewOrder | null => {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredPreviewOrder;
  } catch {
    return null;
  }
};

const readStoredPreviewOrder = (
  previewThemeId: string,
  orderNumber?: string | null,
): StoredPreviewOrder | null => {
  if (!hasWindow || !previewThemeId) {
    return null;
  }

  const storageKey = orderNumber
    ? getPreviewOrderStorageKey(previewThemeId, orderNumber)
    : getLatestPreviewOrderStorageKey(previewThemeId);

  const sessionOrder = readPreviewOrderStorageEntry(window.sessionStorage, storageKey);
  if (sessionOrder) {
    return sessionOrder;
  }

  return orderNumber
    ? readPreviewOrderStorageEntry(window.localStorage, storageKey)
    : null;
};

const persistPreviewOrder = (previewThemeId: string, order: StoredPreviewOrder) => {
  if (!hasWindow || !previewThemeId) {
    return;
  }

  try {
    const serialized = JSON.stringify(order);
    const orderStorageKey = getPreviewOrderStorageKey(previewThemeId, order.orderNumber);
    const latestStorageKey = getLatestPreviewOrderStorageKey(previewThemeId);

    window.sessionStorage.setItem(orderStorageKey, serialized);
    window.sessionStorage.setItem(latestStorageKey, serialized);
    window.localStorage.setItem(orderStorageKey, serialized);
    window.localStorage.setItem(latestStorageKey, serialized);
  } catch {
    // Ignore preview storage errors in restricted browsing contexts.
  }
};

const resolvePreviewOrderNumber = (
  previewThemeId: string,
  explicitOrderNumber?: string | null,
) => {
  const orderNumberFromQuery = explicitOrderNumber || getSearchParam("orderId");
  if (orderNumberFromQuery) {
    return orderNumberFromQuery;
  }

  const latestStoredOrder = readStoredPreviewOrder(previewThemeId);
  return latestStoredOrder?.orderNumber || "";
};

const buildPreviewOrderNumber = (baseOrderNumber: string) => {
  const basePrefix = String(baseOrderNumber || "PRV-2048")
    .split("-")[0]
    ?.trim() || "PRV";
  const timestampPart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(10 + Math.random() * 90).toString();
  return `${basePrefix}-${timestampPart}${randomPart}`;
};

const previewOrderProfilesByTheme: Record<string, PreviewOrderProfile> = {
  "cafe-demo": {
    orderNumber: "MUT-2048",
    phone: "01077770002",
    customerName: "عميل Müt Coffee",
    paymentMethod: "card",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "الزمالك",
      street: "شارع 26 يوليو 18",
      address: "شارع 26 يوليو 18، الزمالك، القاهرة",
      addressLine1: "شارع 26 يوليو 18",
    },
  },
  "restaurant-demo": {
    orderNumber: "BR-2048",
    phone: "01090000001",
    customerName: "عميل BiteRush",
    paymentMethod: "cod",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "مدينة نصر",
      street: "شارع المكرونة 12",
      address: "شارع المكرونة 12، مدينة نصر، القاهرة",
      addressLine1: "شارع المكرونة 12",
    },
  },
  "max-care-go": {
    orderNumber: "MCG-2048",
    phone: "01055550001",
    customerName: "عميل Max Care Go",
    paymentMethod: "wallet",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "التجمع",
      street: "محور التسعين 18",
      address: "محور التسعين 18، التجمع، القاهرة",
      addressLine1: "محور التسعين 18",
    },
  },
  "district-market": {
    orderNumber: "DM-2048",
    phone: "01088880024",
    customerName: "عميل ديستركت ماركت",
    paymentMethod: "cod",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "مصر الجديدة",
      street: "شارع عثمان بن عفان 21",
      address: "شارع عثمان بن عفان 21، مصر الجديدة، القاهرة",
      addressLine1: "شارع عثمان بن عفان 21",
    },
  },
  "men-shoes-eg": {
    orderNumber: "KH-2048",
    phone: "01044440024",
    customerName: "عميل خطوة",
    paymentMethod: "cod",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "مدينة نصر",
      street: "شارع عباس العقاد 24",
      address: "شارع عباس العقاد 24، مدينة نصر، القاهرة",
      addressLine1: "شارع عباس العقاد 24",
    },
  },
  "closet-os": {
    orderNumber: "CO-2048",
    phone: "01033330024",
    customerName: "عميل كلوزت أو إس",
    paymentMethod: "card",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "المعادي",
      street: "شارع 9 المعادي 18",
      address: "شارع 9 المعادي 18، المعادي، القاهرة",
      addressLine1: "شارع 9 المعادي 18",
    },
  },
  "women-fashion-eg": {
    orderNumber: "ET-2048",
    phone: "01033330025",
    customerName: "عميلة إطلالة",
    paymentMethod: "cod",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "مدينة نصر",
      street: "شارع أحمد فخري 22",
      address: "شارع أحمد فخري 22، مدينة نصر، القاهرة",
      addressLine1: "شارع أحمد فخري 22",
    },
  },
  "solea-femme": {
    orderNumber: "SF-2048",
    phone: "01077770031",
    customerName: "عميلة Solea Femme",
    paymentMethod: "cod",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "الزمالك",
      street: "شارع البرازيل 16",
      address: "شارع البرازيل 16، الزمالك، القاهرة",
      addressLine1: "شارع البرازيل 16",
    },
  },
  "perfume-eg": {
    orderNumber: "AT-2048",
    phone: "01022220026",
    customerName: "عميلة أثر",
    paymentMethod: "cod",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "المعادي",
      street: "شارع 9 المعادي 28",
      address: "شارع 9 المعادي 28، المعادي، القاهرة",
      addressLine1: "شارع 9 المعادي 28",
    },
  },
  "elegant-luxe": {
    orderNumber: "ELE-2048",
    phone: "01011112222",
    customerName: "عميلة Elegant Luxe",
    paymentMethod: "cod",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "مدينة نصر",
      street: "شارع التسعين 18",
      address: "شارع التسعين 18، مدينة نصر، القاهرة",
      addressLine1: "شارع التسعين 18",
    },
  },
  "kids-play": {
    orderNumber: "KP-2048",
    phone: "01066660024",
    customerName: "عميلة كيدز بلاي",
    paymentMethod: "cod",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "مصر الجديدة",
      street: "شارع الميرغني 33",
      address: "شارع الميرغني 33، مصر الجديدة، القاهرة",
      addressLine1: "شارع الميرغني 33",
    },
  },
  "pc-hub-eg": {
    orderNumber: "PCH-2048",
    phone: "01022220026",
    customerName: "عميل بي سي هب",
    paymentMethod: "card",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "مدينة نصر",
      street: "شارع مصطفى النحاس 28",
      address: "شارع مصطفى النحاس 28، مدينة نصر، القاهرة",
      addressLine1: "شارع مصطفى النحاس 28",
    },
  },
  "rose-boutique-eg": {
    orderNumber: "RB-2048",
    phone: "01055550028",
    customerName: "عميلة روزا",
    paymentMethod: "cod",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "الزمالك",
      street: "شارع محمد مظهر 12",
      address: "شارع محمد مظهر 12، الزمالك، القاهرة",
      addressLine1: "شارع محمد مظهر 12"
    }
  },
  "fastly-eg": {
    orderNumber: "FAS-2048",
    phone: "0558000248",
    customerName: "عميل Fastly",
    paymentMethod: "cod",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "منطقة الرياض",
      city: "الرياض",
      street: "طريق الملك فهد 88",
      address: "طريق الملك فهد 88، الرياض، منطقة الرياض",
      addressLine1: "طريق الملك فهد 88"
    }
  },
  "vela-fashion-eg": {
    orderNumber: "VF-2048",
    phone: "01077770028",
    customerName: "عميلة فيلا",
    paymentMethod: "cod",
    status: "PROCESSING",
    shippingAddress: {
      governorate: "القاهرة",
      city: "التجمع الخامس",
      street: "شارع التسعين الشمالي 31",
      address: "شارع التسعين الشمالي 31، التجمع الخامس، القاهرة",
      addressLine1: "شارع التسعين الشمالي 31"
    }
  },
  ...ELESSI_PACK_ORDER_PROFILES,
};

const buildGeneratedPreviewOrderProfile = (
  previewThemeId: string,
): PreviewOrderProfile => ({
  orderNumber: `${previewThemeId.slice(0, 3).toUpperCase()}-2048`,
  phone: "01011112222",
  customerName: `عميل ${getMarketplacePreviewThemeDisplayName(previewThemeId)}`,
  paymentMethod: "cod",
  status: "PROCESSING",
  shippingAddress: {
    governorate: "القاهرة",
    city: "مدينة نصر",
    street: "شارع التسعين 18",
    address: "شارع التسعين 18، مدينة نصر، القاهرة",
    addressLine1: "شارع التسعين 18",
  },
});

export const getMarketplacePreviewPurchaseTracking = (
  previewThemeId = resolveMarketplacePreviewThemeId(),
) => {
  if (!previewThemeId) {
    return null;
  }

  const profile =
    previewOrderProfilesByTheme[previewThemeId] ||
    buildGeneratedPreviewOrderProfile(previewThemeId);
  if (!profile) {
    return null;
  }

  const resolvedOrderNumber = resolvePreviewOrderNumber(previewThemeId);
  const storedPreviewOrder = readStoredPreviewOrder(
    previewThemeId,
    resolvedOrderNumber || undefined,
  );
  if (storedPreviewOrder) {
    return {
      eventId: storedPreviewOrder.eventId,
      orderNumber: storedPreviewOrder.orderNumber,
      total: storedPreviewOrder.total,
      phone: storedPreviewOrder.phone,
      customerName: storedPreviewOrder.customerName,
      paymentMethod: storedPreviewOrder.paymentMethod,
      items: storedPreviewOrder.items.map((item) => ({
        ...item,
        variantId: item.variantId || undefined,
        imageUrl: item.imageUrl || undefined,
        attributes: item.attributes || {},
        quantityOffer: item.quantityOffer || undefined,
      })),
    };
  }

  const items = getMarketplacePreviewCartItems(previewThemeId);
  if (items.length === 0) {
    return null;
  }

  const total = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)),
    0,
  );

  return {
    eventId: `${previewThemeId}-preview-order`,
    orderNumber: profile.orderNumber,
    total,
    phone: profile.phone,
    customerName: profile.customerName,
    paymentMethod: profile.paymentMethod,
    items: items.map((item) => ({
      id: buildCartItemId(item),
      productId: item.productId,
      variantId: item.variantId || undefined,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      imageUrl: item.imageUrl,
      attributes: item.attributes || {},
      quantityOffer: item.quantityOffer || undefined,
    })),
  };
};

export const getMarketplacePreviewTrackedOrder = (
  previewThemeId = resolveMarketplacePreviewThemeId(),
) => {
  const profile = previewThemeId
    ? previewOrderProfilesByTheme[previewThemeId] ||
      buildGeneratedPreviewOrderProfile(previewThemeId)
    : null;
  const resolvedOrderNumber = previewThemeId
    ? resolvePreviewOrderNumber(previewThemeId)
    : "";
  const storedPreviewOrder =
    previewThemeId &&
    readStoredPreviewOrder(previewThemeId, resolvedOrderNumber || undefined);

  if (storedPreviewOrder) {
    const resolvedStatus = normalizePreviewOrderStatus(
      getSearchParam("previewOrderStatus"),
      normalizePreviewOrderStatus(storedPreviewOrder.status),
    );
    return {
      orderNumber: storedPreviewOrder.orderNumber,
      status: resolvedStatus,
      paymentMethod: storedPreviewOrder.paymentMethod,
      total: storedPreviewOrder.total,
      finalTotal: storedPreviewOrder.finalTotal,
      shippingAddress: storedPreviewOrder.shippingAddress,
      items: storedPreviewOrder.items,
    };
  }

  const purchaseTracking = getMarketplacePreviewPurchaseTracking(previewThemeId);

  if (!purchaseTracking || !profile) {
    return null;
  }

  const resolvedStatus = normalizePreviewOrderStatus(
    getSearchParam("previewOrderStatus"),
    normalizePreviewOrderStatus(profile.status),
  );

  return {
    orderNumber: profile.orderNumber,
    status: resolvedStatus,
    paymentMethod: profile.paymentMethod,
    total: purchaseTracking.total,
    finalTotal: purchaseTracking.total,
    shippingAddress: profile.shippingAddress,
    items: purchaseTracking.items,
  };
};

type PreviewOrderRequestPayload = {
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  paymentMethod?: "cod" | "card" | "wallet";
  notes?: string;
  shippingAddress?: {
    governorate?: string;
    city?: string;
    street?: string;
    address?: string;
    addressLine1?: string;
  };
  items?: Array<{
    id?: string;
    productId?: string;
    variantId?: string;
    name?: string;
    quantity?: number;
    price?: number;
    image?: string;
    productImage?: string;
    attributes?: Record<string, string>;
    quantityOffer?: Record<string, unknown>;
  }>;
  subtotal?: number;
  shippingCost?: number;
  total?: number;
};

const toPositiveAmount = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const normalizePreviewPhone = (value: unknown) =>
  String(value || "")
    .replace(/\s+/g, "")
    .trim();

export const trackMarketplacePreviewOrder = (
  orderNumber: string,
  phoneNumber: string,
  previewThemeId = resolveMarketplacePreviewThemeId(),
) => {
  const normalizedOrderNumber = String(orderNumber || "").trim();
  if (!previewThemeId || !normalizedOrderNumber) {
    return null;
  }

  const storedPreviewOrder = readStoredPreviewOrder(previewThemeId, normalizedOrderNumber);
  if (storedPreviewOrder) {
    if (
      normalizePreviewPhone(phoneNumber) !==
      normalizePreviewPhone(storedPreviewOrder.phone)
    ) {
      return {
        success: false,
        error: "PREVIEW_PHONE_MISMATCH",
        data: {
          expectedPhone: storedPreviewOrder.phone,
        },
      };
    }

    return {
      success: true,
      data: {
        orderNumber: storedPreviewOrder.orderNumber,
        status: normalizePreviewOrderStatus(storedPreviewOrder.status),
        paymentMethod: storedPreviewOrder.paymentMethod,
        total: storedPreviewOrder.total,
        finalTotal: storedPreviewOrder.finalTotal,
        shippingAddress: storedPreviewOrder.shippingAddress,
        items: storedPreviewOrder.items,
      },
    };
  }

  const previewPurchaseTracking = getMarketplacePreviewPurchaseTracking(previewThemeId);
  const previewTrackedOrder = getMarketplacePreviewTrackedOrder(previewThemeId);
  if (
    !previewPurchaseTracking ||
    !previewTrackedOrder ||
    previewTrackedOrder.orderNumber !== normalizedOrderNumber
  ) {
    return null;
  }

  if (
    normalizePreviewPhone(phoneNumber) !==
    normalizePreviewPhone(previewPurchaseTracking.phone)
  ) {
    return {
      success: false,
      error: "PREVIEW_PHONE_MISMATCH",
      data: {
        expectedPhone: previewPurchaseTracking.phone,
      },
    };
  }

  return {
    success: true,
    data: previewTrackedOrder,
  };
};

export const createMarketplacePreviewOrderResponse = (
  payload: PreviewOrderRequestPayload = {},
  previewThemeId = resolveMarketplacePreviewThemeId(),
) => {
  const profile = previewThemeId
    ? previewOrderProfilesByTheme[previewThemeId] ||
      buildGeneratedPreviewOrderProfile(previewThemeId)
    : null;
  if (!profile) {
    return null;
  }

  const purchaseTracking = getMarketplacePreviewPurchaseTracking(previewThemeId);
  const payloadItems =
    Array.isArray(payload.items) && payload.items.length > 0 ? payload.items : [];
  const fallbackItems = payloadItems.length > 0 ? payloadItems : purchaseTracking?.items || [];
  if (fallbackItems.length === 0) {
    return null;
  }

  const fallbackSubtotal =
    purchaseTracking?.total ||
    fallbackItems.reduce(
      (sum, item) =>
        sum + Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)),
      0,
    );
  const subtotal = toPositiveAmount(payload.subtotal, fallbackSubtotal);
  const shippingCost = toPositiveAmount(payload.shippingCost, 0);
  const total = toPositiveAmount(payload.total, subtotal + shippingCost);
  const orderNumber = buildPreviewOrderNumber(profile.orderNumber);

  const normalizedItems = fallbackItems.map((item) => {
    const productId = String(item.productId || "");
    const variantId = item.variantId || undefined;
    const attributes = item.attributes || {};

    return {
      id: buildCartItemId({
        id: "id" in item ? String(item.id || "") : "",
        productId,
        variantId,
        attributes,
      }),
      productId,
      variantId,
      name: String(item.name || ""),
      quantity: Math.max(1, Number(item.quantity || 1)),
      price: Number(item.price || 0),
      imageUrl: item.image || item.productImage || undefined,
      attributes,
      quantityOffer: item.quantityOffer,
    };
  });

  const storedOrder: StoredPreviewOrder = {
    eventId: `${previewThemeId}-${orderNumber}`,
    orderNumber,
    status: profile.status,
    paymentMethod: payload.paymentMethod || profile.paymentMethod,
    total,
    finalTotal: total,
    subtotal,
    shippingCost,
    phone: payload.guestPhone || profile.phone,
    customerName: payload.guestName || profile.customerName,
    shippingAddress: {
      governorate:
        payload.shippingAddress?.governorate || profile.shippingAddress.governorate,
      city: payload.shippingAddress?.city || profile.shippingAddress.city,
      street: payload.shippingAddress?.street || profile.shippingAddress.street,
      address: payload.shippingAddress?.address || profile.shippingAddress.address,
      addressLine1:
        payload.shippingAddress?.addressLine1 || profile.shippingAddress.addressLine1,
    },
    items: normalizedItems,
  };

  persistPreviewOrder(previewThemeId, storedOrder);

  return {
    success: true,
    message: "Preview order completed successfully.",
    data: {
      id: orderNumber,
      orderNumber,
      status: profile.status,
      paymentMethod: storedOrder.paymentMethod,
      guestName: storedOrder.customerName,
      guestEmail: payload.guestEmail || "",
      guestPhone: storedOrder.phone,
      shippingAddress: storedOrder.shippingAddress,
      notes: payload.notes || undefined,
      subtotal,
      shippingCost,
      total,
      finalTotal: total,
      items: normalizedItems,
      preview: true,
    },
  };
};
