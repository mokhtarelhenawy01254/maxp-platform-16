import React from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SettingsLoadingState,
  SettingsPageHero,
  SettingsPageShell,
  SettingsStatusAlert,
} from "./components/SettingsPagePrimitives";
import {
  FlatShippingSection,
  FreeShippingSection,
  PromotionFloatingSaveIndicator,
  PromotionRelatedNav,
  PromotionResetCard,
  UtilityBarSection,
  usePromotionSettingsController,
} from "./promotion-settings";

const PromotionSettings: React.FC = () => {
  const {
    t,
    loading,
    saveState,
    message,
    setMessage,
    freeShippingSettings,
    flatShippingSettings,
    hideUtilityBar,
    thresholdError,
    setThresholdError,
    feeError,
    setFeeError,
    preview,
    summaryItems,
    updateFree,
    updateFlat,
    handleToggleUtilityBar,
    insertAmountToken,
    handleReset,
  } = usePromotionSettingsController();

  if (loading) {
    return (
      <SettingsLoadingState
        title={t("promotionSettings.loadingTitle")}
        description={t("promotionSettings.loadingDescription")}
      />
    );
  }

  return (
    <>
      <SettingsPageShell>
        <SettingsPageHero
          badgeIcon={Sparkles}
          badgeLabel={t("promotionSettings.badgeLabel")}
          title={t("promotionSettings.pageTitle")}
          description={t("promotionSettings.pageDescription")}
          action={
            <div
              aria-live="polite"
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
                saveState === "saving" &&
                  "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300",
                saveState === "saved" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300",
                saveState === "idle" &&
                  "border-slate-200 bg-white/85 text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300",
              )}
            >
              {saveState === "saving" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              {saveState === "saving"
                ? t("promotionSettings.saveSaving")
                : saveState === "saved"
                  ? t("promotionSettings.saveSaved")
                  : t("promotionSettings.saveIdle")}
            </div>
          }
          summaryItems={summaryItems}
        />

        <div className="space-y-6 px-6 py-6">
          <SettingsStatusAlert message={message} onDismiss={() => setMessage(null)} />

          {/* Related Tools Navigation */}
          <PromotionRelatedNav />

          {/* Free Shipping Configuration */}
          <FreeShippingSection
            freeShippingSettings={freeShippingSettings}
            thresholdError={thresholdError}
            preview={preview}
            onUpdateFree={updateFree}
            setThresholdError={setThresholdError}
            insertAmountToken={insertAmountToken}
          />

          {/* Top Utility Bar Visibility Toggle */}
          <UtilityBarSection
            hideUtilityBar={hideUtilityBar}
            onToggleUtilityBar={(val) => void handleToggleUtilityBar(val)}
          />

          {/* Flat Shipping Configuration */}
          <FlatShippingSection
            flatShippingSettings={flatShippingSettings}
            feeError={feeError}
            onUpdateFlat={updateFlat}
            setFeeError={setFeeError}
          />

          {/* Reset Settings to Default */}
          <PromotionResetCard onReset={() => void handleReset()} />
        </div>
      </SettingsPageShell>

      {/* Floating Save Status Pill Indicator */}
      <PromotionFloatingSaveIndicator saveState={saveState} />
    </>
  );
};

export default PromotionSettings;
