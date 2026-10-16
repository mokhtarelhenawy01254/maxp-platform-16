/**
 * Curated public API catalog for the Developer Hub documentation.
 *
 * Only endpoints that are deliberately exposed on /api/v1/public/ext are
 * listed here
 * — internal/admin routes are never part of this catalog. The catalog feeds
 * three outputs: the in-app reference, the cURL samples, and the downloadable
 * Postman / OpenAPI documents.
 */
export interface DevApiParam {
  name: string;
  type: "string" | "number" | "boolean" | "date";
  required?: boolean;
  description_ar: string;
  description_en: string;
  example?: string;
}

export interface DevApiEndpoint {
  id: string;
  method: "GET" | "POST";
  path: string;
  scope: string;
  summary_ar: string;
  summary_en: string;
  description_ar: string;
  description_en: string;
  params?: DevApiParam[];
  responseExample: unknown;
}

export interface DevApiGroup {
  id: string;
  name_ar: string;
  name_en: string;
  endpoints: DevApiEndpoint[];
}

export const API_BASE_PATH = "/api/v1/public/ext";

/** Header name used across samples and exports (HTTP header names are case-insensitive). */
export const PRESENTED_HEADER = "authorization";

const paginationExample = { page: 1, limit: 20, total: 42, pages: 3 };

export const DEV_API_GROUPS: DevApiGroup[] = [
  {
    id: "connection",
    name_ar: "الاتصال",
    name_en: "Connection",
    endpoints: [
      {
        id: "me",
        method: "GET",
        path: "/me",
        scope: "",
        summary_ar: "بيانات المفتاح الحالي",
        summary_en: "Current key info",
        description_ar: "يعيد اسم المفتاح وصلاحياته وهوية الشركة — للتحقق من صحة الإعداد.",
        description_en: "Returns the key name, scopes and company identity — a quick setup check.",
        params: [],
        responseExample: {
          success: true,
          key: { id: "cm123…", name: "Postman", maskedKey: "mxp_live_a1b2c3d4••••••••", scopes: ["products:read"], rateLimitPerMin: 60 },
          companyId: "cm_company…",
        },
      },
    ],
  },
  {
    id: "products",
    name_ar: "المنتجات",
    name_en: "Products",
    endpoints: [
      {
        id: "products-list",
        method: "GET",
        path: "/products",
        scope: "products:read",
        summary_ar: "قائمة المنتجات",
        summary_en: "List products",
        description_ar: "قائمة منتجات الشركة مع بحث وترقيم صفحات.",
        description_en: "Company products with search and pagination.",
        params: [
          { name: "search", type: "string", description_ar: "بحث بالاسم أو الكود", description_en: "Search by name or SKU", example: "حذاء" },
          { name: "page", type: "number", description_ar: "رقم الصفحة (تبدأ من 1)", description_en: "Page number (starts at 1)", example: "1" },
          { name: "limit", type: "number", description_ar: "عدد النتائج بالصفحة (حتى 100)", description_en: "Page size (max 100)", example: "20" },
          { name: "active", type: "boolean", description_ar: "فلترة على المنتجات النشطة/المتوقفة", description_en: "Filter by active state", example: "true" },
        ],
        responseExample: {
          success: true,
          data: [{ id: "prod_1", name: "حذاء رياضي", sku: "SH-001", price: "799.00", stock: 12, isActive: true, mainImage: "https://…", categoryId: "cat_1", createdAt: "2026-09-01T10:00:00.000Z" }],
          pagination: paginationExample,
        },
      },
      {
        id: "products-get",
        method: "GET",
        path: "/products/{id}",
        scope: "products:read",
        summary_ar: "تفاصيل منتج",
        summary_en: "Product details",
        description_ar: "تفاصيل كاملة لمنتج واحد.",
        description_en: "Full details for a single product.",
        params: [
          { name: "id", type: "string", required: true, description_ar: "معرّف المنتج", description_en: "Product id", example: "prod_1" },
        ],
        responseExample: {
          success: true,
          data: { id: "prod_1", name: "حذاء رياضي", description: "…", sku: "SH-001", price: "799.00", stock: 12, isActive: true, images: "url1,url2", barcode: "6221031…", createdAt: "2026-09-01T10:00:00.000Z" },
        },
      },
    ],
  },
  {
    id: "inventory",
    name_ar: "المخزون",
    name_en: "Inventory",
    endpoints: [
      {
        id: "inventory-list",
        method: "GET",
        path: "/inventory",
        scope: "inventory:read",
        summary_ar: "مستويات المخزون",
        summary_en: "Stock levels",
        description_ar: "أرصدة المخزون مرتبة من الأقل للأعلى مع ملخص إجمالي.",
        description_en: "Stock levels sorted ascending with a totals summary.",
        params: [
          { name: "lowStock", type: "boolean", description_ar: "أرجع فقط الأصناف تحت الحد", description_en: "Only items under the threshold", example: "true" },
          { name: "lowStockThreshold", type: "number", description_ar: "حد المخزون المنخفض (افتراضي 5)", description_en: "Low-stock threshold (default 5)", example: "5" },
          { name: "page", type: "number", description_ar: "رقم الصفحة", description_en: "Page number", example: "1" },
          { name: "limit", type: "number", description_ar: "عدد النتائج بالصفحة", description_en: "Page size", example: "20" },
        ],
        responseExample: {
          success: true,
          data: [{ id: "prod_1", name: "حذاء رياضي", sku: "SH-001", stock: 2, isActive: true, trackInventory: true }],
          summary: { totalProducts: 42, totalStock: 310, lowStockThreshold: 5 },
          pagination: paginationExample,
        },
      },
    ],
  },
  {
    id: "orders",
    name_ar: "الطلبات",
    name_en: "Orders",
    endpoints: [
      {
        id: "orders-list",
        method: "GET",
        path: "/orders",
        scope: "orders:read",
        summary_ar: "قائمة الطلبات",
        summary_en: "List orders",
        description_ar: "طلبات الشركة مع فلترة بالحالة والتاريخ.",
        description_en: "Company orders with status and date filters.",
        params: [
          { name: "status", type: "string", description_ar: "حالة الطلب (مثال: PENDING)", description_en: "Order status (e.g. PENDING)", example: "PENDING" },
          { name: "paymentStatus", type: "string", description_ar: "حالة الدفع", description_en: "Payment status", example: "PAID" },
          { name: "from", type: "date", description_ar: "من تاريخ (ISO)", description_en: "From date (ISO)", example: "2026-09-01" },
          { name: "to", type: "date", description_ar: "إلى تاريخ (ISO)", description_en: "To date (ISO)", example: "2026-09-30" },
          { name: "page", type: "number", description_ar: "رقم الصفحة", description_en: "Page number", example: "1" },
          { name: "limit", type: "number", description_ar: "عدد النتائج بالصفحة", description_en: "Page size", example: "20" },
        ],
        responseExample: {
          success: true,
          data: [{ id: "ord_1", orderNumber: "1024", status: "PENDING", paymentStatus: "PENDING", total: "899.00", currency: "EGP", customerName: "أحمد محمد", city: "القاهرة", createdAt: "2026-10-01T09:00:00.000Z" }],
          pagination: paginationExample,
        },
      },
      {
        id: "orders-get",
        method: "GET",
        path: "/orders/{id}",
        scope: "orders:read",
        summary_ar: "تفاصيل طلب",
        summary_en: "Order details",
        description_ar: "بيانات الطلب مع بنود المنتجات.",
        description_en: "Order details including line items.",
        params: [
          { name: "id", type: "string", required: true, description_ar: "معرّف الطلب", description_en: "Order id", example: "ord_1" },
        ],
        responseExample: {
          success: true,
          data: { id: "ord_1", orderNumber: "1024", status: "PENDING", total: "899.00", currency: "EGP", customerName: "أحمد محمد", customerPhone: "010…", city: "القاهرة", items: [{ id: "item_1", productId: "prod_1", productName: "حذاء رياضي", quantity: 1, price: "799.00" }] },
        },
      },
    ],
  },
  {
    id: "customers",
    name_ar: "العملاء",
    name_en: "Customers",
    endpoints: [
      {
        id: "customers-list",
        method: "GET",
        path: "/customers",
        scope: "customers:read",
        summary_ar: "قائمة العملاء",
        summary_en: "List customers",
        description_ar: "عملاء الشركة مع بحث بالاسم أو الهاتف أو البريد.",
        description_en: "Company customers with name, phone or email search.",
        params: [
          { name: "search", type: "string", description_ar: "بحث بالاسم/الهاتف/البريد", description_en: "Search by name/phone/email", example: "أحمد" },
          { name: "status", type: "string", description_ar: "حالة العميل", description_en: "Customer status", example: "CUSTOMER" },
          { name: "page", type: "number", description_ar: "رقم الصفحة", description_en: "Page number", example: "1" },
          { name: "limit", type: "number", description_ar: "عدد النتائج بالصفحة", description_en: "Page size", example: "20" },
        ],
        responseExample: {
          success: true,
          data: [{ id: "cust_1", firstName: "أحمد", lastName: "محمد", email: "a@example.com", phone: "010…", status: "CUSTOMER", createdAt: "2026-08-01T10:00:00.000Z" }],
          pagination: paginationExample,
        },
      },
    ],
  },
  {
    id: "coupons",
    name_ar: "الكوبونات",
    name_en: "Coupons",
    endpoints: [
      {
        id: "coupons-list",
        method: "GET",
        path: "/coupons",
        scope: "coupons:read",
        summary_ar: "قائمة الكوبونات",
        summary_en: "List coupons",
        description_ar: "كوبونات الخصم مع صلاحيات الاستخدام.",
        description_en: "Discount coupons with usage limits.",
        params: [
          { name: "active", type: "boolean", description_ar: "الكوبونات النشطة فقط", description_en: "Active coupons only", example: "true" },
          { name: "page", type: "number", description_ar: "رقم الصفحة", description_en: "Page number", example: "1" },
          { name: "limit", type: "number", description_ar: "عدد النتائج بالصفحة", description_en: "Page size", example: "20" },
        ],
        responseExample: {
          success: true,
          data: [{ id: "cpn_1", code: "WELCOME10", name: "خصم ترحيبي", type: "PERCENTAGE", value: "10", usageLimit: 100, usageCount: 12, isActive: true, validFrom: "2026-09-01T00:00:00.000Z", validTo: "2026-12-31T23:59:59.000Z" }],
          pagination: paginationExample,
        },
      },
    ],
  },
  {
    id: "analytics",
    name_ar: "التحليلات",
    name_en: "Analytics",
    endpoints: [
      {
        id: "analytics-summary",
        method: "GET",
        path: "/analytics/summary",
        scope: "analytics:read",
        summary_ar: "ملخص الأداء",
        summary_en: "Performance summary",
        description_ar: "ملخص سريع: عدد الطلبات والإيرادات والمنتجات والعملاء.",
        description_en: "Quick summary: orders, revenue, active products and customers.",
        params: [
          { name: "days", type: "number", description_ar: "عدد الأيام (افتراضي 30)", description_en: "Window in days (default 30)", example: "30" },
        ],
        responseExample: {
          success: true,
          data: {
            windowDays: 30,
            orders: 128,
            revenue: "48250.00",
            activeProducts: 42,
            customers: 310,
            recentOrders: [{ id: "ord_1", orderNumber: "1024", total: "899.00", status: "PENDING", createdAt: "2026-10-01T09:00:00.000Z" }],
          },
        },
      },
    ],
  },
];

export const ALL_CATALOG_ENDPOINTS = DEV_API_GROUPS.flatMap((group) => group.endpoints);

export const findEndpoint = (id: string): DevApiEndpoint | undefined =>
  ALL_CATALOG_ENDPOINTS.find((endpoint) => endpoint.id === id);

export const requireEndpoint = (id: string): DevApiEndpoint => {
  const found = findEndpoint(id);
  if (found) return found;
  const fallback = ALL_CATALOG_ENDPOINTS[0];
  if (fallback) return fallback;
  throw new Error("API catalog is empty");
};

// ─── cURL ───────────────────────────────────────────────────────────────────
export const buildCurl = (endpoint: DevApiEndpoint, baseUrl: string, presentedKey: string): string => {
  const url = `${baseUrl}${API_BASE_PATH}${endpoint.path.replace("{id}", endpoint.params?.find((p) => p.required)?.example || "id")}`;
  const query = (endpoint.params || [])
    .filter((param) => !param.required && param.example)
    .map((param) => `${param.name}=${encodeURIComponent(param.example as string)}`)
    .join("&");
  const fullUrl = query ? `${url}?${query}` : url;
  const key = presentedKey || "YOUR_API_KEY";
  return [`curl -X ${endpoint.method} "${fullUrl}" \\`, `  -H "${PRESENTED_HEADER}: Bearer ${key}"`].join("\n");
};

// ─── Downloads ──────────────────────────────────────────────────────────────
export const downloadJsonFile = (filename: string, data: unknown): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

// ─── Postman collection (v2.1) ──────────────────────────────────────────────
export const buildPostmanCollection = (baseUrl: string) => ({
  info: {
    name: "MaxP Merchant API",
    description: "Read-only merchant API. Set the maxp_credential variable to a key from Settings → Developer.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "base_url", value: baseUrl },
    { key: "maxp_credential", value: "" },
  ],
  item: DEV_API_GROUPS.map((group) => ({
    name: group.name_en,
    item: group.endpoints.map((endpoint) => ({
      name: endpoint.summary_en,
      request: {
        method: endpoint.method,
        header: [{ key: PRESENTED_HEADER, value: "Bearer {{maxp_credential}}" }],
        url: {
          raw: `{{base_url}}${API_BASE_PATH}${endpoint.path}?${(endpoint.params || [])
            .filter((param) => !param.required && param.example)
            .map((param) => `${param.name}=${param.example}`)
            .join("&")}`,
          host: ["{{base_url}}"],
          path: `${API_BASE_PATH}${endpoint.path}`.split("/").filter(Boolean),
          query: (endpoint.params || [])
            .filter((param) => !param.required && param.example)
            .map((param) => ({ key: param.name, value: String(param.example) })),
        },
        description: endpoint.description_en,
      },
    })),
  })),
});

// ─── OpenAPI 3.0 document ───────────────────────────────────────────────────
export const buildOpenApiDocument = (baseUrl: string) => ({
  openapi: "3.0.3",
  info: {
    title: "MaxP Merchant API",
    version: "1.0.0",
    description: "Read-only merchant API exposed by the MaxP Developer Hub.",
  },
  servers: [{ url: `${baseUrl}${API_BASE_PATH}` }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer" },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: ALL_CATALOG_ENDPOINTS.reduce<Record<string, unknown>>((paths, endpoint) => {
    paths[endpoint.path] = {
      [endpoint.method.toLowerCase()]: {
        summary: endpoint.summary_en,
        description: endpoint.description_en,
        tags: [endpoint.id.split("-")[0]],
        parameters: (endpoint.params || []).map((param) => ({
          name: param.name,
          in: endpoint.path.includes(`{${param.name}}`) ? "path" : "query",
          required: Boolean(param.required),
          schema: { type: param.type === "date" ? "string" : param.type },
        })),
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { type: "object" },
                example: endpoint.responseExample,
              },
            },
          },
        },
      },
    };
    return paths;
  }, {}),
});
