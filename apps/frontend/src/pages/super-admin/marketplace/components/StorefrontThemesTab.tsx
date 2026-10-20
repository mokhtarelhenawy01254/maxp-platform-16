import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Alert } from "../../../../components/ui/alert";
import { buildApiUrl } from "../../../../utils/urlHelper";
import { tToast } from "../../../../utils/i18n-toast";
import i18n from "../../../../i18n";
import type { StorefrontThemeCatalogItem } from "../../../../services/storefrontThemeCatalogService";
import { getAuthHeaders } from "../types/marketplaceAdminTypes";
import StorefrontThemeCard from "./StorefrontThemeCard";
import StorefrontThemesToolbar, {
  type ThemeVisibilityFilter,
  type ThemePricingFilter,
} from "./StorefrontThemesToolbar";

export const getThemeUsageStats = (theme: StorefrontThemeCatalogItem) => ({
  installations: theme.usageStats?.installations || 0,
  activeInstallations: theme.usageStats?.activeInstallations || 0,
  purchases: theme.usageStats?.purchases || 0,
  currentCompanies: theme.usageStats?.currentCompanies || 0,
  installCount: theme.usageStats?.installCount || 0,
});

export interface StorefrontThemesTabProps {
  themes: StorefrontThemeCatalogItem[];
  onRefresh: () => void;
  onConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }) => void;
}

export const StorefrontThemesTab: React.FC<StorefrontThemesTabProps> = ({
  themes,
  onRefresh,
  onConfirm,
}) => {
  const [drafts, setDrafts] = useState<Record<string, StorefrontThemeCatalogItem>>({});
  const [savingThemeId, setSavingThemeId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [themeSearchQuery, setThemeSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<ThemeVisibilityFilter>("ALL");
  const [pricingFilter, setPricingFilter] = useState<ThemePricingFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [bulkPrice, setBulkPrice] = useState("");

  const uniqueThemes = useMemo(
    () =>
      Array.from(
        themes
          .reduce((map, theme) => {
            if (!map.has(theme.themeId)) {
              map.set(theme.themeId, theme);
            }
            return map;
          }, new Map<string, StorefrontThemeCatalogItem>())
          .values(),
      ),
    [themes],
  );

  useEffect(() => {
    const nextDrafts = uniqueThemes.reduce<Record<string, StorefrontThemeCatalogItem>>(
      (accumulator, theme) => {
        accumulator[theme.themeId] = theme;
        return accumulator;
      },
      {},
    );
    setDrafts(nextDrafts);
  }, [uniqueThemes]);

  const draftThemes = useMemo(
    () => uniqueThemes.map((theme) => drafts[theme.themeId] || theme),
    [drafts, uniqueThemes],
  );

  const themeCategoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          draftThemes
            .map((theme) => theme.category?.primary?.label)
            .filter((label): label is string => Boolean(label)),
        ),
      ).sort((left, right) => left.localeCompare(right, "ar")),
    [draftThemes],
  );

  const filteredThemes = useMemo(() => {
    const normalizedQuery = themeSearchQuery.trim().toLowerCase();

    return draftThemes.filter((theme) => {
      if (normalizedQuery) {
        const haystack = [
          theme.name,
          theme.description,
          theme.themeId,
          theme.category?.primary?.label,
          theme.category?.secondary?.label,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }

      if (categoryFilter !== "ALL" && theme.category?.primary?.label !== categoryFilter) {
        return false;
      }

      if (pricingFilter === "FREE" && theme.pricingModel !== "FREE") {
        return false;
      }
      if (pricingFilter === "PAID" && theme.pricingModel !== "ONE_TIME") {
        return false;
      }

      if (visibilityFilter === "VISIBLE") return theme.isPublic;
      if (visibilityFilter === "HIDDEN") return !theme.isPublic;
      if (visibilityFilter === "ACTIVE") return theme.isActive;
      if (visibilityFilter === "INACTIVE") return !theme.isActive;
      if (visibilityFilter === "ARCHIVED") return !theme.isPublic && !theme.isActive;
      if (visibilityFilter === "FEATURED") return theme.isFeatured;

      return true;
    });
  }, [categoryFilter, draftThemes, pricingFilter, themeSearchQuery, visibilityFilter]);

  useEffect(() => {
    const visibleThemeIds = new Set(filteredThemes.map((theme) => theme.themeId));
    setSelectedThemeIds((current) =>
      current.filter((themeId) => visibleThemeIds.has(themeId)),
    );
  }, [filteredThemes]);

  const selectedThemeSet = useMemo(
    () => new Set(selectedThemeIds),
    [selectedThemeIds],
  );

  const defaultTheme = useMemo(
    () => draftThemes.find((theme) => theme.isDefaultTheme) || null,
    [draftThemes],
  );

  const selectedThemes = useMemo(
    () => draftThemes.filter((theme) => selectedThemeSet.has(theme.themeId)),
    [draftThemes, selectedThemeSet],
  );

  const allFilteredSelected =
    filteredThemes.length > 0 &&
    filteredThemes.every((theme) => selectedThemeSet.has(theme.themeId));

  const selectedUsageTotals = selectedThemes.reduce(
    (totals, theme) => {
      const usageStats = getThemeUsageStats(theme);
      return {
        currentCompanies: totals.currentCompanies + usageStats.currentCompanies,
        purchases: totals.purchases + usageStats.purchases,
      };
    },
    { currentCompanies: 0, purchases: 0 },
  );

  const handleDraftChange = (
    themeId: string,
    patch: Partial<StorefrontThemeCatalogItem>,
  ) => {
    setDrafts((current) => ({
      ...current,
      [themeId]: {
        ...(current[themeId] || uniqueThemes.find((theme) => theme.themeId === themeId)!),
        ...patch,
      },
    }));
  };

  const toggleThemeSelection = (themeId: string, checked: boolean) => {
    setSelectedThemeIds((current) => {
      if (checked) {
        return current.includes(themeId) ? current : [...current, themeId];
      }
      return current.filter((selectedThemeId) => selectedThemeId !== themeId);
    });
  };

  const toggleFilteredSelection = (checked: boolean) => {
    if (!checked) {
      setSelectedThemeIds([]);
      return;
    }
    setSelectedThemeIds(filteredThemes.map((theme) => theme.themeId));
  };

  const persistThemeDraft = async (
    themeId: string,
    draft: StorefrontThemeCatalogItem,
  ) => {
    await axios.put(
      buildApiUrl(`super-admin/storefront-theme-catalog/${themeId}`),
      {
        description: draft.description,
        pricingModel: draft.pricingModel,
        monthlyPrice: draft.monthlyPrice,
        yearlyPrice: draft.yearlyPrice,
        isActive: draft.isActive,
        isPublic: draft.isPublic,
        isFeatured: draft.isFeatured,
        imageUrl: draft.preview?.imageUrl,
      },
      { headers: getAuthHeaders() },
    );
  };

  const persistThemePatch = async (
    themeIds: string[],
    patch: Partial<StorefrontThemeCatalogItem>,
    successMessage: string,
  ) => {
    const uniqueThemeIds = Array.from(new Set(themeIds)).filter(Boolean);
    if (uniqueThemeIds.length === 0 || bulkSaving) return;
    if (
      (patch.isActive === false || patch.isPublic === false) &&
      uniqueThemeIds.some((themeId) => drafts[themeId]?.isDefaultTheme)
    ) {
      tToast.error("subscriptionCenter.msg_6f63");
      return;
    }

    setBulkSaving(true);
    try {
      const nextDrafts = uniqueThemeIds.reduce<Record<string, StorefrontThemeCatalogItem>>(
        (accumulator, themeId) => {
          const base =
            drafts[themeId] || uniqueThemes.find((theme) => theme.themeId === themeId);
          if (base) {
            accumulator[themeId] = { ...base, ...patch };
          }
          return accumulator;
        },
        { ...drafts },
      );

      setDrafts(nextDrafts);
      await Promise.all(
        uniqueThemeIds
          .filter((themeId) => Boolean(nextDrafts[themeId]))
          .map((themeId) => persistThemeDraft(themeId, nextDrafts[themeId]!)),
      );
      setSelectedThemeIds([]);
      toast.success(successMessage);
      await onRefresh();
    } catch (error) {
      console.error("Bulk theme update error:", error);
      tToast.error("subscriptionCenter.failed_update_a0da");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleArchiveThemes = async (themeIds: string[]) => {
    const themesToArchive = draftThemes.filter((theme) =>
      themeIds.includes(theme.themeId),
    );
    if (themesToArchive.some((theme) => theme.isDefaultTheme)) {
      tToast.error("subscriptionCenter.msg_6d79");
      return;
    }

    const currentCompanies = themesToArchive.reduce(
      (total, theme) => total + getThemeUsageStats(theme).currentCompanies,
      0,
    );
    const confirmMessage =
      currentCompanies > 0
        ? `سيتم إخفاء وتعطيل ${themeIds.length} قالب. يوجد ${currentCompanies} شركة تستخدم هذه القوالب حاليًا، وستظل الشركات الحالية كما هي لكن لن يظهر القالب للاختيار الجديد. هل تريد المتابعة؟`
        : `سيتم إخفاء وتعطيل ${themeIds.length} قالب من كتالوج الشركات. هل تريد المتابعة؟`;

    onConfirm({
      title: "أرشفة القوالب",
      message: confirmMessage,
      confirmLabel: "أرشفة",
      onConfirm: () =>
        persistThemePatch(
          themeIds,
          { isActive: false, isPublic: false },
          "تمت أرشفة القوالب المحددة",
        ),
    });
  };

  const handleApplyBulkPrice = async () => {
    const price = Number(bulkPrice);
    if (!Number.isFinite(price) || price < 0) {
      tToast.error("subscriptionCenter.msg_94b7");
      return;
    }

    await persistThemePatch(
      selectedThemeIds,
      {
        pricingModel: price > 0 ? "ONE_TIME" : "FREE",
        monthlyPrice: price > 0 ? price : 0,
        yearlyPrice: 0,
      },
      price > 0 ? "تم تسعير القوالب المحددة" : "تم تحويل القوالب المحددة إلى مجانية",
    );
    setBulkPrice("");
  };

  const doSetDefaultTheme = async (theme: StorefrontThemeCatalogItem) => {
    try {
      setSavingThemeId(theme.themeId);
      await axios.post(
        buildApiUrl(`super-admin/storefront-theme-catalog/${theme.themeId}/default`),
        {},
        { headers: getAuthHeaders() },
      );
      setDrafts((current) =>
        Object.fromEntries(
          Object.entries(current).map(([themeId, draft]) => [
            themeId,
            {
              ...draft,
              isDefaultTheme: themeId === theme.themeId,
              ...(themeId === theme.themeId ? { isActive: true, isPublic: true } : {}),
            },
          ]),
        ) as Record<string, StorefrontThemeCatalogItem>,
      );
      tToast.success("subscriptionCenter.msg_4f19");
      await onRefresh();
    } catch (error) {
      console.error("Default storefront theme update error:", error);
      tToast.error("subscriptionCenter.msg_6b19");
    } finally {
      setSavingThemeId(null);
    }
  };

  const handleSetDefaultTheme = async (theme: StorefrontThemeCatalogItem) => {
    const needsActivation = !theme.isActive || !theme.isPublic;
    if (needsActivation) {
      onConfirm({
        title: "تعيين كقالب افتراضي",
        message:
          "سيتم جعل هذا القالب ظاهرًا ومتاحًا للتفعيل لأنه سيصبح الافتراضي لأي متجر جديد. هل تريد المتابعة؟",
        confirmLabel: "تعيين",
        onConfirm: () => doSetDefaultTheme(theme),
      });
      return;
    }

    await doSetDefaultTheme(theme);
  };

  const handleSave = async (themeId: string) => {
    const draft = drafts[themeId];
    if (!draft || bulkSaving) return;

    try {
      setSavingThemeId(themeId);
      await persistThemeDraft(themeId, draft);
      tToast.success("subscriptionCenter.success_update_78cf");
      onRefresh();
    } catch (error) {
      console.error("Theme catalog save error:", error);
      tToast.error("subscriptionCenter.failed_update_3eb1");
    } finally {
      setSavingThemeId(null);
    }
  };

  const hiddenOrInactiveThemesCount = useMemo(
    () => draftThemes.filter((theme) => !theme.isActive || !theme.isPublic).length,
    [draftThemes],
  );

  const handleEnableAndShowAllThemes = async () => {
    if (uniqueThemes.length === 0 || bulkSaving) return;

    const nextDrafts = uniqueThemes.reduce<Record<string, StorefrontThemeCatalogItem>>(
      (accumulator, theme) => {
        accumulator[theme.themeId] = {
          ...(drafts[theme.themeId] || theme),
          isActive: true,
          isPublic: true,
        };
        return accumulator;
      },
      {},
    );

    setDrafts(nextDrafts);
    setBulkSaving(true);

    try {
      const results = await Promise.allSettled(
        uniqueThemes.map((theme) =>
          persistThemeDraft(theme.themeId, nextDrafts[theme.themeId]!),
        ),
      );
      const failedCount = results.filter((result) => result.status === "rejected").length;

      if (failedCount > 0) {
        toast.error(i18n.t("subscriptionCenter.templateUpdateFailed", { failedCount }));
      } else {
        tToast.success("subscriptionCenter.msg_cae9");
      }

      onRefresh();
    } catch (error) {
      console.error("Bulk theme activation error:", error);
      tToast.error("subscriptionCenter.msg_264a");
    } finally {
      setBulkSaving(false);
    }
  };

  const totalCurrentCompanies = draftThemes.reduce(
    (total, theme) => total + getThemeUsageStats(theme).currentCompanies,
    0,
  );

  const totalPurchases = draftThemes.reduce(
    (total, theme) => total + getThemeUsageStats(theme).purchases,
    0,
  );

  return (
    <div className="space-y-6">
      <StorefrontThemesToolbar
        draftThemes={draftThemes}
        filteredThemes={filteredThemes}
        totalCurrentCompanies={totalCurrentCompanies}
        totalPurchases={totalPurchases}
        defaultTheme={defaultTheme}
        hiddenOrInactiveThemesCount={hiddenOrInactiveThemesCount}
        bulkSaving={bulkSaving}
        themeSearchQuery={themeSearchQuery}
        setThemeSearchQuery={setThemeSearchQuery}
        visibilityFilter={visibilityFilter}
        setVisibilityFilter={setVisibilityFilter}
        pricingFilter={pricingFilter}
        setPricingFilter={setPricingFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        themeCategoryOptions={themeCategoryOptions}
        allFilteredSelected={allFilteredSelected}
        toggleFilteredSelection={toggleFilteredSelection}
        selectedThemeIds={selectedThemeIds}
        selectedUsageTotals={selectedUsageTotals}
        bulkPrice={bulkPrice}
        setBulkPrice={setBulkPrice}
        onRefresh={onRefresh}
        onEnableAndShowAllThemes={handleEnableAndShowAllThemes}
        onPersistThemePatch={persistThemePatch}
        onArchiveThemes={handleArchiveThemes}
        onApplyBulkPrice={handleApplyBulkPrice}
      />

      <div className="grid grid-cols-12 gap-4">
        {filteredThemes.map((theme) => {
          const isSaving = savingThemeId === theme.themeId || bulkSaving;
          const isSelected = selectedThemeSet.has(theme.themeId);

          return (
            <StorefrontThemeCard
              key={theme.themeId}
              theme={theme}
              isSelected={isSelected}
              isSaving={isSaving}
              onToggleSelect={(checked) => toggleThemeSelection(theme.themeId, checked)}
              onDraftChange={(patch) => handleDraftChange(theme.themeId, patch)}
              onSetDefaultTheme={handleSetDefaultTheme}
              onArchiveTheme={(themeId) => handleArchiveThemes([themeId])}
              onShowTheme={(themeId) =>
                persistThemePatch([themeId], { isActive: true, isPublic: true }, "تم إظهار القالب")
              }
              onSaveTheme={handleSave}
            />
          );
        })}
        {filteredThemes.length === 0 && (
          <div className="col-span-12">
            <Alert
              variant="default"
              className="border-blue-500/50 text-blue-700 dark:border-blue-500/40 dark:text-blue-400"
            >
              لا توجد قوالب مطابقة للبحث أو الفلاتر الحالية.
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorefrontThemesTab;
