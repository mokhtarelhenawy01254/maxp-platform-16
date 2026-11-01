import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Info, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SettingsSection } from "../components/SettingsPagePrimitives";
import { getTierTypeLabel, PromotionTier, TierType } from "./types";

interface StorePromotionTiersSectionProps {
  tiers: PromotionTier[];
  typeOptions: { value: TierType; label: string }[];
  onAddTier: () => void;
  onRemoveTier: (id: string) => void;
  onUpdateTier: (id: string, updates: Partial<PromotionTier>) => void;
}

export const StorePromotionTiersSection: React.FC<StorePromotionTiersSectionProps> = ({
  tiers,
  typeOptions,
  onAddTier,
  onRemoveTier,
  onUpdateTier,
}) => {
  const { t } = useTranslation();

  return (
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

        {tiers.map((tier, index) => (
          <div
            key={tier.id}
            className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-4 dark:border-slate-800 dark:bg-slate-950/60 shadow-xs transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-100 text-xs font-mono font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/30 tabular-nums">
                  {index + 1}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t("storePromotionSettings.tierLevel", { index: index + 1 })}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveTier(tier.id)}
                className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/50"
                aria-label="حذف المستوى"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {t("storePromotionSettings.minQuantity")}
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={tier.minQuantity}
                  onChange={(e) =>
                    onUpdateTier(tier.id, {
                      minQuantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 font-medium font-mono tabular-nums"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {t("storePromotionSettings.discountType")}
                </Label>
                <Select
                  value={tier.type}
                  onValueChange={(val: TierType) => onUpdateTier(tier.id, { type: val })}
                >
                  <SelectTrigger className="w-full bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 font-medium">
                    <SelectValue>
                      {getTierTypeLabel(tier.type, t)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                    {typeOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="dark:text-slate-100 dark:focus:bg-slate-800"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {t("storePromotionSettings.discountValue")}
                </Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[tier.value]}
                    onValueChange={([val]) => onUpdateTier(tier.id, { value: val })}
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
                  <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {t("storePromotionSettings.discountedItems")}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={tier.items}
                    onChange={(e) =>
                      onUpdateTier(tier.id, {
                        items: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                    className="bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 font-medium font-mono tabular-nums"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {t("storePromotionSettings.customerLabel")}
              </Label>
              <Input
                value={tier.label}
                onChange={(e) => onUpdateTier(tier.id, { label: e.target.value })}
                placeholder={t("storePromotionSettings.customerLabelPlaceholder", { min: tier.minQuantity })}
                className="max-w-md bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500 font-medium"
              />
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={onAddTier}
          className="w-full border-dashed border-2 border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white font-semibold py-2.5 transition-colors shadow-xs"
        >
          <Plus className="h-4 w-4 ml-2" /> {t("storePromotionSettings.addTier")}
        </Button>

        {tiers.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-slate-500 dark:text-slate-400">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">{t("storePromotionSettings.noTiers")}</p>
          </div>
        )}
      </div>
    </SettingsSection>
  );
};
