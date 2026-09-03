import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Search,
  X,
  SlidersHorizontal,
  Loader2,
  ExternalLink,
  Store,
  CheckCircle2,
} from "lucide-react";
import {
  ALL_CONVERSION_TOOLS,
  CONVERSION_TOOL_META,
  type ConversionToolEntry,
} from "./conversionToolMeta";
import {
  ConversionToolPreviewProvider,
  renderConversionToolMiniPreview,
} from "./conversionToolPreviews";
import type { StorefrontThemeInput } from "../../storefront/engine/themeResolver";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";
import {
  isAppOperational,
  useConversionTools,
} from "./useConversionTools";
import {
  STORE_CONVERSION_APP_LABELS,
  STORE_CONVERSION_PAGES,
  type ManagedMarketplaceAppSlug,
  type StoreConversionToolConfig,
} from "./storeConversionSettingsConfig";
import { useAuth } from "../../hooks/useAuthSimple";
import { buildStorefrontPreviewPath } from "../../storefront/utils/paths";

type StatusFilter = "all" | "active" | "inactive";

const CATEGORY_STYLES: Record<
  string,
  {
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    label: string;
  }
> = {
  "product-conversion": {
    iconBg: "bg-sky-50 dark:bg-sky-950/40",
    iconColor: "text-sky-600 dark:text-sky-400",
    badgeBg: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300",
    label: "صفحة المنتج",
  },
  "offers-bundles": {
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300",
    label: "العروض والحزم",
  },
  "growth-widgets": {
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300",
    label: "محفزات الشراء",
  },
  "selling-modes": {
    iconBg: "bg-purple-50 dark:bg-purple-950/40",
    iconColor: "text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300",
    label: "أنماط البيع",
  },
  "reviews-social-proof": {
    iconBg: "bg-rose-50 dark:bg-rose-950/40",
    iconColor: "text-rose-600 dark:text-rose-400",
    badgeBg: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300",
    label: "التقييمات والثقة",
  },
};

const ToolCard = ({
  entry,
  toolLabel,
  toolBenefit,
  enabled,
  available,
  isSaving,
  onToggle,
  preview,
}: {
  entry: ConversionToolEntry;
  toolLabel: string;
  toolBenefit: string;
  enabled: boolean;
  available: boolean;
  isSaving: boolean;
  onToggle: (nextValue: boolean) => void;
  preview: ReactNode;
}) => {
  const { tool, page, meta } = entry;
  const isRtl = getDirection() === "rtl";
  const ForwardChevron = isRtl ? ChevronLeft : ChevronRight;
  const ToolIcon = meta?.icon || Sparkles;
  const displayKind = meta?.displayKind || "pdp";
  const placementText = displayKind === "pdp" ? "صفحة المنتج (PDP)" : "كامل المتجر (Global)";
  const categoryStyle = CATEGORY_STYLES[page.id] || CATEGORY_STYLES["product-conversion"];

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/95 dark:hover:border-indigo-700/80">
      {/* رأس الكارت: الأيقونة + الاسم + مفتاح التشغيل السريع */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/60 shadow-xs dark:border-slate-700/50 ${categoryStyle.iconBg} ${categoryStyle.iconColor}`}
            >
              <ToolIcon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <Link
                to={`/settings/store/tools/${tool.key}`}
                className="font-bold text-slate-900 transition-colors hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
              >
                <h3 className="text-sm font-extrabold tracking-tight sm:text-base">
                  {toolLabel}
                </h3>
              </Link>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400">
                  {placementText}
                </span>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${categoryStyle.badgeBg}`}
                >
                  {categoryStyle.label}
                </span>
              </div>
            </div>
          </div>

          {/* مفتاح التفعيل السريع */}
          <div className="shrink-0 pt-0.5">
            <button
              type="button"
              role="switch"
              aria-label={`تفعيل ${toolLabel}`}
              aria-checked={enabled}
              disabled={!available || isSaving}
              title={
                !available
                  ? `يتطلب تطبيق ${STORE_CONVERSION_APP_LABELS[tool.appSlug]}`
                  : enabled
                  ? "الأداة مفعلة - انقر للتعطيل"
                  : "الأداة معطلة - انقر للتفعيل"
              }
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!available || isSaving) return;
                onToggle(!enabled);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 ${
                !available
                  ? "cursor-not-allowed bg-slate-200 opacity-60 dark:bg-slate-800"
                  : enabled
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600"
              }`}
            >
              {isSaving ? (
                <span className="mx-auto flex items-center justify-center">
                  <Loader2 className="h-3 w-3 animate-spin text-white" />
                </span>
              ) : (
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-all duration-200 ${
                    enabled ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
                  }`}
                />
              )}
            </button>
          </div>
        </div>

        {/* وصف الفائدة التسويقية للأداة */}
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {toolBenefit}
        </p>
      </div>

      {/* نافذة المعاينة الحية للمتجر */}
      <Link
        to={`/settings/store/tools/${tool.key}`}
        className="block px-4 pb-3 sm:px-5"
      >
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-950/70">
          {/* شريط المتصفح الرمزي */}
          <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-2.5 py-1.5 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
              معاينة حية للمتجر
            </span>
            <div className="w-6" />
          </div>

          {/* مساحة المعاينة */}
          <div className="relative flex h-28 items-center justify-center overflow-hidden bg-white p-2.5 sm:h-32">
            <div className="pointer-events-none w-[130%] origin-center scale-[0.74]">
              {preview}
            </div>

            {!available && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 p-2 text-center backdrop-blur-xs dark:bg-slate-950/80">
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                  يتطلب {STORE_CONVERSION_APP_LABELS[tool.appSlug]}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* تذييل الكارت: حالة الأداة وزر التخصيص */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-900/40 sm:px-5">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              !available
                ? "bg-amber-400"
                : enabled
                ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                : "bg-slate-300 dark:bg-slate-700"
            }`}
          />
          <span
            className={`text-xs font-bold ${
              !available
                ? "text-amber-700 dark:text-amber-300"
                : enabled
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {!available ? "غير متوفرة" : enabled ? "نشطة بالمتجر" : "معطّلة"}
          </span>
        </div>

        <Link
          to={`/settings/store/tools/${tool.key}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 transition-transform group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300"
        >
          <span>تخصيص وإعدادات</span>
          <ForwardChevron className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-[-2px] rtl:group-hover:translate-x-[-2px]" />
        </Link>
      </div>
    </div>
  );
};

export default function ConversionToolsIndexPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const appSlugs = useMemo(
    () =>
      Array.from(
        new Set(ALL_CONVERSION_TOOLS.map((entry) => entry.tool.appSlug)),
      ) as ManagedMarketplaceAppSlug[],
    [],
  );

  const {
    loading,
    savingToolKey,
    managedApps,
    getToolEnabled,
    handleToolToggle,
  } = useConversionTools(appSlugs);

  const [merchantTheme, setMerchantTheme] = useState<StorefrontThemeInput | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    let active = true;
    storefrontSettingsService
      .getSettings()
      .then((response) => {
        if (!active) return;
        const settings = response?.data as Record<string, unknown> | undefined;
        const themeId =
          (typeof settings?.themeId === "string" && settings.themeId.trim()) ||
          (() => {
            const tokens = settings?.designTokens as Record<string, unknown> | undefined;
            return typeof tokens?.themeId === "string" ? tokens.themeId.trim() : "";
          })();
        if (themeId) {
          setMerchantTheme({ themeId } as StorefrontThemeInput);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const isToolAvailable = (tool: StoreConversionToolConfig) => {
    const appState = managedApps[tool.appSlug];
    return Boolean(appState?.app && isAppOperational(appState.app));
  };

  // مؤشرات إحصائية حية
  const totalTools = ALL_CONVERSION_TOOLS.length;
  const activeToolsCount = useMemo(() => {
    return ALL_CONVERSION_TOOLS.filter((entry) => {
      return isToolAvailable(entry.tool) && getToolEnabled(entry.tool);
    }).length;
  }, [managedApps, getToolEnabled]);

  const activeAppsCount = useMemo(() => {
    return appSlugs.filter((slug) => {
      const appState = managedApps[slug];
      return Boolean(appState?.app && isAppOperational(appState.app));
    }).length;
  }, [appSlugs, managedApps]);

  // رابط معاينة المتجر المباشرة
  const storePreviewPath = user?.companySlug
    ? buildStorefrontPreviewPath("/", {
        subdomain: user.companySlug,
        previewSessionToken: user.companySlug,
      })
    : null;

  // تبويبات الفئات
  const categoryTabs = useMemo(() => {
    return [
      {
        id: "all",
        label: "الكل",
        count: totalTools,
      },
      ...STORE_CONVERSION_PAGES.map((page) => ({
        id: page.id,
        label: t(page.navLabel),
        count: ALL_CONVERSION_TOOLS.filter((e) => e.page.id === page.id).length,
      })),
    ];
  }, [t, totalTools]);

  // تصفية الأدوات بناء على الفئة، الحالة، والبحث
  const filteredTools = useMemo(() => {
    return ALL_CONVERSION_TOOLS.filter((entry) => {
      if (selectedCategory !== "all" && entry.page.id !== selectedCategory) {
        return false;
      }

      const available = isToolAvailable(entry.tool);
      const enabled = available && getToolEnabled(entry.tool);

      if (statusFilter === "active" && !enabled) {
        return false;
      }
      if (statusFilter === "inactive" && enabled) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const label = t(`storeConversionSettings.tool.${entry.tool.key}.label`, {
          defaultValue: entry.tool.label,
        }).toLowerCase();
        const benefit = t(`storeConversionSettings.tool.${entry.tool.key}.benefit`, {
          defaultValue: entry.tool.description,
        }).toLowerCase();
        const key = entry.tool.key.toLowerCase();
        const appName = (STORE_CONVERSION_APP_LABELS[entry.tool.appSlug] || "").toLowerCase();

        return (
          label.includes(query) ||
          benefit.includes(query) ||
          key.includes(query) ||
          appName.includes(query)
        );
      }

      return true;
    });
  }, [selectedCategory, statusFilter, searchQuery, t, managedApps, getToolEnabled]);

  const hasActiveFilters =
    selectedCategory !== "all" || statusFilter !== "all" || searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedCategory("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  return (
    <div
      className="conversion-admin-scope mx-auto max-w-7xl space-y-6 sm:space-y-8"
      dir={getDirection()}
    >
      {/* هيدر الصفحة الفخم (Hero Header) */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/80 via-white to-sky-50/50 p-5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3 py-1 text-xs font-bold text-indigo-700 shadow-xs dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>استوديو أدوات التحويل للمتجر</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
              {t("storeConversionSettings.toolsIndexTitle")}
            </h1>

            <p className="text-xs leading-6 text-slate-600 dark:text-slate-300 sm:text-sm sm:leading-7">
              {t("storeConversionSettings.toolsIndexDesc")}
            </p>

            {/* كروت الإحصاء السريعة (Live KPI Summary Badges) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span>
                  الأدوات النشطة:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {activeToolsCount}
                  </span>{" "}
                  من {totalTools}
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  تطبيقات متصلة: {activeAppsCount} من {appSlugs.length}
                </span>
              </div>

              {storePreviewPath && (
                <a
                  href={storePreviewPath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Store className="h-3.5 w-3.5 text-slate-500" />
                  <span>معاينة متجرك</span>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </a>
              )}
            </div>
          </div>

          {/* زر الوصول السريع لمركز الـ Upsell Hub */}
          <div className="shrink-0">
            <Link
              to="/settings/upsell"
              className="group flex items-center gap-3.5 rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-blue-900/50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-transform group-hover:scale-105">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-blue-950 dark:text-blue-200 sm:text-sm">
                    عروض الـ Upsell & Cross-sell
                  </span>
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black text-white">
                    Hub
                  </span>
                </div>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  إدارة عروض الترقية والمكملات لرفع قيمة السلة
                </p>
              </div>
              <ChevronLeft className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-[-2px] rtl:group-hover:translate-x-[-2px] dark:text-blue-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* شريط التحكم الذكي (Tabs, Filter & Search Bar) */}
      <section className="space-y-3">
        {/* تبويبات الفئات القابلة للتمرير الأفقي على الموبايل */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {categoryTabs.map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs shadow-indigo-500/25"
                    : "border border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* حقل البحث وفلتر الحالة السريع */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في الأدوات بالاسم أو الفائدة..."
              className="w-full rounded-xl border border-slate-200/90 bg-white py-2 text-xs text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 rtl:pr-9 rtl:pl-8 ltr:pl-9 ltr:pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 hover:text-slate-600 rtl:left-2.5 ltr:right-2.5 dark:hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* فلتر الحالة */}
            <div className="flex items-center rounded-xl border border-slate-200/90 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === "all"
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === "active"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>النشطة</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === "inactive"
                    ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>المعطلة</span>
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="h-3 w-3" />
                <span>إعادة ضبط</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* المحتوى الرئيسي: شبكة البطاقات أو حالة التحميل / الفراغ */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-slate-900 dark:text-white">
            لم نجد أدوات مطابقة لبحثك
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            جرّب تغيير كلمات البحث أو إعادة ضبط فلاتر الحالة والفئات لعرض الأدوات المتاحة.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            <span>عرض كل الأدوات</span>
          </button>
        </div>
      ) : (
        <ConversionToolPreviewProvider initialTheme={merchantTheme}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTools.map((entry) => {
              const { tool } = entry;
              const available = isToolAvailable(tool);
              const enabled = available && getToolEnabled(tool);
              const isSaving = savingToolKey === tool.key;

              return (
                <ToolCard
                  key={tool.key}
                  entry={entry}
                  toolLabel={t(`storeConversionSettings.tool.${tool.key}.label`, {
                    defaultValue: tool.label,
                  })}
                  toolBenefit={t(`storeConversionSettings.tool.${tool.key}.benefit`, {
                    defaultValue: tool.description,
                  })}
                  enabled={enabled}
                  available={available}
                  isSaving={isSaving}
                  onToggle={(nextVal) => handleToolToggle(tool, nextVal)}
                  preview={renderConversionToolMiniPreview(tool.key)}
                />
              );
            })}
          </div>
        </ConversionToolPreviewProvider>
      )}
    </div>
  );
}

