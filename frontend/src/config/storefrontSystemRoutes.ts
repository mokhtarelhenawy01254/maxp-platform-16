export interface StorefrontSystemRouteDef {
  slug: string;
  route: string;
}

export type ProductPageVariantId =
  | "elessi-cro"
  | "parallel-demo"
  | "main-product"
  | "demo-route"
  | "stitch-parity"
  | "stitch-luxe"
  | "stitch-dark"
  | "stitch-monochrome"
  | "stitch-elite";

export interface ProductPageVariantDefinition {
  id: ProductPageVariantId;
  label: string;
  description: string;
  previewRoute: string;
}

export const PRODUCT_PAGE_VARIANTS: ProductPageVariantDefinition[] = [
  {
    id: "elessi-cro",
    label: "Elessi CRO Premium",
    description: "نسخة احترافية عالية التحويل (Minimal + CRO) مع شراء سريع.",
    previewRoute: "/shop/products/:id/elessi",
  },
  {
    id: "parallel-demo",
    label: "PDP Demo Parallel",
    description: "نسخة الديمو الموازية للمنتج.",
    previewRoute: "/shop/products-demo/:id",
  },
  {
    id: "main-product",
    label: "Product Main Page",
    description: "صفحة المنتج الرئيسية الحالية.",
    previewRoute: "/shop/products/:id",
  },
  {
    id: "demo-route",
    label: "PDP /demo Route",
    description: "نسخة معاينة عبر مسار /demo.",
    previewRoute: "/shop/products/:id/demo",
  },
  {
    id: "stitch-parity",
    label: "Stitch Parity",
    description: "نسخة مطابقة تصميم Stitch.",
    previewRoute: "/shop/products/:id/stitch-parity",
  },
  {
    id: "stitch-luxe",
    label: "Stitch Luxe",
    description: "نسخة Stitch بطابع فاخر.",
    previewRoute: "/shop/products/:id/stitch-luxe",
  },
  {
    id: "stitch-dark",
    label: "Stitch Dark Mineral",
    description: "نسخة Stitch Dark بألوان داكنة.",
    previewRoute: "/shop/products/:id/stitch-dark",
  },
  {
    id: "stitch-monochrome",
    label: "Stitch Monochrome",
    description: "نسخة Stitch Monochrome (Kinetic).",
    previewRoute: "/shop/products/:id/stitch-monochrome",
  },
  {
    id: "stitch-elite",
    label: "Stitch Elite Arabic",
    description: "نسخة مطابقة للتصميم العربي الداكن الذهبي.",
    previewRoute: "/shop/products/:id/stitch-elite",
  },
];

const PRODUCT_PAGE_VARIANT_IDS = new Set<ProductPageVariantId>(
  PRODUCT_PAGE_VARIANTS.map((item) => item.id),
);

export const isProductPageVariantId = (
  value: unknown,
): value is ProductPageVariantId => {
  const normalized = String(value ?? "").trim() as ProductPageVariantId;
  return PRODUCT_PAGE_VARIANT_IDS.has(normalized);
};

export const PRODUCT_PAGE_VARIANT_LABELS: Record<ProductPageVariantId, string> =
  PRODUCT_PAGE_VARIANTS.reduce(
    (acc, item) => {
      acc[item.id] = item.label;
      return acc;
    },
    {} as Record<ProductPageVariantId, string>,
  );

export const buildProductPagePreviewUrl = (
  variantId: ProductPageVariantId,
  productId: string,
  companyId: string,
): string => {
  const safeProductId = productId.trim();
  const safeCompanyId = companyId.trim();
  if (!safeProductId || !safeCompanyId) return "";

  const variant = PRODUCT_PAGE_VARIANTS.find((item) => item.id === variantId);
  if (!variant) return "";

  const route = variant.previewRoute.replace(
    ":id",
    encodeURIComponent(safeProductId),
  );
  return `${route}?companyId=${encodeURIComponent(safeCompanyId)}`;
};

const BASE_STOREFRONT_SYSTEM_ROUTE_DEFS: StorefrontSystemRouteDef[] = [
  { slug: "home", route: "/home" },
  { slug: "shop", route: "/shop" },
  { slug: "cart", route: "/shop/cart" },
  { slug: "wishlist", route: "/shop/wishlist" },
  { slug: "checkout", route: "/shop/checkout" },
  { slug: "order-confirmation", route: "/shop/order-confirmation/:orderNumber" },
  { slug: "track-order", route: "/shop/track-order" },
  { slug: "custom", route: "/shop/page/:slug" },
  { slug: "about-us", route: "/about" },
  { slug: "contact-us", route: "/contact" },
  { slug: "faq", route: "/faq" },
  { slug: "blog", route: "/blog" },
];

const PRODUCT_DETAILS_SYSTEM_ROUTE_DEFS: StorefrontSystemRouteDef[] =
  PRODUCT_PAGE_VARIANTS.map((variant) => ({
    slug: "product-details",
    route: variant.previewRoute,
  }));

const dedupeSystemRouteDefs = (
  defs: StorefrontSystemRouteDef[],
): StorefrontSystemRouteDef[] => {
  const seen = new Set<string>();
  const result: StorefrontSystemRouteDef[] = [];
  defs.forEach((def) => {
    const key = `${def.slug}::${def.route}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(def);
  });
  return result;
};

export const STOREFRONT_SYSTEM_ROUTE_DEFS: StorefrontSystemRouteDef[] =
  dedupeSystemRouteDefs([
    ...BASE_STOREFRONT_SYSTEM_ROUTE_DEFS,
    ...PRODUCT_DETAILS_SYSTEM_ROUTE_DEFS,
  ]);
