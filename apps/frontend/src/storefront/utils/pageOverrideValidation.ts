import {
  normalizeStorefrontPageOverrides,
  type StorefrontPageKey,
} from "./pageOverrides";
import {
  isStorefrontSectionAllowedOnPage,
  isStorefrontSectionKnown,
} from "../sections/manifest";

export type StorefrontValidationSeverity = "error" | "warning";
export type StorefrontPageValidationCode =
  | "section_unknown"
  | "section_unsupported_page"
  | "lookbook_missing_required"
  | "lookbook_unknown_category"
  | "size_guide_row_missing_required"
  | "size_guide_row_duplicate_size"
  | "size_guide_override_missing_target"
  | "size_guide_override_duplicate_target"
  | "size_guide_unknown_category_target"
  | "size_guide_unknown_product_target"
  | "size_guide_custom_target";

export interface StorefrontValidationCategoryOption {
  id: string;
  name?: string;
  slug?: string;
}

export interface StorefrontValidationProductOption {
  id: string;
  name?: string;
  slug: string;
  categoryId?: string;
  categoryName?: string;
}

export interface StorefrontPageValidationIssue {
  code: StorefrontPageValidationCode;
  severity: StorefrontValidationSeverity;
  pageKey: StorefrontPageKey;
  sectionType: string;
  sectionIndex: number;
  fieldKey: string;
  message: string;
  itemIndex?: number;
}

export interface StorefrontPageValidationResult {
  issues: StorefrontPageValidationIssue[];
  errorCount: number;
  warningCount: number;
}

interface ValidateStorefrontPageOverridesOptions {
  overrides: unknown;
  categories?: StorefrontValidationCategoryOption[];
  products?: StorefrontValidationProductOption[];
}

type DraftLookbookCard = {
  categoryKey: string;
  title: string;
  subtitle: string;
  mood: string;
  image: string;
  link: string;
};

type DraftSizeGuideRow = {
  target: string;
  eu: string;
  uk: string;
  us: string;
  cm: string;
};

type DraftSizeGuideOverride = {
  target: string;
  title: string;
  subtitle: string;
  note: string;
};

const normalizeLookupValue = (value: string): string => value.trim().toLowerCase();

const splitStructuredLines = (value: unknown): string[] =>
  typeof value === "string"
    ? value
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0 || line.includes("|"))
    : [];

const expandDelimitedParts = (line: string, size: number): string[] => {
  const parts = line.split("|").map((part) => part.trim());

  while (parts.length < size) {
    parts.push("");
  }

  return parts.slice(0, size);
};

const parseLookbookCardDrafts = (value: unknown): DraftLookbookCard[] =>
  splitStructuredLines(value).map((line) => {
    const [
      categoryKey = "",
      title = "",
      subtitle = "",
      mood = "",
      image = "",
      link = "",
    ] = expandDelimitedParts(line, 6);

    return {
      categoryKey,
      title,
      subtitle,
      mood,
      image,
      link,
    };
  });

const parseSizeGuideRowDrafts = (value: unknown): DraftSizeGuideRow[] =>
  splitStructuredLines(value).map((line) => {
    const [target = "", eu = "", uk = "", us = "", cm = ""] = expandDelimitedParts(
      line,
      5,
    );

    return {
      target,
      eu,
      uk,
      us,
      cm,
    };
  });

const parseSizeGuideOverrideDrafts = (value: unknown): DraftSizeGuideOverride[] =>
  splitStructuredLines(value).map((line) => {
    const [target = "", title = "", subtitle = "", note = ""] = expandDelimitedParts(
      line,
      4,
    );

    return {
      target,
      title,
      subtitle,
      note,
    };
  });

const matchesCategory = (
  categories: StorefrontValidationCategoryOption[],
  value: string,
): boolean => {
  const normalizedValue = normalizeLookupValue(value);

  if (!normalizedValue) {
    return false;
  }

  return categories.some((category) =>
    [category.id, category.slug || "", category.name || ""]
      .filter(Boolean)
      .map(normalizeLookupValue)
      .includes(normalizedValue),
  );
};

const matchesProduct = (
  products: StorefrontValidationProductOption[],
  value: string,
): boolean => {
  const normalizedValue = normalizeLookupValue(value);

  if (!normalizedValue) {
    return false;
  }

  return products.some((product) =>
    [product.slug, product.id, product.name || ""]
      .filter(Boolean)
      .map(normalizeLookupValue)
      .includes(normalizedValue),
  );
};

const pushIssue = (
  issues: StorefrontPageValidationIssue[],
  issue: StorefrontPageValidationIssue,
) => {
  issues.push(issue);
};

const addTargetReferenceIssues = (
  issues: StorefrontPageValidationIssue[],
  options: {
    pageKey: StorefrontPageKey;
    sectionType: string;
    sectionIndex: number;
    fieldKey: string;
    target: string;
    itemIndex: number;
    categories: StorefrontValidationCategoryOption[];
    products: StorefrontValidationProductOption[];
  },
) => {
  const normalizedTarget = normalizeLookupValue(options.target);

  if (!normalizedTarget) {
    return;
  }

  if (normalizedTarget === "default") {
    return;
  }

  if (normalizedTarget.startsWith("category:")) {
    const categoryKey = options.target.slice(options.target.indexOf(":") + 1).trim();

    if (options.categories.length > 0 && !matchesCategory(options.categories, categoryKey)) {
      pushIssue(issues, {
        code: "size_guide_unknown_category_target",
        severity: "warning",
        pageKey: options.pageKey,
        sectionType: options.sectionType,
        sectionIndex: options.sectionIndex,
        fieldKey: options.fieldKey,
        itemIndex: options.itemIndex,
        message: `المرجع ${options.target} لا يطابق أي تصنيف حالي في المتجر.`,
      });
    }

    return;
  }

  if (normalizedTarget.startsWith("product:")) {
    const productKey = options.target.slice(options.target.indexOf(":") + 1).trim();

    if (options.products.length > 0 && !matchesProduct(options.products, productKey)) {
      pushIssue(issues, {
        code: "size_guide_unknown_product_target",
        severity: "warning",
        pageKey: options.pageKey,
        sectionType: options.sectionType,
        sectionIndex: options.sectionIndex,
        fieldKey: options.fieldKey,
        itemIndex: options.itemIndex,
        message: `المرجع ${options.target} لا يطابق أي منتج حالي في المتجر.`,
      });
    }

    return;
  }

  pushIssue(issues, {
    code: "size_guide_custom_target",
    severity: "warning",
    pageKey: options.pageKey,
    sectionType: options.sectionType,
    sectionIndex: options.sectionIndex,
    fieldKey: options.fieldKey,
    itemIndex: options.itemIndex,
    message: `القيمة ${options.target} ليست target قياسيًا. استخدم default أو category:<id> أو product:<slug> إذا لم تكن هذه قيمة مخصصة مقصودة.`,
  });
};

export const validateStorefrontPageOverrides = ({
  overrides,
  categories = [],
  products = [],
}: ValidateStorefrontPageOverridesOptions): StorefrontPageValidationResult => {
  const normalizedOverrides = normalizeStorefrontPageOverrides(overrides);
  const issues: StorefrontPageValidationIssue[] = [];

  Object.entries(normalizedOverrides).forEach(([pageKey, pageConfig]) => {
    if (!pageConfig) {
      return;
    }

    pageConfig.sections.forEach((section, sectionIndex) => {
      if (!section) {
        return;
      }

      const sectionType =
        typeof section === "string"
          ? section.trim()
          : typeof section === "object"
            ? String(section.type || "").trim()
            : "";

      if (!sectionType) {
        return;
      }

      if (!isStorefrontSectionKnown(sectionType)) {
        pushIssue(issues, {
          code: "section_unknown",
          severity: "error",
          pageKey,
          sectionType,
          sectionIndex,
          fieldKey: "type",
          message: `القسم ${sectionType} غير معروف داخل محرك الـ storefront الحالي.`,
        });
        return;
      }

      if (!isStorefrontSectionAllowedOnPage(sectionType, pageKey)) {
        pushIssue(issues, {
          code: "section_unsupported_page",
          severity: "error",
          pageKey,
          sectionType,
          sectionIndex,
          fieldKey: "type",
          message: `القسم ${sectionType} غير مخصص للاستخدام داخل صفحة ${pageKey}.`,
        });
      }

      if (typeof section === "string" || typeof section !== "object") {
        return;
      }

      const settings =
        section.settings && typeof section.settings === "object"
          ? (section.settings as Record<string, unknown>)
          : {};

      if (sectionType === "lookbook-showcase") {
        const cards = parseLookbookCardDrafts(settings["categoryCards"]);

        cards.forEach((card, itemIndex) => {
          if (!card.categoryKey || !card.title || !card.subtitle || !card.mood) {
            pushIssue(issues, {
              code: "lookbook_missing_required",
              severity: "error",
              pageKey,
              sectionType,
              sectionIndex,
              fieldKey: "categoryCards",
              itemIndex,
              message:
                "بطاقة الـ Lookbook يجب أن تحتوي على التصنيف والعنوان والوصف والمود قبل الحفظ.",
            });
          }

          if (
            card.categoryKey &&
            categories.length > 0 &&
            !matchesCategory(categories, card.categoryKey)
          ) {
            pushIssue(issues, {
              code: "lookbook_unknown_category",
              severity: "warning",
              pageKey,
              sectionType,
              sectionIndex,
              fieldKey: "categoryCards",
              itemIndex,
              message: `التصنيف ${card.categoryKey} غير موجود في بيانات المتجر الحالية.`,
            });
          }
        });
      }

      if (sectionType === "size-guide") {
        const rows = parseSizeGuideRowDrafts(settings["guideRows"]);
        const seenRowKeys = new Set<string>();

        rows.forEach((row, itemIndex) => {
          if (!row.target || !row.eu || !row.uk || !row.us || !row.cm) {
            pushIssue(issues, {
              code: "size_guide_row_missing_required",
              severity: "error",
              pageKey,
              sectionType,
              sectionIndex,
              fieldKey: "guideRows",
              itemIndex,
              message:
                "كل صف مقاس يجب أن يحتوي على Target وEU وUK وUS وCM قبل الحفظ.",
            });
          }

          const rowKey = `${normalizeLookupValue(row.target)}::${normalizeLookupValue(row.eu)}`;
          if (row.target && row.eu) {
            if (seenRowKeys.has(rowKey)) {
              pushIssue(issues, {
                code: "size_guide_row_duplicate_size",
                severity: "error",
                pageKey,
                sectionType,
                sectionIndex,
                fieldKey: "guideRows",
                itemIndex,
                message: `يوجد صف مقاس مكرر لنفس الـ target والمقاس EU (${row.target} / ${row.eu}).`,
              });
            } else {
              seenRowKeys.add(rowKey);
            }
          }

          addTargetReferenceIssues(issues, {
            pageKey,
            sectionType,
            sectionIndex,
            fieldKey: "guideRows",
            target: row.target,
            itemIndex,
            categories,
            products,
          });
        });

        const overridesDraft = parseSizeGuideOverrideDrafts(settings["guideOverrides"]);
        const seenOverrideTargets = new Set<string>();

        overridesDraft.forEach((item, itemIndex) => {
          if (!item.target) {
            pushIssue(issues, {
              code: "size_guide_override_missing_target",
              severity: "error",
              pageKey,
              sectionType,
              sectionIndex,
              fieldKey: "guideOverrides",
              itemIndex,
              message: "كل تخصيص عنوان في دليل المقاسات يجب أن يحتوي على Target واضح.",
            });
          }

          const normalizedTarget = normalizeLookupValue(item.target);
          if (normalizedTarget) {
            if (seenOverrideTargets.has(normalizedTarget)) {
              pushIssue(issues, {
                code: "size_guide_override_duplicate_target",
                severity: "error",
                pageKey,
                sectionType,
                sectionIndex,
                fieldKey: "guideOverrides",
                itemIndex,
                message: `يوجد أكثر من تخصيص عنوان لنفس الـ target (${item.target}).`,
              });
            } else {
              seenOverrideTargets.add(normalizedTarget);
            }
          }

          addTargetReferenceIssues(issues, {
            pageKey,
            sectionType,
            sectionIndex,
            fieldKey: "guideOverrides",
            target: item.target,
            itemIndex,
            categories,
            products,
          });
        });
      }
    });
  });

  return {
    issues,
    errorCount: issues.filter((issue) => issue.severity === "error").length,
    warningCount: issues.filter((issue) => issue.severity === "warning").length,
  };
};
