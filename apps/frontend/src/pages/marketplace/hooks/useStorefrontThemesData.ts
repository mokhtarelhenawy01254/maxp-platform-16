import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useOptionalAuth } from "../../../hooks/useAuthSimple";
import { apiClient } from "../../../services/apiClient";
import { storefrontSettingsService } from "../../../services/storefrontSettingsService";
import {
  storefrontThemeCatalogService,
  StorefrontThemeCatalogItem,
} from "../../../services/storefrontThemeCatalogService";
import { openUrlInNewTab } from "../../../utils/openUrlInNewTab";
import { handleInsufficientWalletBalance } from "../../../utils/marketplaceWalletHelper";
import {
  WalletBalance,
  ThemeCategoryGroup,
  getErrorMessage,
  getCurrentCompanyId,
  getCurrentPreviewStoreTarget,
} from "../types/storefrontThemesTypes";
import {
  buildThemeCategoryGroups,
  filterThemesList,
} from "../utils/storefrontThemesCategoryUtils";
import { buildStorefrontThemePreviewUrl } from "../utils/storefrontThemesPreviewUtils";
import { useStorefrontThemesFilters } from "./useStorefrontThemesFilters";

export function useStorefrontThemesData() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useOptionalAuth();
  const user = auth?.user;

  const [themes, setThemes] = useState<StorefrontThemeCatalogItem[]>([]);
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingThemeId, setProcessingThemeId] = useState("");
  const [previewStoreTarget, setPreviewStoreTarget] = useState(getCurrentPreviewStoreTarget);

  const authCompanyId = user?.companyId || user?.company?.id || "";
  const currentCompanyId = useMemo(
    () => authCompanyId || getCurrentCompanyId(),
    [authCompanyId]
  );

  useEffect(() => {
    setPreviewStoreTarget(getCurrentPreviewStoreTarget());
  }, [currentCompanyId, user?.company?.customDomain, user?.company?.slug]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [themesResult, walletResult, storefrontSettingsResult] =
          await Promise.allSettled([
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
            companySlug: storefrontSettingsResult.value.data.companySlug || null,
            customDomain: storefrontSettingsResult.value.data.customDomain || null,
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
  }, [currentCompanyId, t]);

  const categoryGroups = useMemo<ThemeCategoryGroup[]>(
    () => buildThemeCategoryGroups(themes),
    [themes]
  );

  const filters = useStorefrontThemesFilters({ categoryGroups });

  const normalizedSearchQuery = filters.deferredSearchQuery.trim().toLowerCase();

  const filteredThemes = useMemo(() => {
    return filterThemesList({
      themes,
      normalizedSearchQuery,
      deferredSearchQuery: filters.deferredSearchQuery,
      filterType: filters.filterType,
      selectedPrimaryCategoryId: filters.selectedPrimaryCategoryId,
      selectedSecondaryCategoryId: filters.selectedSecondaryCategoryId,
      highlightedThemeId: filters.highlightedThemeId,
    });
  }, [
    themes,
    normalizedSearchQuery,
    filters.deferredSearchQuery,
    filters.filterType,
    filters.selectedPrimaryCategoryId,
    filters.selectedSecondaryCategoryId,
    filters.highlightedThemeId,
  ]);

  const highlightedTheme = useMemo(
    () => themes.find((theme) => theme.themeId === filters.highlightedThemeId) || null,
    [filters.highlightedThemeId, themes]
  );

  const handlePurchase = async (theme: StorefrontThemeCatalogItem) => {
    try {
      setProcessingThemeId(theme.themeId);
      const purchase = await storefrontThemeCatalogService.purchaseTheme(
        theme.themeId,
        {
          companyId: currentCompanyId || undefined,
        }
      );

      setThemes((currentThemes) =>
        purchase.catalog.length > 0 ? purchase.catalog : currentThemes
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
        }
      );

      setThemes((currentThemes) =>
        activation.catalog.length > 0 ? activation.catalog : currentThemes
      );

      toast.success(t("storefrontThemes.applySuccess"));
    } catch (error) {
      console.error("Theme apply error:", error);
      toast.error(getErrorMessage(error, t("storefrontThemes.applyError")));
    } finally {
      setProcessingThemeId("");
    }
  };

  const getPreviewUrl = (themeId: string): string => {
    return buildStorefrontThemePreviewUrl({
      themeId,
      previewStoreTarget,
      origin: window.location.origin,
    });
  };

  const handleCopyLink = (themeId: string) => {
    const url = getPreviewUrl(themeId);
    if (!url) {
      toast.error(t("storefrontThemes.copyNoCompany"));
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => toast.success(t("storefrontThemes.copySuccess")),
      () => toast.error(t("storefrontThemes.copyError"))
    );
  };

  const handlePreview = (themeId: string) => {
    const openPreviewOrWarn = (targetUrl: string) => {
      if (openUrlInNewTab(targetUrl)) {
        return;
      }
      toast.error(t("storefrontThemes.previewBlocked"));
    };

    const url = getPreviewUrl(themeId);
    if (!url) {
      toast.error(t("storefrontThemes.previewNoCompany"));
      return;
    }

    openPreviewOrWarn(url);
  };

  return {
    themes,
    filteredThemes,
    highlightedThemeId: filters.highlightedThemeId,
    highlightedTheme,
    searchQuery: filters.searchQuery,
    setSearchQuery: filters.setSearchQuery,
    filterType: filters.filterType,
    setFilterType: filters.setFilterType,
    wallet,
    loading,
    processingThemeId,
    displayCategoryGroups: filters.displayCategoryGroups,
    selectedPrimaryCategoryId: filters.selectedPrimaryCategoryId,
    selectedPrimaryCategory: filters.selectedPrimaryCategory,
    selectedSecondaryCategoryId: filters.selectedSecondaryCategoryId,
    addingCategory: filters.addingCategory,
    setAddingCategory: filters.setAddingCategory,
    newCategoryName: filters.newCategoryName,
    setNewCategoryName: filters.setNewCategoryName,
    handlePrimaryCategorySelect: filters.handlePrimaryCategorySelect,
    handleSecondaryCategorySelect: filters.handleSecondaryCategorySelect,
    handleAddCategory: filters.handleAddCategory,
    handleRemoveCategory: filters.handleRemoveCategory,
    handlePurchase,
    handleApply,
    handlePreview,
    handleCopyLink,
    clearAllFilters: filters.clearAllFilters,
    navigate,
    searchParams: filters.searchParams,
    setSearchParams: filters.setSearchParams,
    t,
  };
}
