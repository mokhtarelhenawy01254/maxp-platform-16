import { RefreshCw as ArrowPathIcon, ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon, AlignLeft as Bars3Icon, CreditCard as CreditCardIcon, Circle as HomeModernIcon, Search as MagnifyingGlassIcon, Image as PhotoIcon, ShoppingBag as ShoppingBagIcon, ShoppingBag as ShoppingCartIcon, Grid as Squares2X2Icon, Tag as TagIcon } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from "react";
;
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DEFAULT_STOREFRONT_THEME_ID,
  getStorefrontThemePreset,
} from "../../storefront/themes";
import {
  getStorefrontPageOverridesFromDesignTokens,
  StorefrontPageKey,
  upsertStorefrontPageOverridesInDesignTokens,
  STOREFRONT_PAGE_KEYS,
} from "../../storefront/utils/pageOverrides";
import {
  serializeCategoryLookbookCards,
  serializeSizeGuideOverrides,
  serializeSizeGuideRows,
  type CategoryLookbookCardConfig,
  type SizeGuideOverrideConfig,
  type SizeGuideRowConfig,
} from "../../storefront/utils/dynamicSectionContent";
import {
  cleanStorefrontSectionSettings,
  extractStorefrontSectionSettings,
  getStorefrontSectionFieldDisplayValue,
} from "../../storefront/utils/structuredSectionFields";
import {
  type StorefrontPageValidationIssue,
  type StorefrontValidationCategoryOption,
  type StorefrontValidationProductOption,
} from "../../storefront/utils/pageOverrideValidation";
import {
  STOREFRONT_SECTION_IDS,
  STOREFRONT_CUSTOM_PAGE_STARTER_SECTIONS,
  getStorefrontSectionLabel,
  getStorefrontSectionManifest,
  isStorefrontSectionAllowedOnPage,
  type StorefrontSectionFieldDefinition,
} from "../../storefront/sections/manifest";
import StorefrontImagePickerModal from "./StorefrontImagePickerModal";
import { PDP_CHECKOUT_SECTION_ID } from "../../storefront/utils/pdpCheckout";

const PAGE_LABELS: Record<StorefrontPageKey, string> = {
  home: "الرئيسية",
  shop: "المتجر",
  pdp: "صفحة المنتج",
  cart: "السلة",
  checkout: "الدفع",
  sale: "التخفيضات",
  collections: "التصنيفات",
  lookbook: "اللوك بوك",
  "size-guide": "دليل المقاسات",
};

const PRIMARY_PAGE_FLOW: StorefrontPageKey[] = [
  "home",
  "shop",
  "pdp",
  "cart",
  "checkout",
];

const SUPPORT_PAGE_FLOW: StorefrontPageKey[] = [
  "sale",
  "collections",
  "lookbook",
  "size-guide",
];

const PAGE_STAGE_COPY: Partial<
  Record<
    StorefrontPageKey,
    {
      stage: string;
      description: string;
    }
  >
> = {
  home: {
    stage: "الانطباع الأول",
    description: "الهيرو، العروض، والثقة السريعة قبل ما الزبون يبدأ التصفح.",
  },
  shop: {
    stage: "الاكتشاف",
    description: "البحث، الفلاتر، وترتيب المنتجات داخل صفحة المتجر.",
  },
  pdp: {
    stage: "الإقناع",
    description: "الصور، التفاصيل، البيع الإضافي، والمقاسات قبل اتخاذ القرار.",
  },
  cart: {
    stage: "مراجعة الطلب",
    description: "السلة، الرسائل التوضيحية، وتأكيد العناصر قبل الدفع.",
  },
  checkout: {
    stage: "إتمام الشراء",
    description: "حقول الطلب، الدفع، وآخر خطوة في الرحلة.",
  },
  sale: {
    stage: "العروض",
    description: "صفحة تدفع الزبون للعروض الموسمية والتخفيضات.",
  },
  collections: {
    stage: "التصنيفات",
    description: "مداخل سريعة للتسوق حسب الفئة أو نوع المنتجات.",
  },
  lookbook: {
    stage: "الإلهام",
    description: "محتوى بصري يساعد الزبون يكتشف الستايل والاقتراحات.",
  },
  "size-guide": {
    stage: "تقليل التردد",
    description: "صفحة مساعدة تطمّن الزبون قبل الشراء وتقلل الأسئلة.",
  },
};

const PAGE_ICON_MAP: Partial<
  Record<
    StorefrontPageKey,
    React.ComponentType<React.SVGProps<SVGSVGElement>>
  >
> = {
  home: HomeModernIcon,
  shop: MagnifyingGlassIcon,
  pdp: ShoppingBagIcon,
  cart: ShoppingCartIcon,
  checkout: CreditCardIcon,
  sale: TagIcon,
  collections: Squares2X2Icon,
  lookbook: PhotoIcon,
  "size-guide": Squares2X2Icon,
};

type SectionEntry = string | { id?: string; type: string; [key: string]: unknown };
type SectionSettings = Record<string, unknown>;
type SectionConfig = {
  id?: string;
  type: string;
  variant?: string;
  settings?: SectionSettings;
};

type StorefrontEditorCategoryOption = StorefrontValidationCategoryOption & {
  name: string;
  slug: string;
  image?: string;
  description?: string;
};

type StorefrontEditorProductOption = StorefrontValidationProductOption & {
  id: string;
  name: string;
  slug: string;
  categoryId?: string;
  categoryName?: string;
};

interface StorefrontPageSectionsEditorProps {
  themeId: string;
  designTokens: unknown;
  availableCategories?: StorefrontEditorCategoryOption[];
  availableProducts?: StorefrontEditorProductOption[];
  catalogLoading?: boolean;
  validationIssues?: StorefrontPageValidationIssue[];
  initialPage?: StorefrontPageKey;
  allowedPages?: StorefrontPageKey[];
  focusedSectionType?: string;
  hideAddPageButton?: boolean;
  onChange: (nextDesignTokens: Record<string, unknown>) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getSectionKey = (section: SectionEntry): string =>
  typeof section === "string"
    ? section
    : typeof section.id === "string" && section.id.trim()
      ? section.id
      : section.type;

const getSectionType = (section: SectionEntry): string =>
  typeof section === "string" ? section : section.type;

const isDefaultPageKey = (pageKey: string): pageKey is StorefrontPageKey =>
  STOREFRONT_PAGE_KEYS.some((candidate) => candidate === pageKey);

const getSectionVariant = (section: SectionEntry): string =>
  typeof section === "string"
    ? ""
    : typeof section["variant"] === "string"
      ? (section["variant"] as string)
      : "";

const getSectionSettings = (section: SectionEntry): SectionSettings =>
  typeof section === "string" || !isRecord(section["settings"])
    ? {}
    : extractStorefrontSectionSettings(section["settings"]);

const getSectionDisplayLabel = (section: SectionEntry): string =>
  getStorefrontSectionLabel(getSectionType(section));

const getPageLabel = (pageKey: StorefrontPageKey): string =>
  PAGE_LABELS[pageKey] ||
  pageKey
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const PDP_SECTION_SHORTCUTS = [
  {
    type: "product-gallery",
    label: "معرض الصور",
    helperText: "بدّلي شكل عرض صور المنتج بسرعة.",
  },
  {
    type: "product-info",
    label: "معلومات المنتج",
    helperText: "راجعي الوصف والمقاسات وأزرار التحويل.",
  },
  {
    type: "conversion-stack",
    label: "أدوات التحويل",
    helperText: "عدادات الاستعجال والتنبيهات التجارية ومكونات الربح داخل صفحة المنتج.",
  },
  {
    type: "related-products",
    label: "المنتجات المرتبطة",
    helperText: "اضبطي قسم البيع الإضافي والاقتراحات.",
  },
  {
    type: "bought-together",
    label: "يُشترى معًا",
    helperText: "باقة مقترحة للمنتجات المكملة مع إجمالي وإضافة دفعة واحدة.",
  },
  {
    type: PDP_CHECKOUT_SECTION_ID,
    label: "شيك أوت صفحة المنتج",
    helperText: "مؤشر الشيك أوت المدمج داخل الـPDP مع إمكانية الانتقال السريع إليه.",
  },
] as const;

const normalizeLookupValue = (value: string): string => value.trim().toLowerCase();

const buildCategoryOptionLabel = (
  category: StorefrontEditorCategoryOption,
): string =>
  category.slug &&
  normalizeLookupValue(category.slug) !== normalizeLookupValue(category.name)
    ? `${category.name} (${category.slug})`
    : category.name;

const buildProductOptionLabel = (
  product: StorefrontEditorProductOption,
): string =>
  `${product.name} (${product.slug})${
    product.categoryName ? ` - ${product.categoryName}` : ""
  }`;

const buildCategoryShopLink = (categoryId: string): string =>
  `/shop?category=${encodeURIComponent(categoryId)}`;

const shouldReplaceAutofilledValue = (
  currentValue: string | undefined,
  previousAutoValue: string | undefined,
): boolean => {
  const normalizedCurrentValue = (currentValue || "").trim();
  const normalizedPreviousAutoValue = (previousAutoValue || "").trim();

  return !normalizedCurrentValue || normalizedCurrentValue === normalizedPreviousAutoValue;
};

const getCategoryAutofillSnapshot = (
  category: StorefrontEditorCategoryOption | null,
): Pick<CategoryLookbookCardConfig, "title" | "subtitle" | "mood" | "image" | "link"> => ({
  title: category?.name || "",
  subtitle: category?.description || "",
  mood: "Category Edit",
  image: category?.image || "",
  link: category ? buildCategoryShopLink(category.id) : "",
});

const applyCategoryAutofillToCard = (
  card: CategoryLookbookCardConfig,
  nextCategory: StorefrontEditorCategoryOption,
  categories: StorefrontEditorCategoryOption[],
): CategoryLookbookCardConfig => {
  const previousCategory = findMatchingCategoryOption(categories, card.categoryKey);
  const previousSnapshot = getCategoryAutofillSnapshot(previousCategory);
  const nextSnapshot = getCategoryAutofillSnapshot(nextCategory);

  return {
    categoryKey: nextCategory.id,
    title: shouldReplaceAutofilledValue(card.title, previousSnapshot.title)
      ? nextSnapshot.title
      : card.title,
    subtitle: shouldReplaceAutofilledValue(card.subtitle, previousSnapshot.subtitle)
      ? nextSnapshot.subtitle
      : card.subtitle,
    mood: shouldReplaceAutofilledValue(card.mood, previousSnapshot.mood)
      ? nextSnapshot.mood
      : card.mood,
    image: shouldReplaceAutofilledValue(card.image, previousSnapshot.image)
      ? nextSnapshot.image
      : card.image,
    link: shouldReplaceAutofilledValue(card.link, previousSnapshot.link)
      ? nextSnapshot.link
      : card.link,
  };
};

const moveListItem = <T,>(items: T[], index: number, direction: "up" | "down"): T[] => {
  const swapIndex = direction === "up" ? index - 1 : index + 1;

  if (swapIndex < 0 || swapIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const currentItem = nextItems[index];
  const swappedItem = nextItems[swapIndex];

  if (currentItem === undefined || swappedItem === undefined) {
    return items;
  }

  nextItems[index] = swappedItem;
  nextItems[swapIndex] = currentItem;

  return nextItems;
};

const duplicateListItem = <T,>(items: T[], index: number, clone: (item: T) => T): T[] => {
  const item = items[index];

  if (item === undefined) {
    return items;
  }

  const nextItems = [...items];
  nextItems.splice(index + 1, 0, clone(item));

  return nextItems;
};

const getIssueTone = (
  issues: StorefrontPageValidationIssue[],
): "error" | "warning" | null => {
  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }

  if (issues.some((issue) => issue.severity === "warning")) {
    return "warning";
  }

  return null;
};

const getIssueContainerClassName = (tone: "error" | "warning" | null): string => {
  if (tone === "error") {
    return "border-red-300 bg-red-50/80 dark:border-red-900 dark:bg-red-950/20";
  }

  if (tone === "warning") {
    return "border-amber-300 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/20";
  }

  return "border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/30";
};

const ValidationIssueList: React.FC<{
  issues: StorefrontPageValidationIssue[];
}> = ({ issues }) => {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {issues.map((issue, index) => (
        <div
          key={`${issue.fieldKey}-${issue.itemIndex ?? "section"}-${index}`}
          className={`rounded-lg border px-3 py-2 text-xs leading-6 ${
            issue.severity === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
          }`}
        >
          {issue.message}
        </div>
      ))}
    </div>
  );
};

const ValidationSummaryCard: React.FC<{
  title: string;
  issues: StorefrontPageValidationIssue[];
  maxVisible?: number;
}> = ({ title, issues, maxVisible = 6 }) => {
  if (issues.length === 0) {
    return null;
  }

  const tone = getIssueTone(issues);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const visibleIssues = issues.slice(0, maxVisible);

  return (
    <div
      className={`rounded-2xl border p-4 ${getIssueContainerClassName(tone)}`}
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </div>
          <p className="text-xs leading-6 text-gray-600 dark:text-gray-300">
            {errorCount > 0
              ? `يوجد ${errorCount} أخطاء تمنع الحفظ${
                  warningCount > 0 ? `، بالإضافة إلى ${warningCount} تحذير.` : "."
                }`
              : `يوجد ${warningCount} تحذيرات تستحق المراجعة قبل الحفظ.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {errorCount > 0 ? (
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {errorCount} Errors
            </span>
          ) : null}
          {warningCount > 0 ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              {warningCount} Warnings
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <ValidationIssueList issues={visibleIssues} />
        {issues.length > visibleIssues.length ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            + {issues.length - visibleIssues.length} ملاحظات إضافية داخل هذه الصفحة.
          </p>
        ) : null}
      </div>
    </div>
  );
};

type StorefrontPageMapCard = {
  pageKey: StorefrontPageKey;
  label: string;
  stage: string;
  description: string;
  currentCount: number;
  hiddenCount: number;
  optionalCount: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  isCustomized: boolean;
  previewSections: string[];
};

const PageMapCard: React.FC<{
  card: StorefrontPageMapCard;
  selected: boolean;
  onSelect: (pageKey: StorefrontPageKey) => void;
}> = ({ card, selected, onSelect }) => {
  const Icon = PAGE_ICON_MAP[card.pageKey] || Squares2X2Icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(card.pageKey)}
      aria-pressed={selected}
      className={`rounded-[24px] border p-4 text-right transition-all ${
        selected
          ? "border-indigo-500 bg-white shadow-[0_24px_60px_-42px_rgba(79,70,229,0.55)] dark:border-indigo-400 dark:bg-gray-900/90"
          : "border-gray-200 bg-white/80 hover:border-indigo-200 hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-indigo-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
            selected
              ? "bg-indigo-600 text-white dark:bg-indigo-500"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>

        <div className="flex flex-wrap justify-end gap-2">
          {selected ? (
            <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white dark:bg-indigo-500">
              الصفحة الحالية
            </span>
          ) : null}
          {card.isCustomized ? (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300">
              مخصصة
            </span>
          ) : (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300">
              افتراضية
            </span>
          )}
          {card.issueCount > 0 ? (
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                card.errorCount > 0
                  ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                  : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
              }`}
            >
              {card.errorCount > 0
                ? `${card.errorCount} أخطاء`
                : `${card.warningCount} تحذيرات`}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
          {card.stage}
        </div>
        <div className="mt-2 text-base font-bold text-gray-900 dark:text-white">
          {card.label}
        </div>
        <p className="mt-2 text-xs leading-6 text-gray-600 dark:text-gray-300">
          {card.description}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {card.currentCount} أقسام ظاهرة
        </span>
        {card.hiddenCount > 0 ? (
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300">
            {card.hiddenCount} مخفية
          </span>
        ) : null}
        {card.optionalCount > 0 ? (
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
            {card.optionalCount} متاحة للإضافة
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {card.previewSections.length > 0 ? (
          card.previewSections.map((sectionLabel, index) => (
            <span
              key={`${card.pageKey}-${sectionLabel}-${index}`}
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300"
            >
              {sectionLabel}
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            لا توجد أقسام ظاهرة في هذه الصفحة حاليًا.
          </span>
        )}
      </div>
    </button>
  );
};

const findMatchingCategoryOption = (
  categories: StorefrontEditorCategoryOption[],
  value: string,
): StorefrontEditorCategoryOption | null => {
  const normalizedValue = normalizeLookupValue(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    categories.find((category) =>
      [category.id, category.slug, category.name]
        .filter(Boolean)
        .map(normalizeLookupValue)
        .includes(normalizedValue),
    ) || null
  );
};

const findMatchingProductOption = (
  products: StorefrontEditorProductOption[],
  value: string,
): StorefrontEditorProductOption | null => {
  const normalizedValue = normalizeLookupValue(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    products.find((product) =>
      [product.slug, product.id, product.name]
        .filter(Boolean)
        .map(normalizeLookupValue)
        .includes(normalizedValue),
    ) || null
  );
};

type TargetReferenceKind = "default" | "category" | "product" | "custom";

type ParsedTargetReference = {
  kind: TargetReferenceKind;
  value: string;
};

const CUSTOM_VALUE = "__custom__";

const parseTargetReference = (target: string): ParsedTargetReference => {
  const trimmedTarget = target.trim();

  if (!trimmedTarget) {
    return { kind: "custom", value: "" };
  }

  if (normalizeLookupValue(trimmedTarget) === "default") {
    return { kind: "default", value: "default" };
  }

  const categoryMatch = trimmedTarget.match(/^category:(.*)$/i);
  if (categoryMatch) {
    return { kind: "category", value: categoryMatch[1]?.trim() || "" };
  }

  const productMatch = trimmedTarget.match(/^product:(.*)$/i);
  if (productMatch) {
    return { kind: "product", value: productMatch[1]?.trim() || "" };
  }

  return { kind: "custom", value: trimmedTarget };
};

const formatTargetReference = (
  kind: TargetReferenceKind,
  value: string,
): string => {
  const trimmedValue = value.trim();

  if (kind === "default") {
    return "default";
  }

  if (kind === "category") {
    return trimmedValue ? `category:${trimmedValue}` : "category:";
  }

  if (kind === "product") {
    return trimmedValue ? `product:${trimmedValue}` : "product:";
  }

  return trimmedValue;
};

const getTargetReferenceSummary = (
  target: string,
  categories: StorefrontEditorCategoryOption[],
  products: StorefrontEditorProductOption[],
): { title: string; subtitle: string; note: string } | null => {
  const parsedTarget = parseTargetReference(target);

  if (parsedTarget.kind === "product") {
    const product = findMatchingProductOption(products, parsedTarget.value);
    if (!product) {
      return null;
    }

    return {
      title: `${product.name} Fit`,
      subtitle: product.categoryName
        ? `مقاسات مخصصة لمنتج ${product.name} ضمن ${product.categoryName}.`
        : `مقاسات مخصصة لمنتج ${product.name}.`,
      note: `راجعي مقاسات ${product.name} قبل الطلب لأن هذا الموديل قد يختلف عن الدليل العام.`,
    };
  }

  if (parsedTarget.kind === "category") {
    const category = findMatchingCategoryOption(categories, parsedTarget.value);
    if (!category) {
      return null;
    }

    return {
      title: `مقاسات ${category.name}`,
      subtitle: `إرشادات قياس مخصصة لتصنيف ${category.name}.`,
      note: `قد تختلف قصّات منتجات ${category.name} قليلًا، لذلك راجعي الجدول قبل إضافة المنتج للسلة.`,
    };
  }

  if (parsedTarget.kind === "default") {
    return {
      title: "دليل المقاسات السريع",
      subtitle: "اختيار عملي قبل إضافة المنتج للسلة.",
      note: "إذا كنتِ بين مقاسين فاختاري الأكبر.",
    };
  }

  return null;
};

const applyTargetAutofillToOverride = (
  item: SizeGuideOverrideConfig,
  nextTarget: string,
  categories: StorefrontEditorCategoryOption[],
  products: StorefrontEditorProductOption[],
): SizeGuideOverrideConfig => {
  const previousSummary = getTargetReferenceSummary(item.target, categories, products);
  const nextSummary = getTargetReferenceSummary(nextTarget, categories, products);

  return {
    target: nextTarget,
    title:
      nextSummary && shouldReplaceAutofilledValue(item.title, previousSummary?.title)
        ? nextSummary.title
        : item.title || "",
    subtitle:
      nextSummary && shouldReplaceAutofilledValue(item.subtitle, previousSummary?.subtitle)
        ? nextSummary.subtitle
        : item.subtitle || "",
    note:
      nextSummary && shouldReplaceAutofilledValue(item.note, previousSummary?.note)
        ? nextSummary.note
        : item.note || "",
  };
};

const areSectionsEqual = (left: SectionEntry[], right: SectionEntry[]): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const cleanSectionSettings = (settings: SectionSettings = {}): SectionSettings =>
  cleanStorefrontSectionSettings(settings);

const normalizeSectionConfig = (section: SectionEntry): SectionConfig =>
  typeof section === "string"
    ? { type: section }
    : {
        ...(typeof section["id"] === "string" && (section["id"] as string).trim()
          ? { id: section["id"] as string }
          : {}),
        type: section.type,
        ...(typeof section["variant"] === "string" && (section["variant"] as string).trim()
          ? { variant: section["variant"] as string }
          : {}),
        ...(Object.keys(getSectionSettings(section)).length > 0
          ? { settings: getSectionSettings(section) }
          : {}),
      };

const cleanSectionConfig = (section: SectionConfig): SectionConfig => {
  const normalizedSettings = cleanSectionSettings(section.settings);
  return {
    ...(typeof section["id"] === "string" && section["id"].trim()
      ? { id: section["id"] }
      : {}),
    type: section.type,
    ...(typeof section["variant"] === "string" && section["variant"].trim()
      ? { variant: section["variant"].trim() }
      : {}),
    ...(Object.keys(normalizedSettings).length > 0
      ? { settings: normalizedSettings }
      : {}),
  };
};

const finalizeSectionEntry = (
  section: SectionConfig,
  baseSection?: SectionEntry,
): SectionEntry => {
  const cleanedSection = cleanSectionConfig(section);
  
  let cleanedBase: SectionEntry | undefined = undefined;
  if (baseSection) {
    if (typeof baseSection === "string") {
      cleanedBase = baseSection;
    } else {
      cleanedBase = cleanSectionConfig(normalizeSectionConfig(baseSection));
    }
  }

  if (
    cleanedBase &&
    areSectionsEqual([cleanedBase], [cleanedSection as SectionEntry])
  ) {
    return baseSection as SectionEntry;
  }

  if (
    !cleanedSection.id &&
    !cleanedSection.variant &&
    !cleanedSection.settings
  ) {
    return cleanedSection.type;
  }

  return cleanedSection;
};

const getDisplaySections = (
  baseSections: SectionEntry[],
  currentSections: SectionEntry[],
  pageKey: string,
): Array<{ section: SectionEntry; enabled: boolean }> => {
  const currentKeys = new Set(currentSections.map((section) => getSectionKey(section)));
  const hiddenSections = baseSections.filter(
    (section) => !currentKeys.has(getSectionKey(section)),
  );
  const existingKeys = new Set(
    [...currentSections, ...hiddenSections].map((section) => getSectionKey(section)),
  );
  const optionalSections = STOREFRONT_SECTION_IDS.filter((sectionId) => {
    const manifest = getStorefrontSectionManifest(sectionId);

    if (!manifest || manifest.legacy) {
      return false;
    }

    if (!isStorefrontSectionAllowedOnPage(sectionId, pageKey)) {
      return false;
    }

    return !existingKeys.has(sectionId);
  });

  return [
    ...currentSections.map((section) => ({ section, enabled: true })),
    ...hiddenSections.map((section) => ({ section, enabled: false })),
    ...optionalSections.map((section) => ({ section, enabled: false })),
  ];
};

const FIELD_INPUT_CLASSNAME =
  "w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";

const FIELD_TEXTAREA_CLASSNAME = `${FIELD_INPUT_CLASSNAME} min-h-[88px]`;

const splitEditableStructuredLines = (value: string): string[] => {
  if (!value.length) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0 || line.includes("|"));
};

const expandDelimitedParts = (line: string, size: number): string[] => {
  const parts = line.split("|").map((part) => part.trim());

  while (parts.length < size) {
    parts.push("");
  }

  return parts.slice(0, size);
};

const parseEditableLookbookCards = (
  value: string,
): CategoryLookbookCardConfig[] =>
  splitEditableStructuredLines(value).map((line) => {
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

const parseEditableSizeGuideRows = (value: string): SizeGuideRowConfig[] =>
  splitEditableStructuredLines(value).map((line) => {
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

const parseEditableSizeGuideOverrides = (
  value: string,
): SizeGuideOverrideConfig[] =>
  splitEditableStructuredLines(value).map((line) => {
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

const TargetReferenceControl: React.FC<{
  target: string;
  categories: StorefrontEditorCategoryOption[];
  products: StorefrontEditorProductOption[];
  catalogLoading: boolean;
  onChange: (nextTarget: string) => void;
}> = ({ target, categories, products, catalogLoading, onChange }) => {
  const parsedTarget = parseTargetReference(target);
  const matchedCategory =
    parsedTarget.kind === "category"
      ? findMatchingCategoryOption(categories, parsedTarget.value)
      : null;
  const matchedProduct =
    parsedTarget.kind === "product"
      ? findMatchingProductOption(products, parsedTarget.value)
      : null;

  const handleKindChange = (nextKind: TargetReferenceKind) => {
    if (nextKind === "default") {
      onChange("default");
      return;
    }

    if (nextKind === "category") {
      const fallbackCategory = matchedCategory || categories[0];
      const fallbackValue =
        fallbackCategory?.id ||
        (parsedTarget.kind === "category" || parsedTarget.kind === "custom"
          ? parsedTarget.value
          : "");
      onChange(
        formatTargetReference("category", fallbackValue),
      );
      return;
    }

    if (nextKind === "product") {
      const fallbackProduct = matchedProduct || products[0];
      const fallbackValue =
        fallbackProduct?.slug ||
        (parsedTarget.kind === "product" || parsedTarget.kind === "custom"
          ? parsedTarget.value
          : "");
      onChange(
        formatTargetReference("product", fallbackValue),
      );
      return;
    }

    onChange(parsedTarget.kind === "custom" ? parsedTarget.value : "");
  };

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-gray-200 p-3 dark:border-gray-700">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          نوع Target
        </label>
        <select
          aria-label="نوع Target"
          value={parsedTarget.kind}
          onChange={(event) =>
            handleKindChange(event.target.value as TargetReferenceKind)
          }
          className={FIELD_INPUT_CLASSNAME}
        >
          <option value="default">Default عام</option>
          <option value="category">تصنيف</option>
          <option value="product">منتج</option>
          <option value="custom">قيمة مخصصة</option>
        </select>
      </div>

      {parsedTarget.kind === "category" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            التصنيف المستهدف
          </label>
          {categories.length > 0 ? (
            <select
              aria-label="التصنيف المستهدف"
              value={matchedCategory?.id || parsedTarget.value || CUSTOM_VALUE}
              onChange={(event) => {
                if (event.target.value === CUSTOM_VALUE) {
                  onChange(matchedCategory ? "" : parsedTarget.value);
                  return;
                }

                onChange(formatTargetReference("category", event.target.value));
              }}
              className={FIELD_INPUT_CLASSNAME}
            >
              {!matchedCategory && parsedTarget.value ? (
                <option value={parsedTarget.value}>
                  {parsedTarget.value} (قيمة محفوظة)
                </option>
              ) : null}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {buildCategoryOptionLabel(category)}
                </option>
              ))}
              <option value={CUSTOM_VALUE}>قيمة مخصصة</option>
            </select>
          ) : (
            <input
              aria-label="التصنيف المستهدف"
              value={parsedTarget.value}
              onChange={(event) =>
                onChange(formatTargetReference("category", event.target.value))
              }
              placeholder="heels"
              className={FIELD_INPUT_CLASSNAME}
            />
          )}
        </div>
      ) : null}

      {parsedTarget.kind === "product" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            المنتج المستهدف
          </label>
          {products.length > 0 ? (
            <select
              aria-label="المنتج المستهدف"
              value={matchedProduct?.slug || parsedTarget.value || CUSTOM_VALUE}
              onChange={(event) => {
                if (event.target.value === CUSTOM_VALUE) {
                  onChange(matchedProduct ? "" : parsedTarget.value);
                  return;
                }

                onChange(formatTargetReference("product", event.target.value));
              }}
              className={FIELD_INPUT_CLASSNAME}
            >
              {!matchedProduct && parsedTarget.value ? (
                <option value={parsedTarget.value}>
                  {parsedTarget.value} (قيمة محفوظة)
                </option>
              ) : null}
              {products.map((product) => (
                <option key={product.id} value={product.slug}>
                  {buildProductOptionLabel(product)}
                </option>
              ))}
              <option value={CUSTOM_VALUE}>قيمة مخصصة</option>
            </select>
          ) : (
            <input
              aria-label="المنتج المستهدف"
              value={parsedTarget.value}
              onChange={(event) =>
                onChange(formatTargetReference("product", event.target.value))
              }
              placeholder="crystal-heel"
              className={FIELD_INPUT_CLASSNAME}
            />
          )}
        </div>
      ) : null}

      {parsedTarget.kind === "custom" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Target مخصص
          </label>
          <input
            aria-label="Target مخصص"
            value={parsedTarget.value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="default أو category:heels أو product:crystal-heel"
            className={FIELD_INPUT_CLASSNAME}
          />
        </div>
      ) : null}

      <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">
        {catalogLoading
          ? "جارِ تحميل منتجات وتصنيفات المتجر الحالية..."
          : "يمكنك الاختيار من بيانات المتجر الحالية أو الاحتفاظ بقيمة مخصصة عند الحاجة."}
      </p>
      {parsedTarget.kind === "product" && matchedProduct ? (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
          المنتج الحالي: {matchedProduct.name}
          {matchedProduct.categoryName ? ` • ${matchedProduct.categoryName}` : ""}
        </div>
      ) : null}
      {parsedTarget.kind === "category" && matchedCategory ? (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
          التصنيف الحالي: {matchedCategory.name}
        </div>
      ) : null}
    </div>
  );
};

const StructuredItemActions: React.FC<{
  itemLabel: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onDuplicate: () => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}> = ({
  itemLabel,
  index,
  isFirst,
  isLast,
  onDuplicate,
  onMove,
  onDelete,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      aria-label={`نسخ ${itemLabel} ${index + 1}`}
      onClick={onDuplicate}
      className="rounded-md border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
    >
      نسخ
    </button>
    <button
      type="button"
      aria-label={`تحريك ${itemLabel} ${index + 1} لأعلى`}
      onClick={() => onMove("up")}
      disabled={isFirst}
      className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
        isFirst
          ? "border-gray-200 text-gray-400 dark:border-gray-800 dark:text-gray-600"
          : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/60"
      }`}
    >
      لأعلى
    </button>
    <button
      type="button"
      aria-label={`تحريك ${itemLabel} ${index + 1} لأسفل`}
      onClick={() => onMove("down")}
      disabled={isLast}
      className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
        isLast
          ? "border-gray-200 text-gray-400 dark:border-gray-800 dark:text-gray-600"
          : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/60"
      }`}
    >
      لأسفل
    </button>
    <button
      type="button"
      aria-label={`حذف ${itemLabel} ${index + 1}`}
      onClick={onDelete}
      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
    >
      حذف
    </button>
  </div>
);

type QuickFixAction = {
  label: string;
  tone?: "neutral" | "warning" | "danger";
  onClick: () => void;
};

const QUICK_FIX_CLASSNAMES: Record<NonNullable<QuickFixAction["tone"]>, string> = {
  neutral:
    "border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30",
  warning:
    "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30",
  danger:
    "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30",
};

const QuickFixActions: React.FC<{
  actions: QuickFixAction[];
}> = ({ actions }) => {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action, index) => (
        <button
          key={`${action.label}-${index}`}
          type="button"
          onClick={action.onClick}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
            QUICK_FIX_CLASSNAMES[action.tone || "neutral"]
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};

const LookbookCardsEditor: React.FC<{
  value: string;
  categories: StorefrontEditorCategoryOption[];
  catalogLoading: boolean;
  issues: StorefrontPageValidationIssue[];
  onChange: (nextValue: string) => void;
}> = ({ value, categories, catalogLoading, issues, onChange }) => {
  const [imagePickerCardIndex, setImagePickerCardIndex] = useState<number | null>(null);
  const cards = parseEditableLookbookCards(value);

  const commit = (nextCards: CategoryLookbookCardConfig[]) => {
    onChange(serializeCategoryLookbookCards(nextCards));
  };

  const updateCard = (
    index: number,
    key: keyof CategoryLookbookCardConfig,
    nextValue: string,
  ) => {
    const nextCards = cards.map((card, cardIndex) =>
      cardIndex === index ? { ...card, [key]: nextValue } : card,
    );
    commit(nextCards);
  };

  const updateCardShape = (
    index: number,
    updater: (currentCard: CategoryLookbookCardConfig) => CategoryLookbookCardConfig,
  ) => {
    const nextCards = cards.map((card, cardIndex) =>
      cardIndex === index ? updater(card) : card,
    );

    commit(nextCards);
  };

  const handleCategorySelect = (index: number, nextCategoryId: string) => {
    if (nextCategoryId === CUSTOM_VALUE) {
      updateCardShape(index, (currentCard) =>
        findMatchingCategoryOption(categories, currentCard.categoryKey)
          ? { ...currentCard, categoryKey: "" }
          : currentCard,
      );
      return;
    }

    const nextCategory = categories.find((category) => category.id === nextCategoryId);

    if (!nextCategory) {
      updateCard(index, "categoryKey", nextCategoryId);
      return;
    }

    updateCardShape(index, (currentCard) =>
      applyCategoryAutofillToCard(currentCard, nextCategory, categories),
    );
  };

  const handleAutofillFromCategory = (index: number) => {
    const currentCard = cards[index];
    if (!currentCard) {
      return;
    }

    const matchedCategory = findMatchingCategoryOption(categories, currentCard.categoryKey);
    if (!matchedCategory) {
      return;
    }

    updateCardShape(index, () =>
      applyCategoryAutofillToCard(currentCard, matchedCategory, categories),
    );
  };

  const removeCard = (index: number) => {
    commit(cards.filter((_, cardIndex) => cardIndex !== index));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">
        {catalogLoading
          ? "جارِ تحميل تصنيفات المتجر الحالية..."
          : categories.length > 0
            ? "اختاري التصنيف مباشرة من قائمة المتجر الحالية أو استخدمي مفتاحًا مخصصًا لو لزم."
            : "لم تتوفر التصنيفات حاليًا، لذلك سيظل إدخال المفتاح المخصص متاحًا."}
      </p>
      {cards.length > 0 ? (
        cards.map((card, index) => {
          const itemIssues = issues.filter((issue) => issue.itemIndex === index);
          const tone = getIssueTone(itemIssues);
          const matchedCategory = findMatchingCategoryOption(categories, card.categoryKey);
          const quickFixActions: QuickFixAction[] = [];

          if (
            matchedCategory &&
            (
              itemIssues.some((issue) => issue.code === "lookbook_missing_required") ||
              !card.title ||
              !card.subtitle ||
              !card.mood ||
              !card.image ||
              !card.link
            )
          ) {
            quickFixActions.push({
              label: "إكمال تلقائي من التصنيف",
              onClick: () => handleAutofillFromCategory(index),
            });
          }

          if (itemIssues.some((issue) => issue.code === "lookbook_missing_required")) {
            quickFixActions.push({
              label: "حذف البطاقة غير المكتملة",
              tone: "danger",
              onClick: () => removeCard(index),
            });
          }

          return (
          <div
            key={`lookbook-card-${index}`}
            className={`rounded-xl border p-4 ${getIssueContainerClassName(tone)}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                بطاقة #{index + 1}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {matchedCategory ? (
                  <button
                    type="button"
                    aria-label={`تعبئة البطاقة ${index + 1} من التصنيف`}
                    onClick={() => handleAutofillFromCategory(index)}
                    className="rounded-md border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
                  >
                    تعبئة تلقائية
                  </button>
                ) : null}
                <StructuredItemActions
                  itemLabel="البطاقة"
                  index={index}
                  isFirst={index === 0}
                  isLast={index === cards.length - 1}
                  onDuplicate={() =>
                    commit(
                      duplicateListItem(cards, index, (item) => ({
                        ...item,
                      })),
                    )
                  }
                  onMove={(direction) => commit(moveListItem(cards, index, direction))}
                  onDelete={() => commit(cards.filter((_, cardIndex) => cardIndex !== index))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  التصنيف
                </label>
                {categories.length > 0 ? (
                  <select
                    aria-label="التصنيف"
                    value={
                      findMatchingCategoryOption(categories, card.categoryKey)?.id ||
                      CUSTOM_VALUE
                    }
                    onChange={(event) => handleCategorySelect(index, event.target.value)}
                    className={FIELD_INPUT_CLASSNAME}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {buildCategoryOptionLabel(category)}
                      </option>
                    ))}
                    <option value={CUSTOM_VALUE}>مفتاح مخصص</option>
                  </select>
                ) : null}
                {categories.length === 0 ||
                !findMatchingCategoryOption(categories, card.categoryKey) ? (
                  <div className={categories.length > 0 ? "mt-3" : ""}>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      مفتاح التصنيف
                    </label>
                    <input
                      aria-label="مفتاح التصنيف"
                      value={card.categoryKey}
                      onChange={(event) =>
                        updateCard(index, "categoryKey", event.target.value)
                      }
                      placeholder="heels"
                      className={FIELD_INPUT_CLASSNAME}
                    />
                  </div>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  عنوان البطاقة
                </label>
                <input
                  aria-label="عنوان البطاقة"
                  value={card.title}
                  onChange={(event) => updateCard(index, "title", event.target.value)}
                  placeholder="من المكتب إلى العشاء"
                  className={FIELD_INPUT_CLASSNAME}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  الوصف القصير
                </label>
                <textarea
                  aria-label="الوصف القصير"
                  rows={3}
                  value={card.subtitle}
                  onChange={(event) =>
                    updateCard(index, "subtitle", event.target.value)
                  }
                  placeholder="وصف مختصر للتنسيق أو المناسبة"
                  className={FIELD_TEXTAREA_CLASSNAME}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  الـ Mood
                </label>
                <input
                  aria-label="الـ Mood"
                  value={card.mood}
                  onChange={(event) => updateCard(index, "mood", event.target.value)}
                  placeholder="ستايل يومي"
                  className={FIELD_INPUT_CLASSNAME}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  رابط الصورة
                </label>
                <div className="space-y-2">
                  {card.image ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950/50">
                      <img
                        src={card.image}
                        alt={card.title || `بطاقة ${index + 1}`}
                        className="h-32 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      لا توجد صورة محددة لهذه البطاقة
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-label={`اختيار صورة البطاقة ${index + 1}`}
                      onClick={() => setImagePickerCardIndex(index)}
                      className="rounded-md border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                    >
                      اختيار من الحافظة
                    </button>
                    <input
                      aria-label="رابط الصورة"
                      value={card.image || ""}
                      onChange={(event) => updateCard(index, "image", event.target.value)}
                      placeholder="/placeholders/luxury-shoes/pump-black.png"
                      className={FIELD_INPUT_CLASSNAME}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  رابط البطاقة
                </label>
                <input
                  aria-label="رابط البطاقة"
                  value={card.link || ""}
                  onChange={(event) => updateCard(index, "link", event.target.value)}
                  placeholder="/shop?category=heels"
                  className={FIELD_INPUT_CLASSNAME}
                />
              </div>
            </div>
            <QuickFixActions actions={quickFixActions} />
            <ValidationIssueList issues={itemIssues} />
          </div>
          );
        })
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          لا توجد بطاقات مخصصة حتى الآن. سيعتمد القسم على التصنيفات الحالية تلقائيًا ما لم تضيفي بطاقات هنا.
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          commit([
            ...cards,
            {
              categoryKey: "",
              title: "",
              subtitle: "",
              mood: "",
              image: "",
              link: "",
            },
          ])
        }
        className="rounded-md border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
      >
        + إضافة بطاقة Lookbook
      </button>

      <StorefrontImagePickerModal
        isOpen={imagePickerCardIndex !== null}
        onClose={() => setImagePickerCardIndex(null)}
        selectedUrl={
          imagePickerCardIndex !== null ? cards[imagePickerCardIndex]?.image || "" : ""
        }
        title="اختيار صورة بطاقة Lookbook"
        description="اختاري صورة من الحافظة أو ارفعي صورة جديدة لتظهر مباشرة داخل بطاقة اللوك بوك."
        emptyDescription="ارفعي أول صورة أو اختاري صورة محفوظة لربطها مباشرة ببطاقة اللوك بوك."
        onSelectImage={(imageUrl) => {
          if (imagePickerCardIndex === null) {
            return;
          }

          updateCard(imagePickerCardIndex, "image", imageUrl);
          setImagePickerCardIndex(null);
        }}
      />
    </div>
  );
};

const SizeGuideRowsEditor: React.FC<{
  value: string;
  categories: StorefrontEditorCategoryOption[];
  products: StorefrontEditorProductOption[];
  catalogLoading: boolean;
  issues: StorefrontPageValidationIssue[];
  onChange: (nextValue: string) => void;
}> = ({ value, categories, products, catalogLoading, issues, onChange }) => {
  const rows = parseEditableSizeGuideRows(value);

  const commit = (nextRows: SizeGuideRowConfig[]) => {
    onChange(serializeSizeGuideRows(nextRows));
  };

  const updateRow = (index: number, key: keyof SizeGuideRowConfig, nextValue: string) => {
    const nextRows = rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [key]: nextValue } : row,
    );
    commit(nextRows);
  };

  const updateRowShape = (
    index: number,
    updater: (currentRow: SizeGuideRowConfig) => SizeGuideRowConfig,
  ) => {
    const nextRows = rows.map((row, rowIndex) =>
      rowIndex === index ? updater(row) : row,
    );
    commit(nextRows);
  };

  const removeRow = (index: number) => {
    commit(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">
        اختاري الـ Target من المنتجات أو التصنيفات الحالية لتفادي كتابة الـ slug يدويًا.
      </p>
      {rows.length > 0 ? (
        rows.map((row, index) => {
          const itemIssues = issues.filter((issue) => issue.itemIndex === index);
          const tone = getIssueTone(itemIssues);
          const parsedTarget = parseTargetReference(row.target);
          const isDuplicateRow = rows.some(
            (candidate, candidateIndex) =>
              candidateIndex < index &&
              normalizeLookupValue(candidate.target) === normalizeLookupValue(row.target) &&
              normalizeLookupValue(candidate.eu) === normalizeLookupValue(row.eu) &&
              Boolean(row.target) &&
              Boolean(row.eu),
          );
          const quickFixActions: QuickFixAction[] = [];

          if (
            itemIssues.some((issue) => issue.code === "size_guide_row_missing_required") &&
            !row.target
          ) {
            quickFixActions.push({
              label: "تعيين Target افتراضي",
              tone: "warning",
              onClick: () => updateRow(index, "target", "default"),
            });
          }

          if (itemIssues.some((issue) => issue.code === "size_guide_row_missing_required")) {
            quickFixActions.push({
              label: "إزالة الصف غير المكتمل",
              tone: "danger",
              onClick: () => removeRow(index),
            });
          }

          if (
            itemIssues.some(
              (issue) =>
                issue.code === "size_guide_unknown_category_target" ||
                issue.code === "size_guide_unknown_product_target",
            )
          ) {
            quickFixActions.push({
              label: "استخدام default بدلًا منه",
              tone: "warning",
              onClick: () => updateRow(index, "target", "default"),
            });
          }

          if (
            itemIssues.some((issue) => issue.code === "size_guide_custom_target") &&
            parsedTarget.kind === "custom"
          ) {
            quickFixActions.push({
              label: "تحويله إلى default",
              tone: "warning",
              onClick: () => updateRow(index, "target", "default"),
            });
          }

          if (
            isDuplicateRow ||
            itemIssues.some((issue) => issue.code === "size_guide_row_duplicate_size")
          ) {
            quickFixActions.push({
              label: "حذف الصف المكرر",
              tone: "danger",
              onClick: () => removeRow(index),
            });
          }

          if (
            itemIssues.some((issue) => issue.code === "size_guide_row_missing_required") &&
            (row.eu || row.uk || row.us || row.cm)
          ) {
            quickFixActions.push({
              label: "إكمال Target إلى default",
              tone: "warning",
              onClick: () =>
                updateRowShape(index, (currentRow) => ({
                  ...currentRow,
                  target: currentRow.target || "default",
                })),
            });
          }

          return (
          <div
            key={`size-guide-row-${index}`}
            className={`rounded-xl border p-4 ${getIssueContainerClassName(tone)}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                صف مقاس #{index + 1}
              </div>
              <StructuredItemActions
                itemLabel="صف المقاس"
                index={index}
                isFirst={index === 0}
                isLast={index === rows.length - 1}
                onDuplicate={() =>
                  commit(
                    duplicateListItem(rows, index, (item) => ({
                      ...item,
                    })),
                  )
                }
                onMove={(direction) => commit(moveListItem(rows, index, direction))}
                onDelete={() => commit(rows.filter((_, rowIndex) => rowIndex !== index))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <div className="col-span-2 lg:col-span-2">
                <TargetReferenceControl
                  target={row.target}
                  categories={categories}
                  products={products}
                  catalogLoading={catalogLoading}
                  onChange={(nextTarget) => updateRow(index, "target", nextTarget)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  EU
                </label>
                <input
                  aria-label="EU"
                  value={row.eu}
                  onChange={(event) => updateRow(index, "eu", event.target.value)}
                  placeholder="36"
                  className={FIELD_INPUT_CLASSNAME}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  UK
                </label>
                <input
                  aria-label="UK"
                  value={row.uk}
                  onChange={(event) => updateRow(index, "uk", event.target.value)}
                  placeholder="3"
                  className={FIELD_INPUT_CLASSNAME}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  US
                </label>
                <input
                  aria-label="US"
                  value={row.us}
                  onChange={(event) => updateRow(index, "us", event.target.value)}
                  placeholder="5"
                  className={FIELD_INPUT_CLASSNAME}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  CM
                </label>
                <input
                  aria-label="CM"
                  value={row.cm}
                  onChange={(event) => updateRow(index, "cm", event.target.value)}
                  placeholder="22.5"
                  className={FIELD_INPUT_CLASSNAME}
                />
              </div>
            </div>
            <QuickFixActions actions={quickFixActions} />
            <ValidationIssueList issues={itemIssues} />
          </div>
          );
        })
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          أضيفي صفوف المقاسات هنا. كل صف يمكن ربطه بـ
          {" "}
          <code>default</code>
          {" "}
          أو
          {" "}
          <code>category:&lt;id&gt;</code>
          {" "}
          أو
          {" "}
          <code>product:&lt;slug&gt;</code>.
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          commit([
            ...rows,
            { target: "default", eu: "", uk: "", us: "", cm: "" },
          ])
        }
        className="rounded-md border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
      >
        + إضافة صف مقاس
      </button>
    </div>
  );
};

const SizeGuideOverridesEditor: React.FC<{
  value: string;
  categories: StorefrontEditorCategoryOption[];
  products: StorefrontEditorProductOption[];
  catalogLoading: boolean;
  issues: StorefrontPageValidationIssue[];
  onChange: (nextValue: string) => void;
}> = ({ value, categories, products, catalogLoading, issues, onChange }) => {
  const overrides = parseEditableSizeGuideOverrides(value);

  const commit = (nextOverrides: SizeGuideOverrideConfig[]) => {
    onChange(serializeSizeGuideOverrides(nextOverrides));
  };

  const updateOverride = (
    index: number,
    key: keyof SizeGuideOverrideConfig,
    nextValue: string,
  ) => {
    const nextOverrides = overrides.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: nextValue } : item,
    );
    commit(nextOverrides);
  };

  const updateOverrideShape = (
    index: number,
    updater: (item: SizeGuideOverrideConfig) => SizeGuideOverrideConfig,
  ) => {
    const nextOverrides = overrides.map((item, itemIndex) =>
      itemIndex === index ? updater(item) : item,
    );
    commit(nextOverrides);
  };

  const applyAutofill = (index: number) => {
    const currentItem = overrides[index];

    if (!currentItem) {
      return;
    }

    updateOverrideShape(index, () =>
      applyTargetAutofillToOverride(
        currentItem,
        currentItem.target,
        categories,
        products,
      ),
    );
  };

  const removeOverride = (index: number) => {
    commit(overrides.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">
        نفس المنطق هنا: default أو تصنيف أو منتج من بيانات المتجر الحالية، مع دعم القيم المخصصة لو كانت محفوظة مسبقًا.
      </p>
      {overrides.length > 0 ? (
        overrides.map((item, index) => {
          const itemIssues = issues.filter((issue) => issue.itemIndex === index);
          const tone = getIssueTone(itemIssues);
          const hasAutofillSummary = Boolean(
            getTargetReferenceSummary(item.target, categories, products),
          );
          const isDuplicateTarget = overrides.some(
            (candidate, candidateIndex) =>
              candidateIndex < index &&
              normalizeLookupValue(candidate.target) === normalizeLookupValue(item.target) &&
              Boolean(item.target),
          );
          const quickFixActions: QuickFixAction[] = [];

          if (
            hasAutofillSummary &&
            (!item.title || !item.subtitle || !item.note)
          ) {
            quickFixActions.push({
              label: "إكمال النصوص تلقائيًا",
              onClick: () => applyAutofill(index),
            });
          }

          if (
            itemIssues.some((issue) => issue.code === "size_guide_override_missing_target")
          ) {
            quickFixActions.push({
              label: "تعيين Target افتراضي",
              tone: "warning",
              onClick: () =>
                updateOverrideShape(index, (currentItem) =>
                  applyTargetAutofillToOverride(
                    currentItem,
                    "default",
                    categories,
                    products,
                  ),
                ),
            });
            quickFixActions.push({
              label: "إزالة التخصيص غير المكتمل",
              tone: "danger",
              onClick: () => removeOverride(index),
            });
          }

          if (
            itemIssues.some(
              (issue) =>
                issue.code === "size_guide_unknown_category_target" ||
                issue.code === "size_guide_unknown_product_target",
            )
          ) {
            quickFixActions.push({
              label: "استخدام default بدلًا منه",
              tone: "warning",
              onClick: () =>
                updateOverrideShape(index, (currentItem) =>
                  applyTargetAutofillToOverride(
                    currentItem,
                    "default",
                    categories,
                    products,
                  ),
                ),
            });
          }

          if (
            isDuplicateTarget ||
            itemIssues.some((issue) => issue.code === "size_guide_override_duplicate_target")
          ) {
            quickFixActions.push({
              label: "حذف التخصيص المكرر",
              tone: "danger",
              onClick: () => removeOverride(index),
            });
          }

          return (
          <div
            key={`size-guide-override-${index}`}
            className={`rounded-xl border p-4 ${getIssueContainerClassName(tone)}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                تخصيص عنوان #{index + 1}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {getTargetReferenceSummary(item.target, categories, products) ? (
                  <button
                    type="button"
                    aria-label={`تعبئة تخصيص ${index + 1} تلقائيًا`}
                    onClick={() => applyAutofill(index)}
                    className="rounded-md border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
                  >
                    تعبئة تلقائية
                  </button>
                ) : null}
                <StructuredItemActions
                  itemLabel="التخصيص"
                  index={index}
                  isFirst={index === 0}
                  isLast={index === overrides.length - 1}
                  onDuplicate={() =>
                    commit(
                      duplicateListItem(overrides, index, (currentItem) => ({
                        ...currentItem,
                      })),
                    )
                  }
                  onMove={(direction) =>
                    commit(moveListItem(overrides, index, direction))
                  }
                  onDelete={() =>
                    commit(overrides.filter((_, itemIndex) => itemIndex !== index))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <TargetReferenceControl
                  target={item.target}
                  categories={categories}
                  products={products}
                  catalogLoading={catalogLoading}
                  onChange={(nextTarget) =>
                    updateOverrideShape(index, (currentItem) =>
                      applyTargetAutofillToOverride(
                        currentItem,
                        nextTarget,
                        categories,
                        products,
                      ),
                    )
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  العنوان
                </label>
                <input
                  aria-label="العنوان"
                  value={item.title || ""}
                  onChange={(event) => updateOverride(index, "title", event.target.value)}
                  placeholder="Crystal Heel Fit"
                  className={FIELD_INPUT_CLASSNAME}
                />
              </div>
              <div className="lg:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  الوصف
                </label>
                <textarea
                  aria-label="الوصف"
                  rows={3}
                  value={item.subtitle || ""}
                  onChange={(event) =>
                    updateOverride(index, "subtitle", event.target.value)
                  }
                  placeholder="وصف قصير لهذا الـ target"
                  className={FIELD_TEXTAREA_CLASSNAME}
                />
              </div>
              <div className="lg:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  الملاحظة
                </label>
                <textarea
                  aria-label="الملاحظة"
                  rows={3}
                  value={item.note || ""}
                  onChange={(event) => updateOverride(index, "note", event.target.value)}
                  placeholder="ملاحظة خاصة بالقياس"
                  className={FIELD_TEXTAREA_CLASSNAME}
                />
              </div>
            </div>
            <QuickFixActions actions={quickFixActions} />
            <ValidationIssueList issues={itemIssues} />
          </div>
          );
        })
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          أضيفي عناوين أو ملاحظات مخصصة لكل target عند الحاجة، وإلا سيُستخدم النص العام للقسم.
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          commit([
            ...overrides,
            { target: "default", title: "", subtitle: "", note: "" },
          ])
        }
        className="rounded-md border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
      >
        + إضافة تخصيص عنوان
      </button>
    </div>
  );
};

interface SortableSectionProps {
  section: SectionEntry;
  enabled: boolean;
  selectedPage: StorefrontPageKey;
  isFocused: boolean;
  focusToken: number;
  isFirst: boolean;
  isLast: boolean;
  availableCategories: StorefrontEditorCategoryOption[];
  availableProducts: StorefrontEditorProductOption[];
  catalogLoading: boolean;
  validationIssues: StorefrontPageValidationIssue[];
  handleToggleSection: (section: SectionEntry, enabled: boolean) => void;
  handleMoveSection: (sectionKey: string, direction: "up" | "down") => void;
  handleSectionVariantChange: (section: SectionEntry, nextVariant: string) => void;
  handleSectionSettingChange: (
    section: SectionEntry,
    field: StorefrontSectionFieldDefinition,
    rawValue: unknown,
  ) => void;
}

const SortableSection: React.FC<SortableSectionProps> = ({
  section,
  enabled,
  selectedPage,
  isFocused,
  focusToken,
  isFirst,
  isLast,
  handleToggleSection,
  availableCategories,
  availableProducts,
  catalogLoading,
  validationIssues,
  handleMoveSection,
  handleSectionVariantChange,
  handleSectionSettingChange,
}) => {
  const sectionKey = getSectionKey(section);
  const sectionType = getSectionType(section);
  const editorConfig = getStorefrontSectionManifest(sectionType);
  const currentSettings = getSectionSettings(section);
  const currentVariant = getSectionVariant(section);
  const sectionTone = enabled ? getIssueTone(validationIssues) : null;
  const sectionContainerRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolledRef = useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    if (hasAutoScrolledRef.current && focusToken === 0) {
      return;
    }

    hasAutoScrolledRef.current = true;
    sectionContainerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [focusToken, isFocused]);

  const handleSectionRef = (node: HTMLDivElement | null) => {
    sectionContainerRef.current = node;
    setNodeRef(node);
  };

  return (
    <div
      ref={handleSectionRef}
      style={style}
      className={`rounded-2xl border p-4 transition-colors ${
        isFocused
          ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-amber-300 dark:ring-offset-gray-950 shadow-lg"
          : ""
      } ${
        enabled
          ? sectionTone
            ? `${getIssueContainerClassName(sectionTone)} shadow-sm`
            : "border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/20 shadow-sm"
          : "border-gray-200 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-900/20"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            {...attributes}
            {...listeners}
            className={`cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${
              !enabled ? "opacity-30 cursor-not-allowed" : ""
            }`}
          >
            <Bars3Icon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {getSectionDisplayLabel(section)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              المفتاح: {sectionType}
              {currentVariant ? ` • variant: ${currentVariant}` : ""}
            </div>
            {validationIssues.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
                {validationIssues.some((issue) => issue.severity === "error") ? (
                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                    أخطاء: {validationIssues.filter((issue) => issue.severity === "error").length}
                  </span>
                ) : null}
                {validationIssues.some((issue) => issue.severity === "warning") ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                    تحذيرات: {validationIssues.filter((issue) => issue.severity === "warning").length}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => handleToggleSection(section, event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            ظاهر
          </label>
          <div className="flex border-l border-gray-200 dark:border-gray-700 ml-2 pl-2 gap-1">
            <button
              type="button"
              onClick={() => handleMoveSection(sectionKey, "up")}
              disabled={!enabled || isFirst}
              className={`p-2 rounded-md ${
                !enabled || isFirst
                  ? "bg-gray-200/50 text-gray-400 dark:bg-gray-700/50"
                  : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
              title="تحريك للأعلى"
            >
              <ChevronUpIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleMoveSection(sectionKey, "down")}
              disabled={!enabled || isLast}
              className={`p-2 rounded-md ${
                !enabled || isLast
                  ? "bg-gray-200/50 text-gray-400 dark:bg-gray-700/50"
                  : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
              title="تحريك للأسفل"
            >
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {enabled && editorConfig ? (
        <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/70 space-y-4">
          <ValidationSummaryCard
            title={`مراجعة قسم ${getSectionDisplayLabel(section)}`}
            issues={validationIssues}
            maxVisible={4}
          />

          {editorConfig.note ? (
            <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">{editorConfig.note}</p>
          ) : null}

          {editorConfig.variants && editorConfig.variants.length > 0 ? (
            <div className="space-y-2">
              <label
                htmlFor={`${selectedPage}-${sectionKey}-variant`}
                className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                النسخة البصرية
              </label>
              <select
                id={`${selectedPage}-${sectionKey}-variant`}
                value={currentVariant}
                onChange={(event) => handleSectionVariantChange(section, event.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {editorConfig.variants.map((variantOption) => (
                  <option key={variantOption.value} value={variantOption.value}>
                    {variantOption.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {editorConfig.fields && editorConfig.fields.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {editorConfig.fields.map((field) => {
                const fieldId = `${selectedPage}-${sectionKey}-${field.key}`;
                const inputValue = getStorefrontSectionFieldDisplayValue(
                  currentSettings,
                  field.key,
                );
                const fieldIssues = validationIssues.filter(
                  (issue) => issue.fieldKey === field.key,
                );
                const fieldLevelIssues = fieldIssues.filter(
                  (issue) => typeof issue.itemIndex !== "number",
                );

                const customFieldEditor =
                  field.key === "categoryCards" ? (
                    <LookbookCardsEditor
                      value={inputValue}
                      categories={availableCategories}
                      catalogLoading={catalogLoading}
                      issues={fieldIssues}
                      onChange={(nextValue) => handleSectionSettingChange(section, field, nextValue)}
                    />
                  ) : field.key === "guideRows" ? (
                    <SizeGuideRowsEditor
                      value={inputValue}
                      categories={availableCategories}
                      products={availableProducts}
                      catalogLoading={catalogLoading}
                      issues={fieldIssues}
                      onChange={(nextValue) => handleSectionSettingChange(section, field, nextValue)}
                    />
                  ) : field.key === "guideOverrides" ? (
                    <SizeGuideOverridesEditor
                      value={inputValue}
                      categories={availableCategories}
                      products={availableProducts}
                      catalogLoading={catalogLoading}
                      issues={fieldIssues}
                      onChange={(nextValue) => handleSectionSettingChange(section, field, nextValue)}
                    />
                  ) : null;

                return (
                  <div key={field.key} className={field.type === "textarea" ? "lg:col-span-2" : ""}>
                    <label
                      htmlFor={fieldId}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {field.label}
                    </label>
                    {customFieldEditor ? (
                      customFieldEditor
                    ) : field.type === "textarea" ? (
                      <textarea
                        id={fieldId}
                        rows={3}
                        value={inputValue}
                        onChange={(event) => handleSectionSettingChange(section, field, event.target.value)}
                        placeholder={field.placeholder}
                        className={FIELD_TEXTAREA_CLASSNAME}
                      />
                    ) : field.type === "select" ? (
                      <select
                        id={fieldId}
                        value={inputValue}
                        onChange={(event) => handleSectionSettingChange(section, field, event.target.value)}
                        className={FIELD_INPUT_CLASSNAME}
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "checkbox" ? (
                      <div className="flex items-center gap-2 py-2">
                        <input
                          id={fieldId}
                          type="checkbox"
                          checked={Boolean(inputValue)}
                          onChange={(event) =>
                            handleSectionSettingChange(section, field, event.target.checked)
                          }
                          className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900"
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {field.placeholder || "تفعيل"}
                        </span>
                      </div>
                    ) : (
                      <input
                        id={fieldId}
                        type={field.type === "number" ? "number" : field.type}
                        min={field.type === "number" ? 1 : undefined}
                        value={inputValue}
                        onChange={(event) => handleSectionSettingChange(section, field, event.target.value)}
                        placeholder={field.placeholder}
                        className={FIELD_INPUT_CLASSNAME}
                      />
                    )}
                    {field.helperText ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helperText}</p>
                    ) : null}
                    <ValidationIssueList issues={fieldLevelIssues} />
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const StorefrontPageSectionsEditor: React.FC<
  StorefrontPageSectionsEditorProps
> = ({
  themeId,
  designTokens,
  availableCategories = [],
  availableProducts = [],
  catalogLoading = false,
  validationIssues = [],
  initialPage,
  allowedPages,
  focusedSectionType,
  hideAddPageButton = false,
  onChange,
}) => {
  const [selectedPage, setSelectedPage] = useState<StorefrontPageKey>(initialPage || "home");
  const appliedInitialPageRef = useRef<StorefrontPageKey | null>(null);
  const [focusedSectionTarget, setFocusedSectionTarget] = useState<{
    type: string;
    token: number;
  }>({
    type: focusedSectionType || "",
    token: focusedSectionType ? 1 : 0,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeTheme = getStorefrontThemePreset(
    themeId || DEFAULT_STOREFRONT_THEME_ID,
  );

  const pageOverrides = getStorefrontPageOverridesFromDesignTokens(designTokens);
  const normalizedAllowedPages = useMemo(() => {
    if (!allowedPages || allowedPages.length === 0) {
      return [];
    }

    return Array.from(
      new Set(
        allowedPages
          .map((pageKey) => pageKey?.trim())
          .filter((pageKey): pageKey is StorefrontPageKey => Boolean(pageKey)),
      ),
    );
  }, [allowedPages]);
  const availablePageKeys = useMemo(() => {
    const themePageKeys = Object.keys(activeTheme.pages).filter(
      (pageKey): pageKey is StorefrontPageKey => Boolean(activeTheme.pages[pageKey]),
    );
    const extraThemePageKeys = themePageKeys.filter(
      (pageKey) => !isDefaultPageKey(pageKey),
    );
    const extraOverridePageKeys = Object.keys(pageOverrides).filter(
      (pageKey) =>
        !isDefaultPageKey(pageKey) &&
        !themePageKeys.includes(pageKey as StorefrontPageKey),
    ) as StorefrontPageKey[];

    const allPageKeys = [
      ...STOREFRONT_PAGE_KEYS.filter(
        (pageKey) => Boolean(activeTheme.pages[pageKey] || pageOverrides[pageKey]),
      ),
      ...extraThemePageKeys,
      ...extraOverridePageKeys,
    ];

    if (normalizedAllowedPages.length === 0) {
      return allPageKeys;
    }

    const filteredPageKeys = allPageKeys.filter((pageKey) =>
      normalizedAllowedPages.includes(pageKey),
    );

    return filteredPageKeys.length > 0 ? filteredPageKeys : allPageKeys;
  }, [activeTheme.pages, normalizedAllowedPages, pageOverrides]);

  const currentSections = useMemo(() => {
    const pageData = activeTheme.pages[selectedPage];
    const overrideSections =
      pageOverrides[selectedPage]?.sections as SectionEntry[] | undefined;

    if (!pageData && !overrideSections) {
      return {
        base: [],
        current: [],
        display: [],
      };
    }

    const baseSections = (pageData?.sections || []) as SectionEntry[];
    const displayBaseSections =
      baseSections.length > 0 ? baseSections : overrideSections || [];
    const activeSections = overrideSections || displayBaseSections;

    return {
        base: displayBaseSections,
        current: activeSections,
        display: getDisplaySections(displayBaseSections, activeSections, selectedPage),
      };
  }, [activeTheme.pages, pageOverrides, selectedPage]);

  const pageMapCards = useMemo<StorefrontPageMapCard[]>(() => {
    return availablePageKeys.map((pageKey) => {
      const baseSections = (activeTheme.pages[pageKey]?.sections || []) as SectionEntry[];
      const overrideSections =
        pageOverrides[pageKey]?.sections as SectionEntry[] | undefined;
      const displayBaseSections =
        baseSections.length > 0 ? baseSections : overrideSections || [];
      const activeSections = overrideSections || displayBaseSections;
      const displaySections = getDisplaySections(
        displayBaseSections,
        activeSections,
        pageKey,
      );
      const currentSectionKeys = new Set(activeSections.map(getSectionKey));
      const displayBaseSectionKeys = new Set(
        displayBaseSections.map(getSectionKey),
      );
      const issues = validationIssues.filter((issue) => issue.pageKey === pageKey);
      const errorCount = issues.filter(
        (issue) => issue.severity === "error",
      ).length;
      const warningCount = issues.filter(
        (issue) => issue.severity === "warning",
      ).length;
      const pageCopy = PAGE_STAGE_COPY[pageKey];

      return {
        pageKey,
        label: getPageLabel(pageKey),
        stage: pageCopy?.stage || "صفحة إضافية",
        description:
          pageCopy?.description ||
          "صفحة مخصصة داخل المتجر يمكنك ترتيب أقسامها بنفس مكتبة القالب.",
        currentCount: activeSections.length,
        hiddenCount: displayBaseSections.filter(
          (section) => !currentSectionKeys.has(getSectionKey(section)),
        ).length,
        optionalCount: displaySections.filter(
          ({ enabled, section }) =>
            !enabled && !displayBaseSectionKeys.has(getSectionKey(section)),
        ).length,
        issueCount: issues.length,
        errorCount,
        warningCount,
        isCustomized: Boolean(pageOverrides[pageKey]),
        previewSections: activeSections
          .slice(0, 3)
          .map((section) => getSectionDisplayLabel(section)),
      };
    });
  }, [activeTheme.pages, availablePageKeys, pageOverrides, validationIssues]);

  const selectedPageCard = useMemo(
    () => pageMapCards.find((card) => card.pageKey === selectedPage) || null,
    [pageMapCards, selectedPage],
  );

  const totalVisibleSections = useMemo(
    () =>
      pageMapCards.reduce((total, card) => total + card.currentCount, 0),
    [pageMapCards],
  );

  const customizedPagesCount = useMemo(
    () => pageMapCards.filter((card) => card.isCustomized).length,
    [pageMapCards],
  );

  const pagesWithIssuesCount = useMemo(
    () => pageMapCards.filter((card) => card.issueCount > 0).length,
    [pageMapCards],
  );

  const primaryJourneyCards = useMemo(
    () =>
      PRIMARY_PAGE_FLOW.map((pageKey) =>
        pageMapCards.find((card) => card.pageKey === pageKey),
      ).filter((card): card is StorefrontPageMapCard => Boolean(card)),
    [pageMapCards],
  );

  const supportJourneyCards = useMemo(
    () =>
      SUPPORT_PAGE_FLOW.map((pageKey) =>
        pageMapCards.find((card) => card.pageKey === pageKey),
      ).filter((card): card is StorefrontPageMapCard => Boolean(card)),
    [pageMapCards],
  );

  const extraJourneyCards = useMemo(
    () =>
      pageMapCards.filter(
        (card) =>
          !PRIMARY_PAGE_FLOW.includes(card.pageKey) &&
          !SUPPORT_PAGE_FLOW.includes(card.pageKey),
      ),
    [pageMapCards],
  );

  const availablePdpShortcuts = useMemo(() => {
    if (selectedPage !== "pdp") {
      return [];
    }

    const visibleSectionTypes = new Set(
      currentSections.display.map(({ section }) => getSectionType(section)),
    );

    return PDP_SECTION_SHORTCUTS.filter((shortcut) =>
      visibleSectionTypes.has(shortcut.type),
    );
  }, [currentSections.display, selectedPage]);
  const pdpCheckoutDisplayEntry = useMemo(() => {
    if (selectedPage !== "pdp") {
      return null;
    }

    return (
      currentSections.display.find(
        ({ section }) => getSectionType(section) === PDP_CHECKOUT_SECTION_ID,
      ) || null
    );
  }, [currentSections.display, selectedPage]);
  const isPdpCheckoutVisible = useMemo(
    () => selectedPage === "pdp" && pdpCheckoutDisplayEntry !== null,
    [pdpCheckoutDisplayEntry, selectedPage],
  );

  const effectiveFocusedSectionType =
    focusedSectionTarget.type || focusedSectionType || "";

  useEffect(() => {
    if (
      initialPage &&
      availablePageKeys.includes(initialPage) &&
      appliedInitialPageRef.current !== initialPage
    ) {
      appliedInitialPageRef.current = initialPage;
      setSelectedPage(initialPage);
      return;
    }

    if (!availablePageKeys.includes(selectedPage)) {
      setSelectedPage(availablePageKeys[0] || "home");
    }
  }, [availablePageKeys, initialPage, selectedPage]);

  useEffect(() => {
    if (!focusedSectionType) {
      return;
    }

    setFocusedSectionTarget((current) => ({
      type: focusedSectionType,
      token:
        current.type === focusedSectionType ? current.token : current.token + 1,
    }));
  }, [focusedSectionType]);

  const pageValidationIssues = useMemo(
    () =>
      validationIssues.filter((issue) => issue.pageKey === selectedPage),
    [selectedPage, validationIssues],
  );

  const commitPageSections = (
    pageKey: StorefrontPageKey,
    nextSections: SectionEntry[],
  ) => {
    const nextOverrides = { ...pageOverrides };
    const baseSections = (activeTheme.pages[pageKey]?.sections || []) as SectionEntry[];
    const normalizedSections = nextSections.map((section) => {
      const baseSection = baseSections.find(
        (entry) => getSectionKey(entry) === getSectionKey(section),
      );

      if (typeof section === "string") {
        return section;
      }

      return finalizeSectionEntry(normalizeSectionConfig(section), baseSection);
    });

    if (normalizedSections.length === 0) {
      delete nextOverrides[pageKey];
    } else if (baseSections.length > 0 && areSectionsEqual(normalizedSections, baseSections)) {
      delete nextOverrides[pageKey];
    } else {
      nextOverrides[pageKey] = { sections: normalizedSections };
    }

    onChange(upsertStorefrontPageOverridesInDesignTokens(designTokens, nextOverrides));
  };

  const handleToggleSection = (section: SectionEntry, enabled: boolean) => {
    const sectionKey = getSectionKey(section);
    const baseSections = (activeTheme.pages[selectedPage]?.sections || []) as SectionEntry[];
    const nextSections = [...currentSections.current];

    if (enabled) {
      if (nextSections.some((entry) => getSectionKey(entry) === sectionKey)) {
        return;
      }

      const baseIndex = baseSections.findIndex(
        (entry) => getSectionKey(entry) === sectionKey,
      );
      const insertAt = nextSections.findIndex((entry) => {
        const candidateIndex = baseSections.findIndex(
          (baseEntry) => getSectionKey(baseEntry) === getSectionKey(entry),
        );
        return candidateIndex > baseIndex;
      });

      if (insertAt === -1) {
        nextSections.push(section);
      } else {
        nextSections.splice(insertAt, 0, section);
      }
    } else {
      const filteredSections = nextSections.filter(
        (entry) => getSectionKey(entry) !== sectionKey,
      );
      commitPageSections(selectedPage, filteredSections);
      return;
    }

    commitPageSections(selectedPage, nextSections);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = currentSections.current.findIndex(
        (entry) => getSectionKey(entry) === active.id,
      );
      const newIndex = currentSections.current.findIndex(
        (entry) => getSectionKey(entry) === over.id,
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const nextSections = arrayMove(currentSections.current, oldIndex, newIndex) as SectionEntry[];
        commitPageSections(selectedPage, nextSections);
      }
    }
  };

  const handleMoveSection = (sectionKey: string, direction: "up" | "down") => {
    const nextSections = [...currentSections.current];
    const currentIndex = nextSections.findIndex(
      (entry) => getSectionKey(entry) === sectionKey,
    );

    if (currentIndex === -1) {
      return;
    }

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= nextSections.length) {
      return;
    }

    const a = nextSections[currentIndex]!;
    const b = nextSections[swapIndex]!;
    nextSections[currentIndex] = b;
    nextSections[swapIndex] = a;

    commitPageSections(selectedPage, nextSections);
  };

  const handleSectionVariantChange = (section: SectionEntry, nextVariant: string) => {
    const sectionKey = getSectionKey(section);
    const baseSections = (activeTheme.pages[selectedPage]?.sections || []) as SectionEntry[];
    const nextSections = currentSections.current.map((entry) => {
      if (getSectionKey(entry) !== sectionKey) {
        return entry;
      }

      const baseSection = baseSections.find(
        (candidate) => getSectionKey(candidate) === sectionKey,
      ) as SectionEntry | undefined;
      const nextSectionConfig = {
        ...normalizeSectionConfig(entry),
        variant: nextVariant,
      };

      return finalizeSectionEntry(nextSectionConfig, baseSection);
    });

    commitPageSections(selectedPage, nextSections);
  };

  const handleSectionSettingChange = (
    section: SectionEntry,
    field: StorefrontSectionFieldDefinition,
    rawValue: unknown,
  ) => {
    const sectionKey = getSectionKey(section);
    const baseSections = (activeTheme.pages[selectedPage]?.sections || []) as SectionEntry[];
    const rawTextValue =
      typeof rawValue === "string"
        ? rawValue
        : rawValue === null || rawValue === undefined
          ? ""
          : String(rawValue);
    const nextSections = currentSections.current.map((entry) => {
      if (getSectionKey(entry) !== sectionKey) {
        return entry;
      }

      const baseSection = baseSections.find(
        (candidate) => getSectionKey(candidate) === sectionKey,
      ) as SectionEntry | undefined;
      const nextSectionConfig = normalizeSectionConfig(entry);
      const nextSettings = {
        ...(nextSectionConfig.settings || {}),
      };

      if (field.type === "number") {
        const parsedValue = Number(rawValue);
        if (Number.isFinite(parsedValue) && parsedValue > 0) {
          nextSettings[field.key] = parsedValue;
        } else {
          delete nextSettings[field.key];
        }
      } else if (field.type === "checkbox") {
        if (rawValue) {
          nextSettings[field.key] = true;
        } else {
          delete nextSettings[field.key];
        }
      } else if (field.type === "select") {
        if (rawValue === "true") {
          nextSettings[field.key] = true;
        } else if (rawValue === "false") {
          nextSettings[field.key] = false;
        } else if (rawTextValue.length > 0) {
          nextSettings[field.key] = rawTextValue;
        } else {
          delete nextSettings[field.key];
        }
      } else {
        if (rawTextValue.length > 0) {
          nextSettings[field.key] = rawTextValue;
        } else {
          delete nextSettings[field.key];
        }
      }

      return finalizeSectionEntry(
        {
          ...nextSectionConfig,
          settings: nextSettings,
        },
        baseSection,
      );
    });

    commitPageSections(selectedPage, nextSections);
  };

  const handleResetPage = () => {
    const defaultSections = activeTheme.pages[selectedPage]?.sections as SectionEntry[] | undefined;
    if (defaultSections) {
      commitPageSections(selectedPage, defaultSections);
      return;
    }

    const nextOverrides = { ...pageOverrides };
    delete nextOverrides[selectedPage];
    onChange(upsertStorefrontPageOverridesInDesignTokens(designTokens, nextOverrides));
  };

  const handleFocusSectionShortcut = (sectionType: string) => {
    setFocusedSectionTarget((current) => ({
      type: sectionType,
      token: current.token + 1,
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            محرر الصفحات والأقسام
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            يمكنك هنا تخصيص الصفحات الأساسية والإضافية، وإعادة ترتيب الأقسام أو إنشاء صفحات عامة جديدة بدون بناء قالب منفصل.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetPage}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowPathIcon className="w-4 h-4" />
          إعادة صفحة {getPageLabel(selectedPage)}
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,247,255,0.98),rgba(237,245,255,0.96))] shadow-sm dark:border-gray-700 dark:bg-[linear-gradient(135deg,rgba(17,24,39,0.94),rgba(17,24,39,0.9),rgba(30,41,59,0.92))]">
        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white dark:bg-indigo-500">
                خريطة أجزاء الموقع
              </div>
              <h5 className="text-lg font-bold text-gray-900 dark:text-white">
                شوف رحلة الزبون من أول الصفحة الرئيسية لحد الدفع
              </h5>
              <p className="max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
                اختَر أي صفحة من الخريطة لتعرف وظيفتها، عدد أقسامها، وما إذا
                كانت تحتاج مراجعة قبل الحفظ.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-gray-700/80 dark:bg-gray-900/50">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  عدد الصفحات
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {pageMapCards.length} صفحات
                </div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-gray-700/80 dark:bg-gray-900/50">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  الأقسام الظاهرة
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {totalVisibleSections} قسم
                </div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-gray-700/80 dark:bg-gray-900/50">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  صفحات مخصصة
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {customizedPagesCount} صفحات
                </div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-gray-700/80 dark:bg-gray-900/50">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  تحتاج مراجعة
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {pagesWithIssuesCount} صفحات
                </div>
              </div>
            </div>

            {selectedPageCard ? (
              <div className="rounded-[24px] border border-indigo-200 bg-white/90 p-4 dark:border-indigo-900/70 dark:bg-gray-900/60">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
                      الصفحة المفتوحة الآن
                    </div>
                    <div className="mt-2 text-base font-bold text-gray-900 dark:text-white">
                      {selectedPageCard.label}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {selectedPageCard.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300">
                      {selectedPageCard.currentCount} أقسام ظاهرة
                    </span>
                    {selectedPageCard.hiddenCount > 0 ? (
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300">
                        {selectedPageCard.hiddenCount} مخفية
                      </span>
                    ) : null}
                    {selectedPageCard.issueCount > 0 ? (
                      <span
                        className={`rounded-full px-3 py-1 ${
                          selectedPageCard.errorCount > 0
                            ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                            : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                        }`}
                      >
                        {selectedPageCard.issueCount} ملاحظات
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {primaryJourneyCards.length > 0 ? (
            <div className="rounded-[24px] border border-white/70 bg-white/70 p-4 dark:border-gray-700/70 dark:bg-gray-900/50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    الرحلة الأساسية
                  </div>
                  <div className="text-xs leading-6 text-gray-500 dark:text-gray-400">
                    هذا هو التسلسل الطبيعي لرحلة الشراء داخل المتجر.
                  </div>
                </div>
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-bold text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
                  اختصار سريع
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {primaryJourneyCards.map((card, index) => (
                  <React.Fragment key={card.pageKey}>
                    <button
                      type="button"
                      onClick={() => setSelectedPage(card.pageKey)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                        selectedPage === card.pageKey
                          ? "bg-indigo-600 text-white dark:bg-indigo-500"
                          : "border border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-200 dark:hover:border-indigo-800 dark:hover:text-indigo-300"
                      }`}
                    >
                      {card.label}
                    </button>
                    {index < primaryJourneyCards.length - 1 ? (
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                    ) : null}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-gray-200/80 bg-white/60 p-5 dark:border-gray-700/80 dark:bg-gray-950/20">
          {primaryJourneyCards.length > 0 ? (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    صفحات رحلة الشراء
                  </div>
                  <div className="text-xs leading-6 text-gray-500 dark:text-gray-400">
                    الرئيسية، المتجر، المنتج، السلة، والدفع.
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {primaryJourneyCards.map((card) => (
                  <PageMapCard
                    key={card.pageKey}
                    card={card}
                    selected={selectedPage === card.pageKey}
                    onSelect={setSelectedPage}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {supportJourneyCards.length > 0 ? (
            <div className={primaryJourneyCards.length > 0 ? "mt-5" : ""}>
              <div className="mb-3">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  صفحات داعمة
                </div>
                <div className="text-xs leading-6 text-gray-500 dark:text-gray-400">
                  صفحات تخدم العروض، التصنيفات، الإلهام، والمعلومات المساندة.
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {supportJourneyCards.map((card) => (
                  <PageMapCard
                    key={card.pageKey}
                    card={card}
                    selected={selectedPage === card.pageKey}
                    onSelect={setSelectedPage}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {extraJourneyCards.length > 0 ? (
            <div className="mt-5">
              <div className="mb-3">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  صفحات إضافية
                </div>
                <div className="text-xs leading-6 text-gray-500 dark:text-gray-400">
                  صفحات مخصصة أُضيفت فوق الصفحات القياسية للقالب.
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {extraJourneyCards.map((card) => (
                  <PageMapCard
                    key={card.pageKey}
                    card={card}
                    selected={selectedPage === card.pageKey}
                    onSelect={setSelectedPage}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
          اختيار الصفحة
        </span>
        {pageMapCards.map((card) => {
          const isCorePage = isDefaultPageKey(card.pageKey);
          return (
            <button
              key={card.pageKey}
              type="button"
              onClick={() => setSelectedPage(card.pageKey)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                selectedPage === card.pageKey
                  ? "bg-indigo-600 text-white"
                  : isCorePage
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span>
                  {card.label} ({card.currentCount})
                </span>
                {card.issueCount > 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      selectedPage === card.pageKey
                        ? "bg-white/20 text-white"
                        : card.errorCount > 0
                          ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                    }`}
                  >
                    {card.issueCount}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}

        {!hideAddPageButton ? (
          <button
            type="button"
            onClick={() => {
              const name = window.prompt("أدخل اسم الصفحة الجديدة (بالإنجيزية، مثال: about-us):");
              if (name && name.trim()) {
                const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
                if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
                  alert("اسم الصفحة يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وشرطات فقط.");
                  return;
                }
                if (pageOverrides[slug as StorefrontPageKey] || activeTheme.pages[slug]) {
                  alert("هذه الصفحة موجودة بالفعل.");
                  return;
                }
                const nextOverrides = {
                  ...pageOverrides,
                  [slug]: { sections: [...STOREFRONT_CUSTOM_PAGE_STARTER_SECTIONS] },
                };
                onChange(upsertStorefrontPageOverridesInDesignTokens(designTokens, nextOverrides));
                setSelectedPage(slug as StorefrontPageKey);
              }
            }}
            className="rounded-full border border-dashed border-gray-300 px-4 py-2 text-sm font-semibold text-gray-500 transition-colors hover:border-indigo-500 hover:text-indigo-500"
          >
            + إضافة صفحة جديدة
          </button>
        ) : null}
      </div>

      <div className="mt-5">
        <ValidationSummaryCard
          title={`مراجعة صفحة ${getPageLabel(selectedPage)}`}
          issues={pageValidationIssues}
        />
      </div>

      {selectedPage === "pdp" && availablePdpShortcuts.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                اختصارات صفحة المنتج
              </h5>
              <p className="mt-1 text-xs leading-6 text-gray-600 dark:text-gray-300">
                استخدم هذه الاختصارات للتنقل السريع بين أهم أجزاء قالب صفحة المنتج أثناء التعديل.
              </p>
            </div>
            <div className="text-xs text-indigo-700 dark:text-indigo-300">
              يتم التمرير مباشرة إلى القسم المختار داخل المحرر.
            </div>
          </div>

          {pdpCheckoutDisplayEntry ? (
            <div className="mt-4 rounded-2xl border border-indigo-100 bg-white/90 p-4 dark:border-indigo-900/70 dark:bg-gray-900/50">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      حالة الشيك أوت داخل صفحة المنتج
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isPdpCheckoutVisible
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                      }`}
                    >
                      {isPdpCheckoutVisible ? "ظاهر الآن" : "غير ظاهر حاليًا"}
                    </span>
                  </div>
                  <p className="text-xs leading-6 text-gray-600 dark:text-gray-300">
                    عند التفعيل سيظهر مسار Checkout مدمج داخل صفحة المنتج ويعيد استخدام نفس نموذج الدفع الحالي بدون تكرار في منطق الطلب.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleSection(
                        pdpCheckoutDisplayEntry.section,
                        !isPdpCheckoutVisible,
                      )
                    }
                    className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                      isPdpCheckoutVisible
                        ? "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30"
                        : "border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                    }`}
                  >
                    {isPdpCheckoutVisible ? "إخفاء الشيك أوت" : "إظهار الشيك أوت"}
                  </button>

                  {isPdpCheckoutVisible ? (
                    <button
                      type="button"
                      onClick={() => handleFocusSectionShortcut(PDP_CHECKOUT_SECTION_ID)}
                      className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/60"
                    >
                      الانتقال للقسم
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {availablePdpShortcuts.map((shortcut) => {
              const isActiveShortcut = effectiveFocusedSectionType === shortcut.type;

              return (
                <button
                  key={shortcut.type}
                  type="button"
                  onClick={() => handleFocusSectionShortcut(shortcut.type)}
                  className={`rounded-2xl border px-4 py-3 text-right transition-colors ${
                    isActiveShortcut
                      ? "border-indigo-500 bg-white text-indigo-700 shadow-sm dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-200"
                      : "border-transparent bg-white/80 text-gray-700 hover:border-indigo-200 hover:bg-white dark:bg-gray-900/40 dark:text-gray-200 dark:hover:border-indigo-800"
                  }`}
                >
                  <div className="text-sm font-semibold">{shortcut.label}</div>
                  <div className="mt-1 text-xs leading-6 opacity-80">
                    {shortcut.helperText}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={currentSections.current.map(getSectionKey)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-3">
              {currentSections.display.map(({ section, enabled }: { section: SectionEntry; enabled: boolean }) => {
                const sectionKey = getSectionKey(section);
                const activeIndex = currentSections.current.findIndex(
                  (entry) => getSectionKey(entry) === sectionKey,
                );

                return (
                  <SortableSection
                    key={`${selectedPage}-${sectionKey}`}
                    section={section}
                    enabled={enabled}
                    selectedPage={selectedPage}
                    isFocused={Boolean(effectiveFocusedSectionType) && getSectionType(section) === effectiveFocusedSectionType}
                    focusToken={
                      effectiveFocusedSectionType === getSectionType(section)
                        ? focusedSectionTarget.token
                        : 0
                    }
                    isFirst={activeIndex === 0}
                    isLast={activeIndex === currentSections.current.length - 1}
                    availableCategories={availableCategories}
                    availableProducts={availableProducts}
                    catalogLoading={catalogLoading}
                    validationIssues={
                      enabled && activeIndex !== -1
                        ? pageValidationIssues.filter(
                            (issue) =>
                              issue.sectionIndex === activeIndex &&
                              issue.sectionType === getSectionType(section),
                          )
                        : []
                    }
                    handleToggleSection={handleToggleSection}
                    handleMoveSection={handleMoveSection}
                    handleSectionVariantChange={handleSectionVariantChange}
                    handleSectionSettingChange={handleSectionSettingChange}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default StorefrontPageSectionsEditor;
