import type {
  CatalogPriceRangeValue,
  CatalogSortValue,
} from "./catalogFilters";
import {
  buildStorefrontCatalogPreviewPath,
  buildStorefrontPreviewPath,
  buildStorefrontProductPreviewPath,
} from "./paths";

export interface StorefrontQaWalkthroughStep {
  id: string;
  label: string;
  href: string;
  checkpoint: string;
}

interface BuildStorefrontQaPackOptions {
  themeName?: string | null;
  themeId?: string | null;
  storeName?: string | null;
  generatedAt?: string | null;
  steps: StorefrontQaWalkthroughStep[];
}

interface BuildStorefrontQaWalkthroughOptions {
  companyId?: string | null;
  companySlug?: string | null;
  customDomain?: string | null;
  previewTheme?: string | null;
  previewSource?: string | null;
  availablePageKeys?: string[];
  categoryId?: string | null;
  sortValue?: CatalogSortValue;
  priceRangeValue?: CatalogPriceRangeValue | null;
  productSlugOrId?: string | null;
}

const hasPage = (availablePageKeys: string[], pageKey: string): boolean =>
  availablePageKeys.length === 0 || availablePageKeys.includes(pageKey);

export const buildStorefrontQaWalkthrough = ({
  companyId,
  companySlug,
  customDomain,
  previewTheme,
  previewSource,
  availablePageKeys = [],
  categoryId,
  sortValue = "featured",
  priceRangeValue = null,
  productSlugOrId,
}: BuildStorefrontQaWalkthroughOptions): StorefrontQaWalkthroughStep[] => {
  const sharedOptions = {
    companyId,
    companySlug,
    customDomain,
    previewTheme,
    previewSource,
  };
  const steps: StorefrontQaWalkthroughStep[] = [];

  if (hasPage(availablePageKeys, "home")) {
    steps.push({
      id: "home",
      label: "الرئيسية",
      href: buildStorefrontPreviewPath("/", sharedOptions),
      checkpoint: "راجعي الـ hero والهوية ورسائل البداية والهيدر.",
    });
  }

  if (hasPage(availablePageKeys, "shop")) {
    steps.push({
      id: "shop",
      label: "المتجر",
      href: buildStorefrontCatalogPreviewPath({
        ...sharedOptions,
        pageKey: "shop",
        categoryId,
        sortValue,
        priceRangeValue,
      }),
      checkpoint: "راجعي الفلاتر والشبكة وعرض التصنيف المختار.",
    });
  }

  if (hasPage(availablePageKeys, "sale")) {
    steps.push({
      id: "sale",
      label: "التخفيضات",
      href: buildStorefrontCatalogPreviewPath({
        ...sharedOptions,
        pageKey: "sale",
        categoryId,
        sortValue,
        priceRangeValue,
      }),
      checkpoint: "راجعي شارات الخصم ومسار التخفيضات بنفس الفلاتر المختارة.",
    });
  }

  if (hasPage(availablePageKeys, "collections")) {
    steps.push({
      id: "collections",
      label: "التصنيفات",
      href: buildStorefrontPreviewPath("/collections", sharedOptions),
      checkpoint: "راجعي بطاقات التصنيفات والـ CTA وسرعة الوصول للمتجر.",
    });
  }

  if (hasPage(availablePageKeys, "lookbook")) {
    steps.push({
      id: "lookbook",
      label: "اللوك بوك",
      href: buildStorefrontPreviewPath("/lookbook", sharedOptions),
      checkpoint: "راجعي الصور والـ mood وروابط التحويل إلى التصفح.",
    });
  }

  if (hasPage(availablePageKeys, "size-guide")) {
    steps.push({
      id: "size-guide",
      label: "دليل المقاسات",
      href: buildStorefrontPreviewPath("/size-guide", sharedOptions),
      checkpoint: "راجعي الجدول والملاحظات والنصوص الإرشادية.",
    });
  }

  if (productSlugOrId && hasPage(availablePageKeys, "pdp")) {
    steps.push({
      id: "pdp",
      label: "صفحة المنتج",
      href: buildStorefrontProductPreviewPath(productSlugOrId, sharedOptions),
      checkpoint: "راجعي الجاليري، المقاسات، ومناطق التحويل والمنتجات المرتبطة.",
    });
  }

  if (hasPage(availablePageKeys, "cart")) {
    steps.push({
      id: "cart",
      label: "السلة",
      href: buildStorefrontPreviewPath("/cart", sharedOptions),
      checkpoint: "راجعي حالة السلة الفارغة والملخص ونصوص الإجراءات.",
    });
  }

  if (hasPage(availablePageKeys, "checkout")) {
    steps.push({
      id: "checkout",
      label: "الدفع",
      href: buildStorefrontPreviewPath("/checkout", sharedOptions),
      checkpoint: "راجعي shell الدفع والملخص والرسائل النهائية.",
    });
  }

  return steps;
};

export const buildStorefrontQaPackLinks = (
  steps: StorefrontQaWalkthroughStep[],
): string =>
  steps
    .map((step, index) => `${index + 1}. ${step.label}: ${step.href}`)
    .join("\n");

export const buildStorefrontQaPackMarkdown = ({
  themeName,
  themeId,
  storeName,
  generatedAt,
  steps,
}: BuildStorefrontQaPackOptions): string => {
  const headingParts = [themeName?.trim(), themeId?.trim()]
    .filter(Boolean)
    .join(" - ");
  const title = headingParts || "Storefront QA Pack";
  const summaryLines = [
    storeName?.trim() ? `- Store: ${storeName.trim()}` : "",
    themeId?.trim() ? `- Theme ID: ${themeId.trim()}` : "",
    generatedAt?.trim() ? `- Generated At: ${generatedAt.trim()}` : "",
    `- Steps: ${steps.length}`,
  ].filter(Boolean);

  const stepBlocks = steps.map((step, index) =>
    [
      `## ${index + 1}. ${step.label}`,
      "",
      `Checkpoint: ${step.checkpoint}`,
      "",
      `Link: ${step.href}`,
    ].join("\n"),
  );

  return [
    `# ${title}`,
    "",
    ...summaryLines,
    "",
    ...stepBlocks,
  ].join("\n");
};
