import React, { useDeferredValue, useMemo, useState } from "react";
import { CheckCircle2, Grid, Loader2, Search, ShoppingBag, Star, Store } from 'lucide-react';

import { cn } from "../../lib/utils";
import type { StorefrontThemeCatalogItem } from "../../storefront/themes/catalog";
import {
  DEFAULT_STOREFRONT_THEME_ID,
  getStorefrontThemePreset,
} from "../../storefront/themes";
import {
  formatStorefrontThemeDate,
  formatStorefrontThemePrice,
} from "../../utils/storefrontSettingsHelpers";
import { BusinessMetricsStrip } from "../business/BusinessMetrics";
import { BusinessSectionPanel } from "../business/BusinessSurface";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface StorefrontThemeSelectorProps {
  themeCards: StorefrontThemeCatalogItem[];
  activeThemeId: string;
  activatingThemeId?: string | null;
  saving?: boolean;
  onSelect: (themeId: string) => void;
  onActivate: (theme: StorefrontThemeCatalogItem) => void;
  onPurchase: (themeId: string) => void;
}

type ThemeLibraryFilter =
  | "all"
  | "selected"
  | "owned"
  | "ready"
  | "marketplace";

const FILTER_LABELS: Record<ThemeLibraryFilter, string> = {
  all: "الكل",
  selected: "المحدد",
  owned: "مملوكة",
  ready: "جاهزة للتطبيق",
  marketplace: "من المتجر",
};

const matchesThemeFilter = (
  item: StorefrontThemeCatalogItem,
  filter: ThemeLibraryFilter,
  activeThemeId: string,
): boolean => {
  switch (filter) {
    case "selected":
      return item.themeId === activeThemeId;
    case "owned":
      return item.isOwned || item.isCurrentTheme === true;
    case "ready":
      return item.canActivate;
    case "marketplace":
      return item.canPurchase || item.requiresPurchase;
    case "all":
    default:
      return true;
  }
};

const getThemeSortRank = (
  item: StorefrontThemeCatalogItem,
  activeThemeId: string,
): number => {
  if (item.themeId === activeThemeId) {
    return 0;
  }
  if (item.isCurrentTheme) {
    return 1;
  }
  if (item.canActivate) {
    return 2;
  }
  if (item.isOwned) {
    return 3;
  }
  if (item.isFeatured) {
    return 4;
  }
  if (item.canPurchase) {
    return 5;
  }
  return 6;
};

const getThemeStatusLabel = (
  item: StorefrontThemeCatalogItem,
  isSelectable: boolean,
): string => {
  if (item.isCurrentTheme) {
    return "مطبق الآن";
  }
  if (isSelectable) {
    return "جاهز للحفظ";
  }
  if (item.canActivate) {
    return "جاهز للتطبيق";
  }
  if (item.canPurchase || item.requiresPurchase) {
    return "من متجر القوالب";
  }
  return "غير متاح الآن";
};

const StorefrontThemeSelector: React.FC<StorefrontThemeSelectorProps> = ({
  themeCards,
  activeThemeId,
  activatingThemeId,
  saving,
  onSelect,
  onActivate,
  onPurchase,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ThemeLibraryFilter>("all");
  const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase());

  const selectedTheme = useMemo(
    () => themeCards.find((item) => item.themeId === activeThemeId) || null,
    [themeCards, activeThemeId],
  );

  const currentTheme = useMemo(
    () => themeCards.find((item) => item.isCurrentTheme) || null,
    [themeCards],
  );

  const filterOptions = useMemo(
    () =>
      (Object.keys(FILTER_LABELS) as ThemeLibraryFilter[]).map((filterId) => ({
        id: filterId,
        label: FILTER_LABELS[filterId],
        count: themeCards.filter((item) =>
          matchesThemeFilter(item, filterId, activeThemeId),
        ).length,
      })),
    [themeCards, activeThemeId],
  );

  const visibleThemes = useMemo(() => {
    return [...themeCards]
      .filter((item) => matchesThemeFilter(item, activeFilter, activeThemeId))
      .filter((item) => {
        if (!deferredQuery) {
          return true;
        }

        const searchableText = [
          item.name,
          item.themeId,
          item.description,
          item.category.primary.label,
          item.category.secondary.label,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(deferredQuery);
      })
      .sort((left, right) => {
        const rankDifference =
          getThemeSortRank(left, activeThemeId) -
          getThemeSortRank(right, activeThemeId);

        if (rankDifference !== 0) {
          return rankDifference;
        }

        return left.name.localeCompare(right.name, "ar");
      });
  }, [themeCards, activeFilter, activeThemeId, deferredQuery]);

  const readinessMetrics = useMemo(() => {
    const ownedCount = themeCards.filter(
      (item) => item.isOwned || item.isCurrentTheme,
    ).length;
    const readyToApplyCount = themeCards.filter((item) => item.canActivate).length;
    const marketplaceCount = themeCards.filter(
      (item) => item.canPurchase || item.requiresPurchase,
    ).length;

    return [
      {
        title: "إجمالي القوالب",
        value: themeCards.length,
        subtitle: selectedTheme
          ? `المحدد للحفظ: ${selectedTheme.name}`
          : "اختر القالب الذي تريد حفظه أو تطبيقه.",
        tone: "secondary" as const,
        icon: LayoutGrid,
      },
      {
        title: "مملوكة ومفعلة",
        value: ownedCount,
        subtitle: currentTheme
          ? `القالب المطبق الآن: ${currentTheme.name}`
          : "القالب الحالي يظهر هنا بعد التحميل.",
        tone: "success" as const,
        icon: Store,
      },
      {
        title: "جاهزة للتطبيق",
        value: readyToApplyCount,
        subtitle: "يمكن تفعيلها فورًا بعد حفظ أي تغييرات معلقة.",
        tone: "primary" as const,
        icon: CheckCircle2,
      },
      {
        title: "داخل المتجر",
        value: marketplaceCount,
        subtitle: "قوالب تحتاج شراء أو الرجوع إلى مكتبة القوالب.",
        tone: "warning" as const,
        icon: ShoppingCart,
      },
    ];
  }, [themeCards, selectedTheme, currentTheme]);

  const hasSearchOrFilter =
    activeFilter !== "all" || searchQuery.trim().length > 0;

  return (
    <div className="space-y-4">
      <BusinessMetricsStrip
        items={readinessMetrics}
        mobileLayout="grid"
        mobileDensity="compact"
      />

      <BusinessSectionPanel
        title="مكتبة القوالب"
        description="ابحث بسرعة، فلتر الحالة، ثم اختر القالب للحفظ أو طبّقه مباشرة إذا كان جاهزًا."
        headerAside={
          <div className="flex flex-wrap justify-end gap-2">
            {currentTheme ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                المطبق الآن: {currentTheme.name}
              </span>
            ) : null}

            {selectedTheme && selectedTheme.themeId !== currentTheme?.themeId ? (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                المحدد للحفظ: {selectedTheme.name}
              </span>
            ) : null}
          </div>
        }
        className="overflow-hidden rounded-[28px]"
        headerClassName="gap-4"
        contentClassName="space-y-5"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ابحث باسم القالب أو الفئة أو الوصف"
              className="h-11 rounded-[18px] bg-background pr-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((filterOption) => {
              const isActive = filterOption.id === activeFilter;

              return (
                <Button
                  key={filterOption.id}
                  type="button"
                  size="sm"
                  variant={isActive ? "secondary" : "ghost"}
                  onClick={() => setActiveFilter(filterOption.id)}
                  className={cn(
                    "rounded-full px-3 text-xs",
                    isActive
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{filterOption.label}</span>
                  <span className="rounded-full bg-background/85 px-1.5 py-0.5 text-[0.68rem] font-semibold text-foreground shadow-sm">
                    {filterOption.count}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {visibleThemes.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
            <div className="mx-auto flex max-w-md flex-col items-center gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
                <Search className="size-5" />
              </span>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  لا يوجد قالب يطابق البحث الحالي
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  جرّب تعديل كلمات البحث أو ارجع إلى عرض كل القوالب لاستعادة
                  النتائج.
                </p>
              </div>
              {hasSearchOrFilter ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setActiveFilter("all");
                    setSearchQuery("");
                  }}
                >
                  مسح البحث والفلاتر
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {visibleThemes.map((catalogTheme) => {
              const theme = getStorefrontThemePreset(
                catalogTheme.themeId || DEFAULT_STOREFRONT_THEME_ID,
              );
              const isSelected = activeThemeId === catalogTheme.themeId;
              const isSelectable = catalogTheme.canSelect || isSelected;
              const isActivating = activatingThemeId === catalogTheme.themeId;
              const pricingLabel = formatStorefrontThemePrice(catalogTheme);
              const trialEndsLabel = formatStorefrontThemeDate(
                catalogTheme.trialEndsAt,
              );
              const previewColors =
                catalogTheme.preview.colors.length > 0
                  ? catalogTheme.preview.colors
                  : [
                      theme.tokens.colors.primary,
                      theme.tokens.colors.secondary,
                      theme.tokens.colors.accent,
                    ].filter((color): color is string => Boolean(color));
              const previewGradient = `linear-gradient(135deg, hsl(${previewColors[0] || "221 83% 53%"}) 0%, hsl(${previewColors[1] || previewColors[0] || "188 73% 46%"}) 100%)`;
              const commerceSections =
                catalogTheme.pageStats.shopSections +
                catalogTheme.pageStats.checkoutSections;
              const statusLabel = getThemeStatusLabel(catalogTheme, isSelectable);
              const unavailable =
                !isSelectable &&
                !catalogTheme.canActivate &&
                !catalogTheme.canPurchase;

              return (
                <article
                  key={catalogTheme.themeId}
                  className={cn(
                    "group overflow-hidden rounded-[28px] border bg-card/95 p-4 text-right shadow-[0_28px_72px_-56px_rgba(15,27,45,0.32)] transition-all duration-200",
                    catalogTheme.isCurrentTheme
                      ? "border-primary/25 bg-primary/[0.06]"
                      : isSelected
                        ? "border-primary/15 bg-primary/[0.04]"
                        : "border-border/70 hover:-translate-y-1 hover:border-primary/20",
                    unavailable && "opacity-90",
                  )}
                >
                  <div className="relative">
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-20 rounded-[22px] opacity-70"
                      style={{ background: previewGradient }}
                    />

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {catalogTheme.isCurrentTheme ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[0.72rem] font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                              مطبق الآن
                            </span>
                          ) : null}

                          {isSelected && !catalogTheme.isCurrentTheme ? (
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-[0.72rem] font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                              محدد للحفظ
                            </span>
                          ) : null}

                          {catalogTheme.isOwned && !catalogTheme.isCurrentTheme ? (
                            <span className="rounded-full bg-sky-100 px-3 py-1 text-[0.72rem] font-semibold text-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
                              مملوك لديك
                            </span>
                          ) : null}

                          {catalogTheme.isFeatured ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-[0.72rem] font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                              مميز
                            </span>
                          ) : null}
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {catalogTheme.name}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {catalogTheme.themeId}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        <span className="rounded-full bg-background/90 px-3 py-1 text-[0.72rem] font-semibold text-foreground shadow-sm">
                          {catalogTheme.category.primary.label}
                        </span>
                        <span className="rounded-full bg-background/75 px-3 py-1 text-[0.72rem] font-medium text-muted-foreground shadow-sm">
                          {catalogTheme.category.secondary.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {catalogTheme.description}
                  </p>

                  <div className="mt-4 overflow-hidden rounded-[24px] border border-border/70 bg-muted/25">
                    {catalogTheme.preview.imageUrl ? (
                      <img
                        src={catalogTheme.preview.imageUrl}
                        alt={catalogTheme.name}
                        loading="lazy"
                        className="h-44 w-full object-cover object-center"
                      />
                    ) : (
                      <div
                        className="flex h-44 items-end justify-between p-4"
                        style={{ background: previewGradient }}
                      >
                        <span className="rounded-full bg-white/80 px-3 py-1 text-[0.72rem] font-semibold text-slate-900 shadow-sm backdrop-blur">
                          {catalogTheme.category.secondary.label}
                        </span>
                        <span className="rounded-full bg-slate-900/15 px-3 py-1 text-[0.72rem] font-medium text-white shadow-sm backdrop-blur">
                          {catalogTheme.pageStats.totalSections} قسم
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {previewColors.slice(0, 4).map((colorValue, index) => (
                      <span
                        key={`${catalogTheme.themeId}-${index}-${colorValue}`}
                        className="size-8 rounded-full border border-white/80 shadow-sm"
                        style={{ backgroundColor: `hsl(${colorValue})` }}
                      />
                    ))}

                    <span className="rounded-full bg-muted/70 px-3 py-1 text-[0.72rem] font-semibold text-foreground">
                      {pricingLabel}
                    </span>

                    {catalogTheme.requiresPurchase ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[0.72rem] font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        يحتاج شراء أولًا
                      </span>
                    ) : null}

                    {catalogTheme.requiresActivation ? (
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-[0.72rem] font-semibold text-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
                        يحتاج تفعيلًا
                      </span>
                    ) : null}

                    {catalogTheme.installationStatus === "TRIAL" && trialEndsLabel ? (
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-[0.72rem] font-semibold text-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
                        تجربة حتى {trialEndsLabel}
                      </span>
                    ) : null}

                    {unavailable ? (
                      <span className="rounded-full bg-muted px-3 py-1 text-[0.72rem] font-semibold text-muted-foreground">
                        غير متاح الآن
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-[18px] bg-muted/50 p-3">
                      <p className="text-[0.72rem] text-muted-foreground">
                        أقسام الرئيسية
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {catalogTheme.pageStats.homeSections}
                      </p>
                    </div>

                    <div className="rounded-[18px] bg-muted/50 p-3">
                      <p className="text-[0.72rem] text-muted-foreground">
                        المتجر والدفع
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {commerceSections}
                      </p>
                    </div>

                    <div className="rounded-[18px] bg-muted/50 p-3">
                      <p className="text-[0.72rem] text-muted-foreground">
                        كل الصفحات
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {catalogTheme.pageStats.totalSections}
                      </p>
                    </div>

                    <div className="rounded-[18px] bg-muted/50 p-3">
                      <p className="text-[0.72rem] text-muted-foreground">الوضع</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {statusLabel}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {!isSelected && isSelectable ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onSelect(catalogTheme.themeId)}
                        disabled={Boolean(saving || activatingThemeId)}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="size-4" />
                        اختيار للحفظ
                      </Button>
                    ) : null}

                    {!isSelectable && catalogTheme.canActivate ? (
                      <Button
                        type="button"
                        onClick={() => onActivate(catalogTheme)}
                        disabled={Boolean(saving || activatingThemeId)}
                        className="gap-1.5 bg-foreground text-background hover:bg-foreground/90"
                      >
                        {isActivating ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Sparkles className="size-4" />
                        )}
                        {isActivating ? "جارٍ التفعيل..." : "تطبيق على المتجر"}
                      </Button>
                    ) : null}

                    {!isSelectable && catalogTheme.canPurchase ? (
                      <Button
                        type="button"
                        onClick={() => onPurchase(catalogTheme.themeId)}
                        disabled={Boolean(saving || activatingThemeId)}
                        className="gap-1.5"
                      >
                        <ShoppingCart className="size-4" />
                        فتح متجر القوالب
                      </Button>
                    ) : null}
                  </div>

                  {isSelected ? (
                    <div className="mt-3 rounded-[20px] bg-muted/60 px-3 py-2 text-sm leading-6 text-muted-foreground">
                      {catalogTheme.isCurrentTheme
                        ? "هذا هو القالب النشط حاليًا على المتجر."
                        : "هذا القالب محدد الآن داخل المسودة، وسيصبح القالب المعتمد بعد حفظ التعديلات."}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </BusinessSectionPanel>
    </div>
  );
};

export default StorefrontThemeSelector;
