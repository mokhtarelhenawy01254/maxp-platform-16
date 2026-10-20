import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { buildApiUrl } from "../../../../utils/urlHelper";
import { tToast } from "../../../../utils/i18n-toast";
import i18n from "../../../../i18n";
import type { StorefrontThemeCatalogItem } from "../../../../services/storefrontThemeCatalogService";
import {
  type MarketplaceManagementItem,
  type MarketplaceDialogFormData,
  type CatalogDiffPayload,
  getAuthHeaders,
  getErrorMessage,
} from "../types/marketplaceAdminTypes";

export interface UseMarketplaceManagementDataOptions {
  storefrontThemesOnly?: boolean;
}

export const useMarketplaceManagementData = (
  options: UseMarketplaceManagementDataOptions = {},
) => {
  const { storefrontThemesOnly = false } = options;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [apps, setApps] = useState<MarketplaceManagementItem[]>([]);
  const [pricingRules, setPricingRules] = useState<MarketplaceManagementItem[]>([]);
  const [bundles, setBundles] = useState<MarketplaceManagementItem[]>([]);
  const [storefrontThemes, setStorefrontThemes] = useState<
    StorefrontThemeCatalogItem[]
  >([]);

  const [catalogDiff, setCatalogDiff] = useState<CatalogDiffPayload | null>(null);
  const [catalogDiffLoading, setCatalogDiffLoading] = useState(false);
  const [catalogDiffError, setCatalogDiffError] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const requestConfirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      onConfirm: () => void | Promise<void>;
    }) => setConfirmState(opts),
    [],
  );

  const closeConfirm = useCallback(() => setConfirmState(null), []);

  const fetchCatalogDiff = useCallback(
    async ({ showToast = false }: { showToast?: boolean } = {}) => {
      setCatalogDiffLoading(true);
      try {
        const headers = getAuthHeaders();
        const response = await axios.get(
          buildApiUrl("super-admin/marketplace-management/catalog/diff"),
          { headers },
        );

        if (response.data?.success) {
          setCatalogDiff(response.data.data as CatalogDiffPayload);
          setCatalogDiffError(null);
          if (showToast) {
            tToast.success("subscriptionCenter.success_update_4fdf");
          }
        } else {
          setCatalogDiff(null);
          setCatalogDiffError("فشل في جلب تقرير الفرق");
          if (showToast) {
            tToast.error("subscriptionCenter.failed_fetch_d415");
          }
        }
      } catch (err: unknown) {
        console.error("Catalog diff fetch error:", err);
        setCatalogDiff(null);
        setCatalogDiffError(getErrorMessage(err, "تعذر جلب تقرير الفرق"));
        if (showToast) {
          tToast.error("subscriptionCenter.msg_b558");
        }
      } finally {
        setCatalogDiffLoading(false);
      }
    },
    [],
  );

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      if (storefrontThemesOnly) {
        const themesRes = await axios.get(
          buildApiUrl("super-admin/storefront-theme-catalog"),
          { headers },
        );

        if (themesRes.data?.success) {
          setStorefrontThemes(themesRes.data.data as StorefrontThemeCatalogItem[]);
          setError(null);
        } else {
          setStorefrontThemes([]);
          setError("فشل في جلب كتالوج قوالب المتجر");
        }

        return;
      }

      const [appsRes, pricingRes, bundlesRes, themesRes] = await Promise.allSettled([
        axios.get(buildApiUrl("super-admin/marketplace-management/apps"), {
          headers,
        }),
        axios.get(buildApiUrl("super-admin/marketplace-management/pricing-rules"), {
          headers,
        }),
        axios.get(buildApiUrl("super-admin/marketplace-management/bundles"), {
          headers,
        }),
        axios.get(buildApiUrl("super-admin/storefront-theme-catalog"), {
          headers,
        }),
      ]);

      if (appsRes.status === "fulfilled" && appsRes.value.data.success) {
        setApps(appsRes.value.data.data as MarketplaceManagementItem[]);
      }
      if (pricingRes.status === "fulfilled" && pricingRes.value.data.success) {
        setPricingRules(pricingRes.value.data.data as MarketplaceManagementItem[]);
      }
      if (bundlesRes.status === "fulfilled" && bundlesRes.value.data.success) {
        setBundles(bundlesRes.value.data.data as MarketplaceManagementItem[]);
      }
      if (themesRes.status === "fulfilled" && themesRes.value.data.success) {
        setStorefrontThemes(themesRes.value.data.data as StorefrontThemeCatalogItem[]);
      }

      const allFailed = [appsRes, pricingRes, bundlesRes, themesRes].every(
        (result) => result.status === "rejected",
      );

      setError(allFailed ? "فشل في جلب البيانات" : null);

      void fetchCatalogDiff();
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(
        storefrontThemesOnly
          ? "فشل في جلب كتالوج قوالب المتجر"
          : "فشل في جلب البيانات",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchCatalogDiff, storefrontThemesOnly]);

  const handleDelete = useCallback(
    (id: string, typePath: "apps" | "pricing-rules" | "bundles") => {
      setConfirmState({
        title: "تأكيد الحذف",
        message: "هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذه الخطوة.",
        confirmLabel: "حذف",
        onConfirm: async () => {
          try {
            const headers = getAuthHeaders();
            await axios.delete(
              buildApiUrl(`super-admin/marketplace-management/${typePath}/${id}`),
              { headers },
            );
            tToast.success("subscriptionCenter.msg_26af");
            await fetchAllData();
          } catch (err) {
            console.error("Delete error:", err);
            tToast.error("subscriptionCenter.msg_2c0e");
          }
        },
      });
    },
    [fetchAllData],
  );

  const saveMarketplaceItem = useCallback(
    async (
      item: MarketplaceManagementItem | null,
      itemData: MarketplaceDialogFormData,
      activeTab: number,
    ): Promise<boolean> => {
      try {
        const headers = getAuthHeaders();
        let typePath = "apps";
        if (activeTab === 1) typePath = "apps";
        else if (activeTab === 2) {
          typePath = item?.feature ? "pricing-rules" : "bundles";
        }

        const { apps: _apps, screenshots, ...restData } = itemData;
        const payload =
          typePath === "bundles"
            ? {
                ...restData,
                appIds: _apps
                  .map((app) =>
                    typeof app === "string" ? app : app.slug || app.id || "",
                  )
                  .filter(Boolean),
              }
            : typePath === "apps"
              ? {
                  ...restData,
                  images: (screenshots || []).filter(Boolean),
                }
              : restData;

        if (item?.id) {
          await axios.put(
            buildApiUrl(`super-admin/marketplace-management/${typePath}/${item.id}`),
            payload,
            { headers },
          );
        } else {
          await axios.post(
            buildApiUrl(`super-admin/marketplace-management/${typePath}`),
            payload,
            { headers },
          );
        }

        tToast.success("subscriptionCenter.msg_6f39");
        await fetchAllData();
        return true;
      } catch (err) {
        const axiosErr = err as {
          response?: {
            data?: { message?: string; errors?: Record<string, string[]> };
          };
        };
        const serverMsg = axiosErr?.response?.data?.message || "";
        const serverErrors = axiosErr?.response?.data?.errors;
        console.error(
          "Marketplace save error:",
          err,
          "Server response:",
          axiosErr?.response?.data,
        );
        toast.error(serverMsg || i18n.t("subscriptionCenter.saveError"));
        if (serverErrors) console.error("Validation errors:", serverErrors);
        return false;
      }
    },
    [fetchAllData],
  );

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  return {
    loading,
    error,
    apps,
    pricingRules,
    bundles,
    storefrontThemes,
    catalogDiff,
    catalogDiffLoading,
    catalogDiffError,
    confirmState,
    requestConfirm,
    closeConfirm,
    fetchAllData,
    fetchCatalogDiff,
    handleDelete,
    saveMarketplaceItem,
  };
};

export default useMarketplaceManagementData;
