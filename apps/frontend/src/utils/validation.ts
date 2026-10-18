/**
 * Validation Utilities
 * Simple validation for WooCommerce import/export operations
 */
import { isProduction } from "../config/environment";

type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      errors: Record<string, string>;
    };

type SyncDirection = "import_only" | "export_only" | "both";
type ImportLimit = "10" | "50" | "100" | "all";
type BatchSize = "50" | "100";
type DuplicateAction = "skip" | "update";

interface WooSettingsInput {
  storeUrl?: unknown;
  consumerKey?: unknown;
  consumerSecret?: unknown;
  syncEnabled?: unknown;
  syncDirection?: unknown;
  syncInterval?: unknown;
  webhookEnabled?: unknown;
  statusMapping?: unknown;
}

interface ImportOptionsInput {
  limit?: unknown;
  status?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
  batchSize?: unknown;
  duplicateAction?: unknown;
}

interface BillingInput {
  email?: unknown;
}

interface WooOrderLineItemInput {
  id?: unknown;
  product_id?: unknown;
  name?: unknown;
  quantity?: unknown;
  price?: unknown;
}

interface WooOrderInput {
  id?: unknown;
  total?: unknown;
  currency?: unknown;
  customer_email?: unknown;
  billing?: unknown;
  line_items?: unknown;
  orderNumber?: unknown;
  number?: unknown;
  status?: unknown;
}

interface OrderItemInput {
  productName?: unknown;
  name?: unknown;
  price?: unknown;
  quantity?: unknown;
}

const SYNC_DIRECTIONS = ["import_only", "export_only", "both"] as const;
const IMPORT_LIMITS = ["10", "50", "100", "all"] as const;
const BATCH_SIZES = ["50", "100"] as const;
const DUPLICATE_ACTIONS = ["skip", "update"] as const;

const asObject = <T extends object>(value: unknown): Partial<T> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Partial<T>;
};

const isOneOf = <T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] => typeof value === "string" && values.includes(value);

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const asStringRecord = (value: unknown): Record<string, string> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate WooCommerce settings
 */
export function validateSettings(data: unknown): ValidationResult<{
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  syncEnabled: boolean;
  syncDirection: SyncDirection;
  syncInterval: number;
  webhookEnabled: boolean;
  statusMapping?: Record<string, string>;
}> {
  const errors: Record<string, string> = {};
  const obj = asObject<WooSettingsInput>(data);

  const storeUrlValue = obj.storeUrl;
  const consumerKeyValue = obj.consumerKey;
  const consumerSecretValue = obj.consumerSecret;

  let storeUrl = "";
  if (typeof storeUrlValue !== "string" || storeUrlValue.trim().length === 0) {
    errors["storeUrl"] = "رابط المتجر مطلوب";
  } else if (!isValidUrl(storeUrlValue)) {
    errors["storeUrl"] = "يرجى إدخال رابط متجر صالح";
  } else {
    storeUrl = storeUrlValue.replace(/\/+$/, "");
  }

  let consumerKey = "";
  if (
    typeof consumerKeyValue !== "string" ||
    consumerKeyValue.trim().length === 0
  ) {
    errors["consumerKey"] = "مفتاح العميل مطلوب";
  } else if (!consumerKeyValue.startsWith("ck_")) {
    errors["consumerKey"] = "مفتاح العميل يجب أن يبدأ بـ ck_";
  } else {
    consumerKey = consumerKeyValue;
  }

  let consumerSecret = "";
  if (
    typeof consumerSecretValue !== "string" ||
    consumerSecretValue.trim().length === 0
  ) {
    errors["consumerSecret"] = "الرمز السري مطلوب";
  } else if (!consumerSecretValue.startsWith("cs_")) {
    errors["consumerSecret"] = "الرمز السري يجب أن يبدأ بـ cs_";
  } else {
    consumerSecret = consumerSecretValue;
  }

  const syncEnabled = Boolean(obj.syncEnabled);
  const syncDirection = isOneOf(SYNC_DIRECTIONS, obj.syncDirection)
    ? obj.syncDirection
    : "both";
  const syncInterval = Number(obj.syncInterval);
  const webhookEnabled = Boolean(obj.webhookEnabled);
  const statusMapping = asStringRecord(obj.statusMapping);

  if (Number.isNaN(syncInterval) || syncInterval < 5 || syncInterval > 1440) {
    errors["syncInterval"] = "الفاصل الزمني يجب أن يكون بين 5 و 1440 دقيقة";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      storeUrl,
      consumerKey,
      consumerSecret,
      syncEnabled,
      syncDirection,
      syncInterval,
      webhookEnabled,
      statusMapping,
    },
  };
}

/**
 * Validate import options
 */
export function validateImportOptions(data: unknown): ValidationResult<{
  limit: ImportLimit;
  status: string;
  dateFrom: string;
  dateTo: string;
  batchSize: BatchSize;
  duplicateAction: DuplicateAction;
}> {
  const errors: Record<string, string> = {};
  const obj = asObject<ImportOptionsInput>(data);

  const limit = isOneOf(IMPORT_LIMITS, obj.limit) ? obj.limit : "100";
  const batchSize = isOneOf(BATCH_SIZES, obj.batchSize)
    ? obj.batchSize
    : "100";
  const duplicateAction = isOneOf(DUPLICATE_ACTIONS, obj.duplicateAction)
    ? obj.duplicateAction
    : "skip";
  const status = obj.status ? String(obj.status) : "any";
  const dateFrom = obj.dateFrom ? String(obj.dateFrom) : "";
  const dateTo = obj.dateTo ? String(obj.dateTo) : "";

  if (dateFrom && dateTo) {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    if (fromDate >= toDate) {
      errors["dateTo"] = "تاريخ النهاية يجب أن يكون بعد تاريخ البداية";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: { limit, status, dateFrom, dateTo, batchSize, duplicateAction },
  };
}

/**
 * Validate WooCommerce order
 */
export function validateOrder(data: unknown): ValidationResult<{
  id: number;
  wooCommerceId: string;
  orderNumber: string;
  status: string;
  currency: string;
  total: number;
  customerEmail?: string;
  lineItems?: Array<{
    id: number;
    productId: number;
    name: string;
    quantity: number;
    price: number;
  }>;
}> {
  const errors: Record<string, string> = {};
  const obj = asObject<WooOrderInput>(data);

  const id = typeof obj.id === "number" ? obj.id : Number.NaN;
  if (!Number.isFinite(id)) {
    errors["id"] = "معرف الطلب مطلوب";
  }

  const total = typeof obj.total === "number" ? obj.total : Number.NaN;
  if (!Number.isFinite(total) || total < 0) {
    errors["total"] = "إجمالي الطلب يجب أن يكون رقماً";
  }

  const currency = asNonEmptyString(obj.currency) ?? "USD";
  const billing = asObject<BillingInput>(obj.billing);
  const customerEmailValue = obj.customer_email ?? billing.email;
  const customerEmail = customerEmailValue
    ? String(customerEmailValue)
    : undefined;

  if (customerEmail && !isValidEmail(customerEmail)) {
    errors["customerEmail"] = "بريد العميل غير صالح";
  }

  let lineItems:
    | Array<{
        id: number;
        productId: number;
        name: string;
        quantity: number;
        price: number;
      }>
    | undefined;

  if (Array.isArray(obj.line_items)) {
    lineItems = obj.line_items.map((rawItem, index) => {
      const item = asObject<WooOrderLineItemInput>(rawItem);
      const itemId = typeof item.id === "number" ? item.id : 0;
      const productId = typeof item.product_id === "number" ? item.product_id : 0;
      const name = item.name ? String(item.name) : "";
      const quantity = typeof item.quantity === "number" ? item.quantity : 0;
      const price = Number(item.price) || 0;

      if (typeof item.id !== "number") {
        errors[`items.${index}.id`] = "معرف المنتج مطلوب";
      }
      if (typeof item.product_id !== "number") {
        errors[`items.${index}.productId`] = "معرف المنتج مطلوب";
      }
      if (!name) {
        errors[`items.${index}.name`] = "اسم المنتج مطلوب";
      }
      if (!Number.isFinite(quantity) || quantity < 1) {
        errors[`items.${index}.quantity`] = "الكمية يجب أن تكون 1 أو أكثر";
      }

      return {
        id: itemId,
        productId,
        name,
        quantity,
        price,
      };
    });
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const orderNumberValue = obj.orderNumber ?? obj.number;
  const orderNumber =
    orderNumberValue !== undefined && orderNumberValue !== null
      ? String(orderNumberValue)
      : `WOO-${id}`;
  const status = asNonEmptyString(obj.status) ?? "pending";

  return {
    success: true,
    data: {
      id,
      wooCommerceId: String(id),
      orderNumber,
      status,
      currency,
      total,
      customerEmail,
      lineItems,
    },
  };
}

/**
 * Sanitize object - remove undefined/null/empty values
 */
export function sanitize<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== "") {
      if (typeof value === "object" && !Array.isArray(value)) {
        const nested = sanitize(value as Record<string, unknown>);
        if (Object.keys(nested).length > 0) {
          sanitized[key as keyof T] = nested as T[keyof T];
        }
      } else {
        sanitized[key as keyof T] = value as T[keyof T];
      }
    }
  }

  return sanitized;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(
  errors: Record<string, string>,
): string[] {
  const fieldLabels: Record<string, string> = {
    storeUrl: "رابط المتجر",
    consumerKey: "مفتاح العميل",
    consumerSecret: "الرمز السري",
    syncInterval: "الفاصل الزمني",
    batchSize: "حجم الدفعة",
    duplicateAction: "إجراء التكرار",
    status: "الحالة",
    dateFrom: "من تاريخ",
    dateTo: "إلى تاريخ",
    customerEmail: "بريد العميل",
    total: "إجمالي الطلب",
    line_items: "عناصر الطلب",
  };

  return Object.entries(errors).map(([field, message]) => {
    const label = fieldLabels[field] || field;
    return `${label}: ${message}`;
  });
}

/**
 * Validate webhook URL
 */
export function validateWebhookUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;

  if (isProduction() && !url.startsWith("https://")) {
    return false;
  }

  return true;
}

/**
 * Validate batch size
 */
export function validateBatchSize(size: number): {
  valid: boolean;
  message?: string;
} {
  if (Number.isNaN(size) || size < 10) {
    return { valid: false, message: "حجم الدفعة يجب أن يكون 10 على الأقل" };
  }
  if (size > 100) {
    return { valid: false, message: "حجم الدفعة يجب أن يكون 100 على الأكثر" };
  }
  return { valid: true };
}

/**
 * Validate sync direction
 */
export function validateSyncDirection(direction: string): {
  valid: boolean;
  value?: SyncDirection;
} {
  if (isOneOf(SYNC_DIRECTIONS, direction)) {
    return {
      valid: true,
      value: direction,
    };
  }

  return { valid: false };
}

/**
 * Validate price
 */
export function validatePrice(price: number): {
  isValid: boolean;
  error?: string;
} {
  if (Number.isNaN(price) || price < 0) {
    return { isValid: false, error: "السعر يجب أن يكون رقماً موجباً" };
  }
  if (price > 1000000) {
    return { isValid: false, error: "السعر يبدو غير منطقي" };
  }
  return { isValid: true };
}

/**
 * Validate quantity
 */
export function validateQuantity(quantity: number): {
  isValid: boolean;
  error?: string;
} {
  if (Number.isNaN(quantity) || quantity < 1) {
    return { isValid: false, error: "الكمية يجب أن تكون 1 على الأقل" };
  }
  if (quantity > 10000) {
    return { isValid: false, error: "الكمية كبيرة جداً" };
  }
  return { isValid: true };
}

/**
 * Validate customer name
 */
export function validateCustomerName(name: string): {
  isValid: boolean;
  error?: string;
} {
  if (!name || name.trim().length < 2) {
    return { isValid: false, error: "اسم العميل يجب أن يكون حرفين على الأقل" };
  }
  return { isValid: true };
}

/**
 * Validate order items
 */
export function validateOrderItems(
  items: Array<OrderItemInput> | null | undefined,
): {
  isValid: boolean;
  error?: string;
} {
  if (!items || items.length === 0) {
    return {
      isValid: false,
      error: "الطلب يجب أن يحتوي على منتج واحد على الأقل",
    };
  }

  for (const item of items) {
    const nameValue = item.productName ?? item.name;
    const name = nameValue ? String(nameValue) : "";
    const price = Number(item.price);
    const quantity = Number(item.quantity);

    if (!name) {
      return { isValid: false, error: "اسم المنتج مطلوب لجميع العناصر" };
    }
    if (!Number.isFinite(price) || price < 0) {
      return { isValid: false, error: `سعر المنتج "${name}" غير صحيح` };
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      return {
        isValid: false,
        error: `كمية المنتج "${name}" يجب أن تكون 1 على الأقل`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Convert Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) digits to standard ASCII digits (0-9).
 */
export function toStandardDigits(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .trim();
}

/**
 * Validate Egyptian phone number (supporting local, international, Arabic digits, & hidden formatting characters)
 */
export function validateEgyptianPhone(phone: string): {
  isValid: boolean;
  error?: string;
} {
  if (!phone) return { isValid: true };

  // Convert Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) digits to ASCII (0-9)
  const ascii = toStandardDigits(phone);

  // Strip all non-digits except optional leading '+'
  const hasPlus = ascii.startsWith("+");
  const digits = ascii.replace(/\D/g, "");
  if (!digits) {
    return {
      isValid: false,
      error: "رقم الهاتف غير صحيح",
    };
  }

  // Normalize Egyptian format (+20, 0020, 20 prefix to 01...)
  let normalized = digits;
  if (normalized.startsWith("0020")) {
    normalized = "0" + normalized.slice(4);
  } else if (normalized.startsWith("2001") && normalized.length === 13) {
    normalized = "0" + normalized.slice(3);
  } else if (normalized.startsWith("201") && normalized.length === 12) {
    normalized = "0" + normalized.slice(2);
  }

  // Check Egyptian mobile pattern: 01 followed by 9 digits (11 digits total)
  const isEgyptian = /^01[0-9]{9}$/.test(normalized);
  if (isEgyptian) {
    return { isValid: true };
  }

  // General E.164 international phone format (+ or 00 followed by 8-15 digits)
  if (hasPlus && /^\+[1-9]\d{7,14}$/.test(`+${digits}`)) {
    return { isValid: true };
  }
  if (digits.startsWith("00") && /^00[1-9]\d{7,14}$/.test(digits)) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: "رقم الهاتف يجب أن يكون 11 رقم ويبدأ بـ 01",
  };
}
