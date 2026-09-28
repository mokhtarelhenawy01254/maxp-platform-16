import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Calendar,
  Gift,
  Info,
  PanelTop,
  Plus,
  RefreshCcw,
  Save,
  ShoppingCart,
  Tag,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  SettingsHeroSummaryItem,
  SettingsLoadingState,
  SettingsPageHero,
  SettingsPageShell,
  SettingsSection,
  SettingsStatusAlert,
  SettingsStatusMessage,
} from "./components/SettingsPagePrimitives";
import {
  getApiErrorMessage,
} from "./components/settingsPageUtils";
import { apiClient } from "../../services/apiClient";
import { getDirection } from "../../i18n";

type TierType = "cheapest_percentage" | "all_percentage";

interface PromotionTier {
  id: string;
  minQuantity: number;
  type: TierType;
  value: number;
  items: number;
  label: string;
  isActive: boolean;
}

interface StorePromotion {
  isActive: boolean;
  title: string;
  tiers: PromotionTier[];
  disableOtherDiscounts: boolean;
  startDate: string;
  endDate: string;
  barVisible: boolean;
  barSticky: boolean;
  barPages: string;
}

const defaultPromotion = (): StorePromotion => ({
  isActive: false, title: "", tiers: [], disableOtherDiscounts: false, startDate: "", endDate: "",
  barVisible: true, barSticky: false, barPages: "all",
});

const generateTierId = () => `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const parseTiersJson = (raw: unknown): PromotionTier[] => {
  if (typeof raw === "string") try { return JSON.parse(raw); } catch { return []; }
  if (Array.isArray(raw)) return raw as PromotionTier[];
  return [];
};

export default function StorePromotionSettings() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsStatusMessage | null>(null);
  const [promotion, setPromotion] = useState<StorePromotion>(defaultPromotion);

  const typeOptions = [
    { value: "cheapest_percentage" as const, label: t("storePromotionSettings.cheapestDiscounted") },
    { value: "all_percentage" as const, label: t("storePromotionSettings.allDiscounted") },
  ];

  const DEFAULT_TIERS: PromotionTier[] = [
    { id: "tier-1", minQuantity: 2, type: "cheapest_percentage", value: 50, items: 1, label: t("storePromotionSettings.customerLabelPlaceholder", { min: 2 }), isActive: true },
    { id: "tier-2", minQuantity: 3, type: "cheapest_percentage", value: 100, items: 1, label: t("storePromotionSettings.customerLabelPlaceholder", { min: 3 }), isActive: true },
  ];

  const loadPromotion = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/store-promotions");
      if (res.data.success) {
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

  useEffect(() => { void loadPromotion(); }, [loadPromotion]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setMessage(null);
      await apiClient.post("/store-promotions", {
        isActive: promotion.isActive,
        title: promotion.title,
        tiers: JSON.stringify(promotion.tiers.filter(t => t.isActive)),
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
    setPromotion(p => ({ ...p, tiers: [...p.tiers, { id: generateTierId(), minQuantity: 2, type: "cheapest_percentage", value: 50, items: 1, label: "", isActive: true }] }));
  }, []);

  const removeTier = useCallback((id: string) => {
    setPromotion(p => ({ ...p, tiers: p.tiers.filter(t => t.id !== id) }));
  }, []);

  const updateTier = useCallback((id: string, updates: Partial<PromotionTier>) => {
    setPromotion(p => ({ ...p, tiers: p.tiers.map(t => t.id === id ? { ...t, ...updates } : t) }));
  }, []);

  const fillDefaults = useCallback(() => {
    setPromotion(p => ({ ...p, tiers: DEFAULT_TIERS }));
  }, [DEFAULT_TIERS]);

  const summaryItems = useMemo((): SettingsHeroSummaryItem[] | undefined => {
    const active = promotion.tiers.filter(t => t.isActive);
    if (!promotion.isActive || active.length === 0) return undefined;
    return [
      { label: t("storePromotionSettings.summaryStatus"), value: t("storePromotionSettings.summaryActive") },
      { label: t("storePromotionSettings.summaryTiers"), value: String(active.length) },
      { label: t("storePromotionSettings.summaryBestOffer"), value: active[active.length - 1]?.label || "-" },
    ];
  }, [promotion, t]);

  if (loading) {
    return (
      <SettingsLoadingState
        title={t("storePromotionSettings.loadingTitle")}
        description={t("storePromotionSettings.loadingDescription")}
      />
    );
  }

  return (
    <SettingsPageShell dir={getDirection()}>
      <SettingsPageHero
        badgeIcon={Gift}
        badgeLabel={t("storePromotionSettings.badgeLabel")}
        title={t("storePromotionSettings.pageTitle")}
        description={t("storePromotionSettings.pageDescription")}
        summaryItems={summaryItems}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={fillDefaults}
            className="border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white font-medium"
          >
            <Plus className="h-4 w-4 ml-1" /> {t("storePromotionSettings.readyExamples")}
          </Button>
        }
      />

      {message && (
        <SettingsStatusAlert message={message} onDismiss={() => setMessage(null)} />
      )}

      <div className="p-6 space-y-6">
        <SettingsSection
          icon={Gift}
          title={t("storePromotionSettings.enablePromo")}
          description={t("storePromotionSettings.enablePromoDesc")}
          accentClassName="bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">{t("storePromotionSettings.enablePromo")}</Label>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("storePromotionSettings.enablePromoDesc")}
              </p>
            </div>
            <Switch
              checked={promotion.isActive}
              onCheckedChange={checked => setPromotion(p => ({ ...p, isActive: checked }))}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={ShoppingCart}
          title={t("storePromotionSettings.disableOtherDiscounts")}
          description={t("storePromotionSettings.disableOtherDiscountsDesc")}
          accentClassName="bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">{t("storePromotionSettings.disableOtherDiscounts")}</Label>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("storePromotionSettings.disableOtherDiscountsDesc")}
              </p>
            </div>
            <Switch
              checked={promotion.disableOtherDiscounts}
              onCheckedChange={checked => setPromotion(p => ({ ...p, disableOtherDiscounts: checked }))}
            />
          </div>

          {promotion.disableOtherDiscounts && (
            <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p>{t("storePromotionSettings.disableOtherDiscountsAlert")}</p>
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          icon={Tag}
          title={t("storePromotionSettings.promoTitle")}
          description={t("storePromotionSettings.promoTitleDesc")}
          accentClassName="bg-sky-50 text-sky-700 ring-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-500/30"
        >
          <Input
            value={promotion.title}
            onChange={e => setPromotion(p => ({ ...p, title: e.target.value }))}
            placeholder={t("storePromotionSettings.promoTitlePlaceholder")}
            className="max-w-md bg-white text-slate-900 border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500 font-medium"
          />
        </SettingsSection>

        <SettingsSection
          icon={Calendar}
          title={t("storePromotionSettings.promoDate")}
          description={t("storePromotionSettings.promoDateDesc")}
          accentClassName="bg-violet-50 text-violet-700 ring-violet-200/70 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-500/30"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">{t("storePromotionSettings.from")}</Label>
              <Input
                type="datetime-local"
                value={promotion.startDate}
                onChange={e => setPromotion(p => ({ ...p, startDate: e.target.value }))}
                className="bg-white text-slate-900 border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700 font-medium dark:[color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">{t("storePromotionSettings.to")}</Label>
              <Input
                type="datetime-local"
                value={promotion.endDate}
                onChange={e => setPromotion(p => ({ ...p, endDate: e.target.value }))}
                className="bg-white text-slate-900 border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700 font-medium dark:[color-scheme:dark]"
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={PanelTop}
          title={t("storePromotionSettings.barSettings")}
          description={t("storePromotionSettings.barSettingsDesc")}
          accentClassName="bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/30"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">{t("storePromotionSettings.showBar")}</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("storePromotionSettings.showBarDesc")}</p>
              </div>
              <Switch
                checked={promotion.barVisible}
                onCheckedChange={checked => setPromotion(p => ({ ...p, barVisible: checked }))}
              />
            </div>
            <Separator className="dark:bg-slate-800" />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">{t("storePromotionSettings.stickyBar")}</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("storePromotionSettings.stickyBarDesc")}</p>
              </div>
              <Switch
                checked={promotion.barSticky}
                onCheckedChange={checked => setPromotion(p => ({ ...p, barSticky: checked }))}
              />
            </div>
            <Separator className="dark:bg-slate-800" />
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-900 dark:text-slate-200">{t("storePromotionSettings.barPages")}</Label>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("storePromotionSettings.barPagesDesc")}</p>
              <Select value={promotion.barPages}
                onValueChange={val => setPromotion(p => ({ ...p, barPages: val }))}>
                <SelectTrigger className="max-w-xs bg-white text-slate-900 border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700 font-medium">
                  <SelectValue>
                    {promotion.barPages === "shop"
                      ? t("storePromotionSettings.shopOnly")
                      : promotion.barPages === "product"
                        ? t("storePromotionSettings.productOnly")
                        : promotion.barPages === "checkout"
                          ? t("storePromotionSettings.checkoutOnly")
                          : t("storePromotionSettings.allPages")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                  <SelectItem value="all" className="dark:text-slate-100 dark:focus:bg-slate-800">{t("storePromotionSettings.allPages")}</SelectItem>
                  <SelectItem value="shop" className="dark:text-slate-100 dark:focus:bg-slate-800">{t("storePromotionSettings.shopOnly")}</SelectItem>
                  <SelectItem value="product" className="dark:text-slate-100 dark:focus:bg-slate-800">{t("storePromotionSettings.productOnly")}</SelectItem>
                  <SelectItem value="checkout" className="dark:text-slate-100 dark:focus:bg-slate-800">{t("storePromotionSettings.checkoutOnly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={ShoppingCart}
          title={t("storePromotionSettings.discountTiers")}
          description={t("storePromotionSettings.discountTiersDesc")}
          accentClassName="bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/60 p-4 text-sky-950 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-200 text-sm leading-relaxed flex items-start gap-3">
              <Info className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{t("storePromotionSettings.howItWorksTitle")}</p>
                <p className="text-xs sm:text-sm text-sky-900/90 dark:text-sky-300/90 leading-normal">
                  {t("storePromotionSettings.howItWorksDesc")}
                </p>
              </div>
            </div>

            {promotion.tiers.map((tier, index) => (
              <div
                key={tier.id}
                className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-4 dark:border-slate-800 dark:bg-slate-950/60 shadow-xs transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/30">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {t("storePromotionSettings.tierLevel", { index: index + 1 })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTier(tier.id)}
                    className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/50"
                    aria-label="حذف المستوى"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {t("storePromotionSettings.minQuantity")}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={tier.minQuantity}
                      onChange={e =>
                        updateTier(tier.id, {
                          minQuantity: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {t("storePromotionSettings.discountType")}
                    </Label>
                    <Select
                      value={tier.type}
                      onValueChange={(val: TierType) => updateTier(tier.id, { type: val })}
                    >
                      <SelectTrigger className="w-full bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 font-medium">
                        <SelectValue>
                          {(val: unknown) => {
                            const actualVal = (val as string) || tier.type;
                            if (actualVal === "all_percentage") {
                              return t("storePromotionSettings.allDiscounted", "خصم على كل القطع");
                            }
                            return t("storePromotionSettings.cheapestDiscounted", "خصم على أرخص قطعة");
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                        {typeOptions.map(o => (
                          <SelectItem key={o.value} value={o.value} className="dark:text-slate-100 dark:focus:bg-slate-800">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {t("storePromotionSettings.discountValue")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[tier.value]}
                        onValueChange={([v]) => updateTier(tier.id, { value: v })}
                        min={1}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono font-bold w-12 text-center text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 py-1 px-1.5 rounded-md border border-slate-200 dark:border-slate-700 tabular-nums shadow-xs">
                        {tier.value}%
                      </span>
                    </div>
                  </div>
                  {tier.type === "cheapest_percentage" && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {t("storePromotionSettings.discountedItems")}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={tier.items}
                        onChange={e =>
                          updateTier(tier.id, {
                            items: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 font-medium"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {t("storePromotionSettings.customerLabel")}
                  </Label>
                  <Input
                    value={tier.label}
                    onChange={e => updateTier(tier.id, { label: e.target.value })}
                    placeholder={t("storePromotionSettings.customerLabelPlaceholder", { min: tier.minQuantity })}
                    className="max-w-md bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 font-medium"
                  />
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={addTier}
              className="w-full border-dashed border-2 border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white font-semibold py-2.5 transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4 ml-2" /> {t("storePromotionSettings.addTier")}
            </Button>

            {promotion.tiers.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-8 text-slate-500 dark:text-slate-400">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm">{t("storePromotionSettings.noTiers")}</p>
              </div>
            )}
          </div>
        </SettingsSection>

        <Separator className="dark:bg-slate-800" />

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2 font-semibold shadow-sm">
            <Save className="h-4 w-4" />
            {saving ? t("storePromotionSettings.savingPromo") : t("storePromotionSettings.savePromo")}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="gap-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white font-semibold"
          >
            <RefreshCcw className="h-4 w-4" /> {t("storePromotionSettings.cancelPromo")}
          </Button>
        </div>
      </div>
    </SettingsPageShell>
  );
}
