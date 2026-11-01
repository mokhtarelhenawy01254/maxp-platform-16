import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Gift,
  PackageCheck,
  Percent,
  Sparkles,
} from "lucide-react";
import {
  SettingsHeroSummaryItem,
  SettingsStatusMessage,
} from "../components/SettingsPagePrimitives";
import { getApiErrorMessage } from "../components/settingsPageUtils";
import { apiClient } from "../../../services/apiClient";
import {
  defaultPromotion,
  generateTierId,
  getTierTypeLabel,
  parseTiersJson,
  PromotionTier,
  StorePromotion,
  TierType,
} from "./types";

export function useStorePromotionController() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsStatusMessage | null>(null);
  const [promotion, setPromotion] = useState<StorePromotion>(defaultPromotion);

  const typeOptions = useMemo(
    () => [
      { value: "cheapest_percentage" as const, label: getTierTypeLabel("cheapest_percentage", t) },
      { value: "all_percentage" as const, label: getTierTypeLabel("all_percentage", t) },
    ],
    [t]
  );

  const DEFAULT_TIERS = useMemo(
    (): PromotionTier[] => [
      {
        id: "tier-1",
        minQuantity: 2,
        type: "cheapest_percentage",
        value: 50,
        items: 1,
        label: t("storePromotionSettings.customerLabelPlaceholder", { min: 2 }),
        isActive: true,
      },
      {
        id: "tier-2",
        minQuantity: 3,
        type: "cheapest_percentage",
        value: 100,
        items: 1,
        label: t("storePromotionSettings.customerLabelPlaceholder", { min: 3 }),
        isActive: true,
      },
    ],
    [t]
  );

  const loadPromotion = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/store-promotions");
      if (res.data?.success) {
        const d = res.data.data || {};
        setPromotion({
          isActive: d.isActive ?? false,
          title: d.title || "",
          tiers: parseTiersJson(d.tiers),
          disableOtherDiscounts: d.disableOtherDiscounts ?? false,
          startDate: d.startDate ? d.startDate.slice(0, 16) : "",
          endDate: d.endDate ? d.endDate.slice(0, 16) : "",
          barVisible: d.barVisible !== false,
          barSticky: d.barSticky ?? false,
          barPages: d.barPages || "all",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, t("storePromotionSettings.promoLoadFailed")) });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadPromotion();
  }, [loadPromotion]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setMessage(null);
      await apiClient.post("/store-promotions", {
        isActive: promotion.isActive,
        title: promotion.title,
        tiers: JSON.stringify(promotion.tiers.filter((tier) => tier.isActive)),
        disableOtherDiscounts: promotion.disableOtherDiscounts,
        startDate: promotion.startDate || null,
        endDate: promotion.endDate || null,
        barVisible: promotion.barVisible,
        barSticky: promotion.barSticky,
        barPages: promotion.barPages,
      });
      setMessage({ type: "success", text: t("storePromotionSettings.promoSaved") });
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, t("storePromotionSettings.promoSaveFailed")) });
    } finally {
      setSaving(false);
    }
  }, [promotion, t]);

  const handleReset = useCallback(async () => {
    try {
      setSaving(true);
      setMessage(null);
      await apiClient.delete("/store-promotions");
      setPromotion(defaultPromotion());
      setMessage({ type: "success", text: t("storePromotionSettings.promoCancelled") });
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, t("storePromotionSettings.promoCancelFailed")) });
    } finally {
      setSaving(false);
    }
  }, [t]);

  const addTier = useCallback(() => {
    setPromotion((prev) => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        {
          id: generateTierId(),
          minQuantity: 2,
          type: "cheapest_percentage",
          value: 50,
          items: 1,
          label: "",
          isActive: true,
        },
      ],
    }));
  }, []);

  const removeTier = useCallback((id: string) => {
    setPromotion((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((tier) => tier.id !== id),
    }));
  }, []);

  const updateTier = useCallback((id: string, updates: Partial<PromotionTier>) => {
    setPromotion((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier) => (tier.id === id ? { ...tier, ...updates } : tier)),
    }));
  }, []);

  const fillDefaults = useCallback(() => {
    setPromotion((prev) => ({ ...prev, tiers: DEFAULT_TIERS }));
  }, [DEFAULT_TIERS]);

  const summaryItems = useMemo((): SettingsHeroSummaryItem[] | undefined => {
    const active = promotion.tiers.filter((tier) => tier.isActive);
    if (!promotion.isActive || active.length === 0) return undefined;
    return [
      { label: t("storePromotionSettings.summaryStatus"), value: t("storePromotionSettings.summaryActive") },
      { label: t("storePromotionSettings.summaryTiers"), value: String(active.length) },
      { label: t("storePromotionSettings.summaryBestOffer"), value: active[active.length - 1]?.label || "-" },
    ];
  }, [promotion, t]);

  const relatedTools = useMemo(
    () => [
      {
        to: "/settings/store?tab=promotion",
        icon: Gift,
        label: t("promotionSettings.freeShipping", "الشحن المجاني"),
        desc: t("promotionSettings.freeShippingDesc", "الحد الأدنى وسعر موحد"),
        isCurrent: false,
      },
      {
        to: "/settings/store-promotion",
        icon: Percent,
        label: t("promotionSettings.relatedVolume", "خصومات الكميات"),
        desc: t("promotionSettings.relatedVolumeDesc", "صفحة مخصصة للخصومات"),
        isCurrent: true,
      },
      {
        to: "/settings/delivery-options",
        icon: PackageCheck,
        label: t("promotionSettings.relatedDelivery", "خيارات التوصيل"),
        desc: t("promotionSettings.relatedDeliveryDesc", "أنواع وسرعات التوصيل"),
        isCurrent: false,
      },
      {
        to: "/settings/recommendations",
        icon: Sparkles,
        label: t("promotionSettings.relatedRecommend", "المنتجات المقترحة"),
        desc: t("promotionSettings.relatedRecommendDesc", "بيع إضافي واقتراحات"),
        isCurrent: false,
      },
    ],
    [t]
  );

  return {
    t,
    loading,
    saving,
    message,
    setMessage,
    promotion,
    setPromotion,
    typeOptions,
    summaryItems,
    relatedTools,
    handleSave,
    handleReset,
    addTier,
    removeTier,
    updateTier,
    fillDefaults,
  };
}
