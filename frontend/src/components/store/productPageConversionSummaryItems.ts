export type ProductPageConversionSummaryItem = {
  key: "soldCounter" | "purchaseFomo" | "estimatedDelivery" | "stickyAddToCart";
  label: string;
  description: string;
  enabled: boolean;
};

const PRODUCT_PAGE_CONVERSION_ITEM_COPY: Record<
  ProductPageConversionSummaryItem["key"],
  Omit<ProductPageConversionSummaryItem, "enabled">
> = {
  soldCounter: {
    key: "soldCounter",
    label: "Sold Counter",
    description: "يعرض وتيرة الطلب الحالية أعلى صفحة المنتج.",
  },
  purchaseFomo: {
    key: "purchaseFomo",
    label: "Purchase FOMO",
    description: "يُظهر ضغط السلات والاهتمام الحالي بالمنتج.",
  },
  estimatedDelivery: {
    key: "estimatedDelivery",
    label: "Estimated Delivery",
    description: "يعرض نافذة التوصيل المتوقعة داخل قرار الشراء.",
  },
  stickyAddToCart: {
    key: "stickyAddToCart",
    label: "Sticky Add to Cart",
    description: "يثبّت CTA الشراء أثناء التمرير على صفحة المنتج.",
  },
};

export const buildProductPageConversionSummaryItems = (
  modules: Record<string, unknown> | null | undefined,
  appEnabled: boolean,
): ProductPageConversionSummaryItem[] =>
  (
    Object.keys(
      PRODUCT_PAGE_CONVERSION_ITEM_COPY,
    ) as ProductPageConversionSummaryItem["key"][]
  ).map((key) => ({
    ...PRODUCT_PAGE_CONVERSION_ITEM_COPY[key],
    enabled: appEnabled && Boolean(modules?.[key]),
  }));
