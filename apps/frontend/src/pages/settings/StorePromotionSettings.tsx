import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Calendar, Gift, PanelTop, Plus, RefreshCcw, RefreshCw, Save, ShoppingBag, ShoppingCart, Tag, Trash2 } from 'lucide-react';

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
          <Button variant="outline" size="sm" onClick={fillDefaults}>
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
          accentClassName="bg-amber-50 text-amber-700 ring-amber-200/70"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>{t("storePromotionSettings.enablePromo")}</Label>
              <p className="text-sm text-muted-foreground">
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
          accentClassName="bg-rose-50 text-rose-700 ring-rose-200/70"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>{t("storePromotionSettings.disableOtherDiscounts")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("storePromotionSettings.disableOtherDiscountsDesc")}
              </p>
            </div>
            <Switch
              checked={promotion.disableOtherDiscounts}
              onCheckedChange={checked => setPromotion(p => ({ ...p, disableOtherDiscounts: checked }))}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Tag}
          title={t("storePromotionSettings.promoTitle")}
          description={t("storePromotionSettings.promoTitleDesc")}
          accentClassName="bg-sky-50 text-sky-700 ring-sky-200/70"
        >
          <Input
            value={promotion.title}
            onChange={e => setPromotion(p => ({ ...p, title: e.target.value }))}
            placeholder={t("storePromotionSettings.promoTitlePlaceholder")}
            className="max-w-md"
          />
        </SettingsSection>

        <SettingsSection
          icon={Calendar}
          title={t("storePromotionSettings.promoDate")}
          description={t("storePromotionSettings.promoDateDesc")}
          accentClassName="bg-violet-50 text-violet-700 ring-violet-200/70"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("storePromotionSettings.from")}</Label>
              <Input type="datetime-local" value={promotion.startDate}
                onChange={e => setPromotion(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("storePromotionSettings.to")}</Label>
              <Input type="datetime-local" value={promotion.endDate}
                onChange={e => setPromotion(p => ({ ...p, endDate: e.target.value }))} />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={PanelTop}
          title={t("storePromotionSettings.barSettings")}
          description={t("storePromotionSettings.barSettingsDesc")}
          accentClassName="bg-amber-50 text-amber-700 ring-amber-200/70"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t("storePromotionSettings.showBar")}</Label>
                <p className="text-sm text-muted-foreground">{t("storePromotionSettings.showBarDesc")}</p>
              </div>
              <Switch
                checked={promotion.barVisible}
                onCheckedChange={checked => setPromotion(p => ({ ...p, barVisible: checked }))}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>{t("storePromotionSettings.stickyBar")}</Label>
                <p className="text-sm text-muted-foreground">{t("storePromotionSettings.stickyBarDesc")}</p>
              </div>
              <Switch
                checked={promotion.barSticky}
                onCheckedChange={checked => setPromotion(p => ({ ...p, barSticky: checked }))}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>{t("storePromotionSettings.barPages")}</Label>
              <p className="text-sm text-muted-foreground">{t("storePromotionSettings.barPagesDesc")}</p>
              <Select value={promotion.barPages}
                onValueChange={val => setPromotion(p => ({ ...p, barPages: val }))}>
                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("storePromotionSettings.allPages")}</SelectItem>
                  <SelectItem value="shop">{t("storePromotionSettings.shopOnly")}</SelectItem>
                  <SelectItem value="product">{t("storePromotionSettings.productOnly")}</SelectItem>
                  <SelectItem value="checkout">{t("storePromotionSettings.checkoutOnly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={ShoppingCart}
          title={t("storePromotionSettings.discountTiers")}
          description={t("storePromotionSettings.discountTiersDesc")}
          accentClassName="bg-emerald-50 text-emerald-700 ring-emerald-200/70"
        >
          <div className="space-y-4">
            {promotion.tiers.map((tier, index) => (
              <div key={tier.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("storePromotionSettings.tierLevel", { index: index + 1 })}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeTier(tier.id)} className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>{t("storePromotionSettings.minQuantity")}</Label>
                    <Input type="number" min={1} value={tier.minQuantity}
                      onChange={e => updateTier(tier.id, { minQuantity: Math.max(1, parseInt(e.target.value) || 1) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("storePromotionSettings.discountType")}</Label>
                    <Select value={tier.type}
                      onValueChange={(val: TierType) => updateTier(tier.id, { type: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {typeOptions.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("storePromotionSettings.discountValue")}</Label>
                    <div className="flex items-center gap-2">
                      <Slider value={[tier.value]} onValueChange={([v]) => updateTier(tier.id, { value: v })} min={1} max={100} step={5} className="flex-1" />
                      <span className="text-sm font-mono w-10 text-left">{tier.value}%</span>
                    </div>
                  </div>
                  {tier.type === "cheapest_percentage" && (
                    <div className="space-y-2">
                      <Label>{t("storePromotionSettings.discountedItems")}</Label>
                      <Input type="number" min={1} value={tier.items}
                        onChange={e => updateTier(tier.id, { items: Math.max(1, parseInt(e.target.value) || 1) })} />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t("storePromotionSettings.customerLabel")}</Label>
                  <Input value={tier.label}
                    onChange={e => updateTier(tier.id, { label: e.target.value })}
                    placeholder={t("storePromotionSettings.customerLabelPlaceholder", { min: tier.minQuantity })}
                    className="max-w-md" />
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addTier} className="w-full">
              <Plus className="h-4 w-4 ml-2" /> {t("storePromotionSettings.addTier")}
            </Button>

            {promotion.tiers.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm">{t("storePromotionSettings.noTiers")}</p>
              </div>
            )}
          </div>
        </SettingsSection>

        <Separator />

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? t("storePromotionSettings.savingPromo") : t("storePromotionSettings.savePromo")}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={saving} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> {t("storePromotionSettings.cancelPromo")}
          </Button>
        </div>
      </div>
    </SettingsPageShell>
  );
}
