import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Check,
  Copy,
  Eye,
  Loader2,
  Palette,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Wallet,
  X,
  Bot,
} from "lucide-react";
import { toast } from "sonner";

import { useOptionalAuth } from "../../hooks/useAuthSimple";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { apiClient } from "../../services/apiClient";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";
import {
  storefrontThemeCatalogService,
  StorefrontThemeCatalogItem,
} from "../../services/storefrontThemeCatalogService";
import { buildStorefrontPreviewPath } from "../../storefront/utils/paths";
import { openUrlInNewTab } from "../../utils/openUrlInNewTab";
import { formatCurrency } from "../../utils/currency";
import { handleInsufficientWalletBalance } from "../../utils/marketplaceWalletHelper";

type WalletBalance = {
  balance: number;
  currency: string;
};

type ThemeFilterType = "all" | "owned" | "free" | "paid";

const THEME_FILTER_TYPES: ThemeFilterType[] = ["all", "owned", "free", "paid"];

type ThemeSubcategoryGroup = {
  id: string;
  label: string;
  count: number;
};

type ThemeCategoryGroup = {
  id: string;
  label: string;
  count: number;
  subcategories: ThemeSubcategoryGroup[];
};

const MARKETPLACE_CATEGORY_ORDER = [
  "general",
  "fashion",
  "food",
  "electronics",
  "automotive",
  "medical",
  "kids",
  "digital",
  "services",
];

const MARKETPLACE_SUBCATEGORY_ORDER: Record<string, string[]> = {
  general: [
    "general-store",
    "multi-category",
    "premium-brand",
    "natural-products",
  ],
  fashion: [
    "womens-shoes",
    "mens-shoes",
    "womens-fashion",
    "mens-clothing",
    "fashion-store",
    "luxury-fashion",
    "heritage-fashion",
    "accessories",
  ],
  food: ["restaurants"],
  electronics: ["mobile-store", "tech-store"],
  automotive: ["car-accessories"],
  medical: ["dental-lab"],
  kids: ["toys"],
  digital: ["web3"],
  services: ["travel-services"],
};

const STOREFRONT_READY_MARKETPLACE_PREVIEWS = new Set([
  "cafe-demo",
  "restaurant-demo",
  "pharmacy-demo",
]);

const getFilterTypeLabels = (t: any): Record<ThemeFilterType, string> => ({
  all: t("storefrontThemes.filterAll"),
  owned: t("storefrontThemes.filterOwned"),
  free: t("storefrontThemes.filterFree"),
  paid: t("storefrontThemes.filterPaid"),
});

const FALLBACK_THEME_CATEGORY: StorefrontThemeCatalogItem["category"] = {
  primary: {
    id: "general",
    label: "General",
  },
  secondary: {
    id: "general-store",
    label: "General Store",
  },
};

const getOrderRank = (value: string, preferredOrder: string[]): number => {
  const matchIndex = preferredOrder.indexOf(value);
  return matchIndex >= 0 ? matchIndex : preferredOrder.length + 1;
};



const getThemeCategory = (
  theme: Pick<StorefrontThemeCatalogItem, "category">,
): StorefrontThemeCatalogItem["category"] => ({
  primary: {
    id:
      typeof theme.category?.primary?.id === "string" &&
      theme.category.primary.id.trim()
        ? theme.category.primary.id.trim()
        : FALLBACK_THEME_CATEGORY.primary.id,
    label:
      typeof theme.category?.primary?.label === "string" &&
      theme.category.primary.label.trim()
        ? theme.category.primary.label.trim()
        : FALLBACK_THEME_CATEGORY.primary.label,
  },
  secondary: {
    id:
      typeof theme.category?.secondary?.id === "string" &&
      theme.category.secondary.id.trim()
        ? theme.category.secondary.id.trim()
        : FALLBACK_THEME_CATEGORY.secondary.id,
    label:
      typeof theme.category?.secondary?.label === "string" &&
      theme.category.secondary.label.trim()
        ? theme.category.secondary.label.trim()
        : FALLBACK_THEME_CATEGORY.secondary.label,
  },
});

const formatThemePrice = (theme: StorefrontThemeCatalogItem, t: any): string => {
  if (theme.pricingModel === "ONE_TIME" && theme.monthlyPrice > 0) {
    return `${theme.monthlyPrice.toLocaleString("en-US")} ${theme.currency}`;
  }
  return t("storefrontThemes.freePrice");
};



const getErrorMessage = (error: unknown, fallback: string): string => {
  const maybeMessage =
    typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: { data?: { message?: unknown } } }).response
          ?.data?.message
      : "";

  return typeof maybeMessage === "string" && maybeMessage.trim()
    ? maybeMessage.trim()
    : fallback;
};

const getCurrentCompanyId = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("companyId")?.trim();
  if (fromQuery) {
    return fromQuery;
  }

  try {
    const rawUser = window.localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as {
        companyId?: unknown;
        company?: { id?: unknown; slug?: unknown } | null;
      };

      if (typeof parsed.companyId === "string" && parsed.companyId.trim()) {
        return parsed.companyId.trim();
      }

      if (typeof parsed.company?.id === "string" && parsed.company.id.trim()) {
        return parsed.company.id.trim();
      }

      if (
        typeof parsed.company?.slug === "string" &&
        parsed.company.slug.trim()
      ) {
        return parsed.company.slug.trim();
      }
    }
  } catch {
    // Ignore malformed auth cache and continue to fallback keys.
  }

  const directKeys = ["storefront_companyId", "companyId", "currentCompanyId"];
  for (const key of directKeys) {
    const value = window.localStorage.getItem(key)?.trim();
    if (value) {
      return value;
    }
  }

  return "";
};

const getCurrentPreviewStoreTarget = (): {
  companyId: string | null;
  companySlug: string | null;
  customDomain: string | null;
} => {
  if (typeof window === "undefined") {
    return { companyId: null, companySlug: null, customDomain: null };
  }

  try {
    const rawUser = window.localStorage.getItem("user");
    if (!rawUser) {
      return { companyId: null, companySlug: null, customDomain: null };
    }

    const parsed = JSON.parse(rawUser) as {
      companyId?: unknown;
      company?: { id?: unknown; slug?: unknown; customDomain?: unknown } | null;
    };

    return {
      companyId:
        typeof parsed.companyId === "string" && parsed.companyId.trim()
          ? parsed.companyId.trim()
          : typeof parsed.company?.id === "string" && parsed.company.id.trim()
            ? parsed.company.id.trim()
            : null,
      companySlug:
        typeof parsed.company?.slug === "string" && parsed.company.slug.trim()
          ? parsed.company.slug.trim()
          : null,
      customDomain:
        typeof parsed.company?.customDomain === "string" &&
        parsed.company.customDomain.trim()
          ? parsed.company.customDomain.trim()
          : null,
    };
  } catch {
    return { companyId: null, companySlug: null, customDomain: null };
  }
};

const normalizeMarketplaceSearchText = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const matchesMarketplaceSearch = (
  fields: Array<string | undefined>,
  query: string,
): boolean => {
  const normalizedQuery = normalizeMarketplaceSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeMarketplaceSearchText(fields.filter(Boolean).join(" "));
  if (!haystack) {
    return false;
  }

  return normalizedQuery
    .split(" ")
    .every((token) => token && haystack.includes(token));
};





function StorefrontThemeCard({
  t: t_sft,
  themeItem,
  highlighted,
  isBusy,
  onPurchase,
  onApply,
  onPreview,
  onCopyLink,
  onCustomize,
}: {
  themeItem: StorefrontThemeCatalogItem;
  highlighted: boolean;
  isBusy: boolean;
  onPurchase: (theme: StorefrontThemeCatalogItem) => void;
  onApply: (theme: StorefrontThemeCatalogItem) => void;
  onPreview: (themeId: string) => void;
  onCopyLink: (themeId: string) => void;
  onCustomize: (themeId: string) => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleCopyClick = () => {
    onCopyLink(themeItem.themeId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const themeCategory = getThemeCategory(themeItem);
  const canApplyNow = themeItem.canActivate;
  const isFreeActivation = themeItem.pricingModel === "FREE" && !themeItem.isOwned;
  
  const primaryAction = themeItem.isCurrentTheme
    ? {
        label: t_sft("storefrontThemes.customize"),
        icon: Palette,
        onClick: () => onCustomize(themeItem.themeId),
        className: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700",
      }
    : themeItem.canPurchase
      ? {
          label: t_sft("storefrontThemes.purchase"),
          icon: ShoppingCart,
          onClick: () => onPurchase(themeItem),
          className: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
        }
      : canApplyNow
        ? {
            label: isFreeActivation ? t_sft("storefrontThemes.activateFree") : t_sft("storefrontThemes.apply"),
            icon: CheckCircle2,
            onClick: () => onApply(themeItem),
            className: isFreeActivation
              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-sm",
          }
        : {
            label: t_sft("storefrontThemes.customize"),
            icon: Palette,
            onClick: () => onCustomize(themeItem.themeId),
            className: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700",
          };

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10",
        themeItem.isCurrentTheme && "ring-1 ring-indigo-500 border-indigo-500/30",
        highlighted && "ring-1 ring-amber-500 border-amber-500/30"
      )}
    >
      {/* PREVIEW IMAGE AREA (REDUCED HEIGHT) */}
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-900">
        {themeItem.preview.imageUrl && !imgFailed ? (
          <img
            src={themeItem.preview.imageUrl}
            alt={themeItem.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
            <Sparkles className="size-8 text-indigo-500/40" />
          </div>
        )}
        
        {/* STATUS BADGES OVERLAY */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
           {themeItem.isCurrentTheme && (
              <span className="bg-indigo-700 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 uppercase tracking-tighter">
                <CheckCircle2 className="size-2" /> {t_sft("storefrontThemes.activeBadge")}
              </span>
           )}
           {themeItem.isFeatured && (
              <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 uppercase tracking-tighter">
                <Sparkles className="size-2" /> {t_sft("storefrontThemes.featuredBadge")}
              </span>
           )}
        </div>

        {/* PRICE OVERLAY */}
        <div className="absolute bottom-2 left-2">
           <span className="bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md border border-white/10">
               {formatThemePrice(themeItem, t_sft)}
           </span>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex flex-col p-3 flex-1">
        <div className="flex items-start justify-between mb-1">
          <div className="text-left">
            <h2 className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate max-w-[140px] uppercase tracking-tight">
              {themeItem.name}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {themeCategory.secondary.label}
            </p>
          </div>
          <div className="flex gap-0.5">
             {themeItem.preview.colors.slice(0, 3).map((c, i) => (
               <div key={i} className="size-2 rounded-full border border-white/10 shadow-sm" style={{ backgroundColor: `hsl(${c})` }} />
             ))}
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-1 min-h-[2.4rem]">
          {themeItem.description}
        </p>

        {/* MINI STATS GRID */}
        <div className="grid grid-cols-2 gap-2 mt-3 py-2 border-y border-slate-100 dark:border-slate-800/50">
           <div className="text-right">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">{t_sft("storefrontThemes.homeSections")}</span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">{themeItem.pageStats.homeSections}</span>
           </div>
           <div className="text-right">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">{t_sft("storefrontThemes.shopLayers")}</span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">{themeItem.pageStats.shopSections}</span>
           </div>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mt-3">
          <button
            onClick={() => onPreview(themeItem.themeId)}
            className="flex items-center justify-center gap-1.5 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            <Eye className="size-3" /> {t_sft("storefrontThemes.preview")}
          </button>
          <button
            onClick={handleCopyClick}
            title={t_sft("storefrontThemes.copyLink")}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg border transition-all",
              copied
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                : "border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-indigo-500 hover:border-indigo-400"
            )}
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </button>
          <button
            onClick={primaryAction.onClick}
            disabled={isBusy}
            className={cn(
              "flex items-center justify-center gap-1.5 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              primaryAction.className,
              isBusy && "opacity-50 cursor-not-allowed"
            )}
          >
            {isBusy ? <Loader2 className="size-3 animate-spin" /> : <primaryAction.icon className="size-3" />}
            {isBusy ? t_sft("storefrontThemes.wait") : primaryAction.label}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function StorefrontThemes() {
  const { t } = useTranslation();
  const FILTER_TYPE_LABELS = getFilterTypeLabels(t);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth = useOptionalAuth();
  const user = auth?.user;
  const highlightedThemeId = searchParams.get("theme")?.trim() || "";
  const rawSelectedPrimaryCategoryId =
    searchParams.get("category")?.trim() || "all";
  const rawSelectedSecondaryCategoryId =
    searchParams.get("subcategory")?.trim() || "all";
  const [themes, setThemes] = useState<StorefrontThemeCatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ThemeFilterType>("all");
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingThemeId, setProcessingThemeId] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState<
    ThemeCategoryGroup[]
  >(() => {
    try {
      const raw = window.localStorage.getItem(
        "storefront-themes-custom-categories",
      );
      return raw ? (JSON.parse(raw) as ThemeCategoryGroup[]) : [];
    } catch {
      return [];
    }
  });
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [previewStoreTarget, setPreviewStoreTarget] = useState(
    getCurrentPreviewStoreTarget,
  );
  const authCompanyId = user?.companyId || user?.company?.id || "";
  const currentCompanyId = useMemo(
    () => authCompanyId || getCurrentCompanyId(),
    [authCompanyId],
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    setPreviewStoreTarget(getCurrentPreviewStoreTarget());
  }, [currentCompanyId, user?.company?.customDomain, user?.company?.slug]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [
          themesResult,
          walletResult,
          storefrontSettingsResult,
        ] = await Promise.allSettled([
          storefrontThemeCatalogService.getCompanyCatalog("", {
            companyId: currentCompanyId || undefined,
          }),
          apiClient.get("/wallet/balance"),
          currentCompanyId
            ? storefrontSettingsService.getSettings(currentCompanyId, {
                allowFallback: false,
              })
            : Promise.resolve(null),
        ]);

        if (themesResult.status === "fulfilled") {
          setThemes(themesResult.value.data);
        } else {
          throw themesResult.reason;
        }

        if (walletResult.status === "fulfilled") {
          const nextWallet = walletResult.value?.data?.data;
          if (nextWallet) {
            setWallet({
              balance: Number(nextWallet.balance || 0),
              currency: String(nextWallet.currency || "EGP"),
            });
          }
        }

        if (
          storefrontSettingsResult.status === "fulfilled" &&
          storefrontSettingsResult.value?.data
        ) {
          setPreviewStoreTarget({
            companyId: storefrontSettingsResult.value.data.companyId || null,
            companySlug:
              storefrontSettingsResult.value.data.companySlug || null,
            customDomain:
              storefrontSettingsResult.value.data.customDomain || null,
          });
        }
      } catch (error) {
        console.error("Error loading storefront themes marketplace:", error);
        toast.error(getErrorMessage(error, t("storefrontThemes.loadError")));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [currentCompanyId]);

  const categoryGroups = useMemo<ThemeCategoryGroup[]>(() => {
    const groups = new Map<
      string,
      {
        id: string;
        label: string;
        count: number;
        subcategories: Map<string, ThemeSubcategoryGroup>;
      }
    >();

    themes.forEach((theme) => {
      const category = getThemeCategory(theme);
      const primaryId = category.primary.id;
      const secondaryId = category.secondary.id;
      const existingGroup = groups.get(primaryId);

      if (!existingGroup) {
        groups.set(primaryId, {
          id: primaryId,
          label: category.primary.label,
          count: 1,
          subcategories: new Map([
            [
              secondaryId,
              {
                id: secondaryId,
                label: category.secondary.label,
                count: 1,
              },
            ],
          ]),
        });
        return;
      }

      existingGroup.count += 1;
      const existingSubcategory = existingGroup.subcategories.get(secondaryId);

      if (existingSubcategory) {
        existingSubcategory.count += 1;
      } else {
        existingGroup.subcategories.set(secondaryId, {
          id: secondaryId,
          label: category.secondary.label,
          count: 1,
        });
      }
    });

    return [...groups.values()]
      .map((group) => ({
        id: group.id,
        label: group.label,
        count: group.count,
        subcategories: [...group.subcategories.values()].sort((left, right) => {
          const leftRank = getOrderRank(
            left.id,
            MARKETPLACE_SUBCATEGORY_ORDER[group.id] || [],
          );
          const rightRank = getOrderRank(
            right.id,
            MARKETPLACE_SUBCATEGORY_ORDER[group.id] || [],
          );

          if (leftRank !== rightRank) {
            return leftRank - rightRank;
          }

          return left.label.localeCompare(right.label, "ar");
        }),
      }))
      .sort((left, right) => {
        const leftRank = getOrderRank(left.id, MARKETPLACE_CATEGORY_ORDER);
        const rightRank = getOrderRank(right.id, MARKETPLACE_CATEGORY_ORDER);

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return left.label.localeCompare(right.label, "ar");
      });
  }, [themes]);

  const displayCategoryGroups = useMemo<ThemeCategoryGroup[]>(() => {
    const existingIds = new Set(categoryGroups.map((group) => group.id));
    const customGroups = customCategories.filter(
      (group) => !existingIds.has(group.id),
    );
    return [...categoryGroups, ...customGroups];
  }, [categoryGroups, customCategories]);

  const selectedPrimaryCategoryId =
    rawSelectedPrimaryCategoryId === "all" ||
    displayCategoryGroups.some(
      (group) => group.id === rawSelectedPrimaryCategoryId,
    )
      ? rawSelectedPrimaryCategoryId
      : "all";

  const selectedPrimaryCategory = useMemo(
    () =>
      displayCategoryGroups.find(
        (group) => group.id === selectedPrimaryCategoryId,
      ) || null,
    [displayCategoryGroups, selectedPrimaryCategoryId],
  );

  const selectedSecondaryCategoryId =
    rawSelectedSecondaryCategoryId === "all" ||
    selectedPrimaryCategory?.subcategories.some(
      (subcategory) => subcategory.id === rawSelectedSecondaryCategoryId,
    )
      ? rawSelectedSecondaryCategoryId
      : "all";

  const selectedSecondaryCategory = useMemo(
    () =>
      selectedPrimaryCategory?.subcategories.find(
        (subcategory) => subcategory.id === selectedSecondaryCategoryId,
      ) || null,
    [selectedPrimaryCategory, selectedSecondaryCategoryId],
  );

  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();

  const baseFilteredThemes = useMemo(() => {
    return themes.filter((theme) => {
      const category = getThemeCategory(theme);

      if (
        normalizedSearchQuery &&
        !matchesMarketplaceSearch(
          [
            theme.name,
            theme.description,
            theme.slug,
            theme.themeId,
            category.primary.label,
            category.secondary.label,
          ],
          deferredSearchQuery,
        )
      ) {
        return false;
      }

      if (filterType === "owned" && !theme.isOwned) return false;
      if (filterType === "free" && theme.pricingModel !== "FREE") return false;
      if (filterType === "paid" && theme.pricingModel !== "ONE_TIME")
        return false;

      return true;
    });
  }, [deferredSearchQuery, filterType, normalizedSearchQuery, themes]);

  const filteredThemes = useMemo(() => {
    const items = baseFilteredThemes.filter((theme) => {
      const category = getThemeCategory(theme);

      if (
        selectedPrimaryCategoryId !== "all" &&
        category.primary.id !== selectedPrimaryCategoryId
      ) {
        return false;
      }

      if (
        selectedSecondaryCategoryId !== "all" &&
        category.secondary.id !== selectedSecondaryCategoryId
      ) {
        return false;
      }

      return true;
    });

    return items.sort((left, right) => {
      if (left.themeId === highlightedThemeId) return -1;
      if (right.themeId === highlightedThemeId) return 1;
      if (left.isCurrentTheme !== right.isCurrentTheme) {
        return Number(right.isCurrentTheme) - Number(left.isCurrentTheme);
      }
      if (left.isOwned !== right.isOwned) {
        return Number(right.isOwned) - Number(left.isOwned);
      }
      if (left.isFeatured !== right.isFeatured) {
        return Number(right.isFeatured) - Number(left.isFeatured);
      }
      return left.name.localeCompare(right.name, "ar");
    });
  }, [
    baseFilteredThemes,
    highlightedThemeId,
    selectedPrimaryCategoryId,
    selectedSecondaryCategoryId,
  ]);

  const currentTheme = useMemo(
    () => themes.find((theme) => theme.isCurrentTheme) || null,
    [themes],
  );

  const highlightedTheme = useMemo(
    () => themes.find((theme) => theme.themeId === highlightedThemeId) || null,
    [highlightedThemeId, themes],
  );

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    filterType !== "all" ||
    selectedPrimaryCategoryId !== "all" ||
    selectedSecondaryCategoryId !== "all";

  const ownedThemesCount = useMemo(
    () => themes.filter((theme) => theme.isOwned).length,
    [themes],
  );

  const paidThemesCount = useMemo(
    () => themes.filter((theme) => theme.pricingModel === "ONE_TIME").length,
    [themes],
  );

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];

    if (filterType !== "all") {
      labels.push(t("storefrontThemes.filter" + filterType.charAt(0).toUpperCase() + filterType.slice(1)));
    }

    if (selectedPrimaryCategory) {
      labels.push(selectedPrimaryCategory.label);
    }

    if (selectedSecondaryCategory) {
      labels.push(selectedSecondaryCategory.label);
    }

    return labels;
  }, [t, filterType, selectedPrimaryCategory, selectedSecondaryCategory]);

  const filterCount = activeFilterLabels.length;
  const resultsSummaryLabel = t("storefrontThemes.resultsSummary", { count: filteredThemes.length, total: themes.length });

  const updateCategorySearchParams = (
    primaryCategoryId: string,
    secondaryCategoryId: string,
    options?: { replace?: boolean },
  ) => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (primaryCategoryId === "all") {
      nextSearchParams.delete("category");
    } else {
      nextSearchParams.set("category", primaryCategoryId);
    }

    if (secondaryCategoryId === "all") {
      nextSearchParams.delete("subcategory");
    } else {
      nextSearchParams.set("subcategory", secondaryCategoryId);
    }

    setSearchParams(nextSearchParams, { replace: options?.replace ?? false });
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    updateCategorySearchParams("all", "all");
  };

  const clearRequestedTheme = () => {
    if (!highlightedThemeId) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("theme");
    setSearchParams(nextSearchParams, { replace: true });
  };

  const handlePrimaryCategorySelect = (categoryId: string) => {
    updateCategorySearchParams(categoryId, "all");
  };

  const handleSecondaryCategorySelect = (
    primaryCategoryId: string,
    secondaryCategoryId: string,
  ) => {
    updateCategorySearchParams(primaryCategoryId, secondaryCategoryId);
  };

  const handleAddCategory = () => {
    const label = newCategoryName.trim();
    if (!label) {
      return;
    }

    const next = [
      ...customCategories,
      {
        id: `custom-${Date.now()}`,
        label,
        count: 0,
        subcategories: [],
      },
    ];
    setCustomCategories(next);
    try {
      window.localStorage.setItem(
        "storefront-themes-custom-categories",
        JSON.stringify(next),
      );
    } catch {
      // localStorage unavailable — keep the category for this session only.
    }
    setNewCategoryName("");
    setAddingCategory(false);
    updateCategorySearchParams(next[next.length - 1].id, "all");
  };

  const handleRemoveCategory = (categoryId: string) => {
    const next = customCategories.filter(
      (group) => group.id !== categoryId,
    );
    setCustomCategories(next);
    try {
      window.localStorage.setItem(
        "storefront-themes-custom-categories",
        JSON.stringify(next),
      );
    } catch {
      // ignore storage failures
    }
    if (selectedPrimaryCategoryId === categoryId) {
      updateCategorySearchParams("all", "all");
    }
  };

  const handlePurchase = async (theme: StorefrontThemeCatalogItem) => {
    try {
      setProcessingThemeId(theme.themeId);
      const purchase = await storefrontThemeCatalogService.purchaseTheme(
        theme.themeId,
        {
          companyId: currentCompanyId || undefined,
        },
      );

      setThemes((currentThemes) =>
        purchase.catalog.length > 0 ? purchase.catalog : currentThemes,
      );

      if (purchase.wallet) {
        setWallet(purchase.wallet);
      }

      toast.success(t("storefrontThemes.purchaseSuccess"));
    } catch (error) {
      console.error("Theme purchase error:", error);
      if (
        handleInsufficientWalletBalance(error, navigate, {
          returnUrl: window.location.pathname + window.location.search,
          appName: theme.name,
          itemType: "theme",
        })
      ) {
        return;
      }
      toast.error(getErrorMessage(error, t("storefrontThemes.purchaseError")));
    } finally {
      setProcessingThemeId("");
    }
  };

  const handleApply = async (theme: StorefrontThemeCatalogItem) => {
    try {
      setProcessingThemeId(theme.themeId);
      const activation = await storefrontThemeCatalogService.applyTheme(
        theme.themeId,
        {
          companyId: currentCompanyId || undefined,
        },
      );

      setThemes((currentThemes) =>
        activation.catalog.length > 0 ? activation.catalog : currentThemes,
      );

      toast.success(t("storefrontThemes.applySuccess"));
    } catch (error) {
      console.error("Theme apply error:", error);
      toast.error(getErrorMessage(error, t("storefrontThemes.applyError")));
    } finally {
      setProcessingThemeId("");
    }
  };

  const buildPreviewUrl = (themeId: string): string => {
    if (
      themeId.endsWith("-demo") &&
      !STOREFRONT_READY_MARKETPLACE_PREVIEWS.has(themeId)
    ) {
      return `${window.location.origin}/theme-demo/${themeId.replace("-demo", "")}`;
    }

    return buildStorefrontPreviewPath("/", {
      companyId: previewStoreTarget.companyId,
      companySlug: previewStoreTarget.companySlug,
      customDomain: previewStoreTarget.customDomain,
      previewTheme: themeId,
      previewSource: "marketplace",
      previewAdminOrigin: window.location.origin,
    });
  };

  const handleCopyLink = (themeId: string) => {
    const url = buildPreviewUrl(themeId);
    if (!url) {
      toast.error(t("storefrontThemes.copyNoCompany"));
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => toast.success(t("storefrontThemes.copySuccess")),
      () => toast.error(t("storefrontThemes.copyError")),
    );
  };

  const handlePreview = (themeId: string) => {
    const openPreviewOrWarn = (targetUrl: string) => {
      if (openUrlInNewTab(targetUrl)) {
        return;
      }

      toast.error(t("storefrontThemes.previewBlocked"));
    };

    if (
      themeId.endsWith("-demo") &&
      !STOREFRONT_READY_MARKETPLACE_PREVIEWS.has(themeId)
    ) {
      const type = themeId.replace("-demo", "");
      openPreviewOrWarn(`/theme-demo/${type}`);
      return;
    }

    const previewUrl = buildPreviewUrl(themeId);

    if (!previewUrl) {
      toast.error(t("storefrontThemes.previewNoCompany"));
      return;
    }

    openPreviewOrWarn(previewUrl);
  };

  const renderFilterTypeChips = (className?: string) => (
    <div
      className={cn(
        "storefront-themes-type-row flex flex-wrap justify-end gap-2",
        className,
      )}
    >
      {THEME_FILTER_TYPES.map((value) => {
        const isActive = filterType === value;
        return (
          <button
            key={value}
            type="button"
            className="business-chip-button"
            data-active={isActive}
            onClick={() => setFilterType(value)}
          >
            {t("storefrontThemes.filter" + value.charAt(0).toUpperCase() + value.slice(1))}
          </button>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex items-center gap-3 text-indigo-500 font-black uppercase tracking-widest text-[10px]">
          <Loader2 className="size-4 animate-spin" />
          {t("storefrontThemes.loading")}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen -m-4 md:-m-6 bg-slate-50 dark:bg-slate-950/50 flex flex-col" dir="rtl">
      {/* ELITE SMART HEADER */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="size-9 sm:size-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
             <Palette className="size-5 sm:size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 truncate">
              <span>{t("storefrontThemes.title")}</span>
              <span className="text-[9px] sm:text-[10px] bg-indigo-600/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold shrink-0">{t("storefrontThemes.version")}</span>
            </h1>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate hidden sm:block">{t("storefrontThemes.subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
           {/* WALLET MINI NODE */}
           <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-right">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">{t("storefrontThemes.walletBalance")}</span>
                 <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                   {wallet ? formatCurrency(wallet.balance, wallet.currency) : "0.00 EGP"}
                 </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-500"
                onClick={() => navigate("/billing/wallet")}
              >
                <Wallet className="size-4" />
              </Button>
           </div>

           <Button
             variant="outline"
             className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 text-[10px] sm:text-[11px] font-bold shrink-0 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 active:scale-[0.97] transition-all"
             onClick={() => navigate("/marketplace/agents")}
           >
             <Bot className="size-3.5 sm:size-4 ltr:mr-1.5 rtl:ml-1.5 text-indigo-500" />
             <span className="whitespace-nowrap">سوق الإيجنت (Workforce)</span>
           </Button>

           <Button
             className="h-9 sm:h-10 rounded-xl px-3 sm:px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] sm:text-[11px] uppercase tracking-widest hover:opacity-90 transition-all shadow-sm shrink-0"
             onClick={() => navigate("/settings/storefront/editor")}
           >
             <Sparkles className="size-3.5 sm:size-4 ltr:mr-1.5 rtl:ml-1.5" />
             <span className="whitespace-nowrap">{t("storefrontThemes.customizeCurrent")}</span>
           </Button>
        </div>
      </header>

      {/* PRODUCTIVITY TOOLBAR */}
      <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2">
           <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("storefrontThemes.searchPlaceholder")}
                className="w-full h-9 pl-4 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
           </div>

           <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

           <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0">
               {THEME_FILTER_TYPES.map((type) => (
                 <button
                   key={type}
                   onClick={() => setFilterType(type)}
                   className={cn(
                     "px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap shrink-0",
                     filterType === type 
                       ? "bg-indigo-700 border-indigo-700 text-white shadow-lg shadow-indigo-500/20" 
                       : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-500/50"
                   )}
                 >
                   {t("storefrontThemes.filter" + type.charAt(0).toUpperCase() + type.slice(1))}
                 </button>
               ))}
           </div>
        </div>

        <div className="relative min-w-0">
           <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2 lg:pb-0 touch-pan-x">
              <div className="flex items-center gap-1 whitespace-nowrap">
                 <button
                   onClick={() => handlePrimaryCategorySelect("all")}
                   className={cn(
                     "px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                     selectedPrimaryCategoryId === "all"
                       ? "text-indigo-700 bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300"
                       : "text-slate-500 dark:text-slate-400 hover:text-indigo-500"
                   )}
                 >
                   {t("storefrontThemes.allDomains")}
                 </button>
{displayCategoryGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handlePrimaryCategorySelect(group.id)}
                      className={cn(
                        "px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        selectedPrimaryCategoryId === group.id
                          ? "text-indigo-700 bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300"
                          : "text-slate-500 dark:text-slate-400 hover:text-indigo-500"
                      )}
                    >
                      {group.label}
                      {group.count > 0 && (
                        <span className="text-[9px] px-1 py-0.5 rounded-md border border-current">{group.count}</span>
                      )}
                      {group.id.startsWith("custom-") && (
                        <span
                          role="button"
                          tabIndex={-1}
                          aria-label={t("storefrontThemes.removeCategory", {
                            name: group.label,
                          })}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveCategory(group.id);
                          }}
                          className="flex items-center justify-center size-4 rounded-full bg-slate-200/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-500/30 hover:text-red-500 transition-colors"
                        >
                          <X className="size-2.5" />
                        </span>
                      )}
                    </button>
                  ))}

                  {addingCategory ? (
                    <span className="inline-flex items-center gap-1.5 h-8 pr-1">
                      <input
                        autoFocus
                        type="text"
                        value={newCategoryName}
                        onChange={(event) => setNewCategoryName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            handleAddCategory();
                          }
                          if (event.key === "Escape") {
                            setAddingCategory(false);
                            setNewCategoryName("");
                          }
                        }}
                        placeholder={t("storefrontThemes.newCategoryPlaceholder")}
                        className="h-8 w-36 rounded-lg border border-indigo-400 bg-white dark:bg-slate-950 px-2.5 text-[11px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        aria-label={t("storefrontThemes.confirmAddCategory")}
                        className="flex items-center justify-center size-7 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingCategory(false);
                          setNewCategoryName("");
                        }}
                        aria-label={t("storefrontThemes.cancelAddCategory")}
                        className="flex items-center justify-center size-7 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingCategory(true)}
                      aria-label={t("storefrontThemes.addCategory")}
                      className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-500/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                    >
                      <Plus className="size-3.5" />
                      {t("storefrontThemes.addCategory")}
                    </button>
                  )}
               </div>
           </div>
           {/* Left-edge fade hints that more categories are reachable by swiping (RTL overflow end) */}
           <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white dark:from-slate-950 to-transparent lg:hidden" />
        </div>
      </div>

      {/* SUBCATEGORY SECONDARY BAR */}
      {selectedPrimaryCategory && (
        <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2 flex items-center gap-4 overflow-x-auto no-scrollbar touch-pan-x">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{t("storefrontThemes.subMatrix")}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePrimaryCategorySelect(selectedPrimaryCategory.id)}
              className={cn(
                "px-3 h-7 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                selectedSecondaryCategoryId === "all"
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {t("storefrontThemes.allPrefix")} {selectedPrimaryCategory.label}
            </button>
            {selectedPrimaryCategory.subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSecondaryCategorySelect(selectedPrimaryCategory.id, sub.id)}
                className={cn(
                  "px-3 h-7 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                  selectedSecondaryCategoryId === sub.id
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {sub.label} ({sub.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAIN THEME MATRIX GRID */}
      <main className="flex-1 p-4 sm:p-6">
        {highlightedThemeId && highlightedTheme && (
           <div className="mb-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{t("storefrontThemes.directNodeAccess")}</span>
                 </div>
                 <button
                   onClick={() => {
                     const next = new URLSearchParams(searchParams);
                     next.delete("theme");
                     setSearchParams(next, { replace: true });
                   }}
                   className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                 >
                    {t("storefrontThemes.clearFocus")}
                 </button>
              </div>
              <div className="max-w-sm">
                 <StorefrontThemeCard
                  t={t}
                  themeItem={highlightedTheme}
                  highlighted={true}
                  isBusy={processingThemeId === highlightedTheme.themeId}
                  onPurchase={handlePurchase}
                  onApply={handleApply}
                  onPreview={handlePreview}
                  onCopyLink={handleCopyLink}
                  onCustomize={(id) => navigate(`/settings/storefront/editor?theme=${id}`)}
                />
              </div>
           </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
          {filteredThemes.map((theme) => (
            <StorefrontThemeCard
              key={theme.themeId}
              t={t}
              themeItem={theme}
              highlighted={theme.themeId === highlightedThemeId}
              isBusy={processingThemeId === theme.themeId}
              onPurchase={handlePurchase}
              onApply={handleApply}
              onPreview={handlePreview}
              onCopyLink={handleCopyLink}
              onCustomize={(id) => navigate(`/settings/storefront/editor?theme=${id}`)}
            />
          ))}
        </div>

        {filteredThemes.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center gap-4">
             <div className="size-16 rounded-3xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300">
                <Search className="size-8" />
             </div>
             <div>
                 <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{t("storefrontThemes.noNodesFound")}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t("storefrontThemes.noNodesHint")}</p>
             </div>
             <Button variant="outline" className="mt-4 rounded-xl px-8 h-10 font-black text-[10px] uppercase tracking-widest" onClick={clearAllFilters}>
                {t("storefrontThemes.resetFilters")}
             </Button>
          </div>
        )}
      </main>

      {/* FOOTER: SYSTEM STATUS (hidden on mobile — its debug payload overflows the
          viewport in RTL and creates a horizontal pan that breaks mobile scrolling) */}
      <footer className="hidden sm:flex bg-white/50 dark:bg-slate-950/50 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-6 h-10 items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
         <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3 text-emerald-500" /> SECURE_CATALOG_SYNC</span>
            <span>•</span>
            <span>{filteredThemes.length} / {themes.length} THEMES_LOADED</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-emerald-500" />
            CORE_ENGINE_V2_ACTIVE
         </div>
      </footer>
    </div>
  );
}

function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
