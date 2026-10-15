import React from "react";
import {
  Coins,
  DollarSign,
  AlertTriangle,
  Info,
  Layers,
} from "lucide-react";
import type { ProductFormData, ProductVariant } from "../../types";
import {
  buildAdProfitabilityPreview,
  formatPercentInputValue,
  type FacebookAdsDecisionSettings,
  type InventoryCostSummary,
} from "../../utils/adProfitabilitySettings";
import { isEnglishLocale } from "../../../../utils/currency";

interface AdvertisingProfitTabProps {
  formData: ProductFormData;
  variants: ProductVariant[];
  settings: FacebookAdsDecisionSettings;
  inventoryCostSummary?: InventoryCostSummary | null;
  displayCurrency: string;
  onSettingsChange: (settings: FacebookAdsDecisionSettings) => void;
  onOpenPricing: () => void;
  onOpenVariants: () => void;
}

const sourceLabels: Record<string, string> = {
  PRODUCT: "تكلفة المنتج",
  VARIANT_AVERAGE: "متوسط تكلفة الـ variants",
  INVENTORY: "متوسط تكلفة المخزون",
  MISSING: "غير محددة",
};

const inputBaseClass =
  "mt-1 block w-full rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary outline-none transition-all font-mono";

const metricClass =
  "rounded-xl border border-border/70 bg-card p-3 shadow-2xs";

const formatMoney = (value: number | null | undefined, currency: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const isEn = isEnglishLocale();
  const formatted = value.toLocaleString(isEn ? "en-US" : "ar-EG", { maximumFractionDigits: 2 });
  return `${formatted} ${currency}`;
};

const formatRatio = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "-";
  const isEn = isEnglishLocale();
  return value.toLocaleString(isEn ? "en-US" : "ar-EG", { maximumFractionDigits: 2 });
};

export const AdvertisingProfitTab: React.FC<AdvertisingProfitTabProps> = ({
  formData,
  variants,
  settings,
  inventoryCostSummary,
  displayCurrency,
  onSettingsChange,
  onOpenPricing,
  onOpenVariants,
}) => {
  const preview = buildAdProfitabilityPreview({
    formData,
    variants,
    inventoryCostSummary,
    settings,
  });

  const updateNumericSetting =
    (field: keyof FacebookAdsDecisionSettings) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      onSettingsChange({
        ...settings,
        [field]: rawValue === "" ? undefined : Number(rawValue),
      });
    };

  return (
    <div className="space-y-4 text-right animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-foreground">
            ربحية الإعلانات
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            التكلفة قراءة فقط من المنتج/المخزون، والإعدادات هنا تخص قرار الإعلان.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenPricing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-[0.98]"
          >
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <span>تعديل التكلفة</span>
          </button>
          <button
            type="button"
            onClick={onOpenVariants}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-[0.98]"
          >
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>تكاليف الـ variants</span>
          </button>
        </div>
      </div>

      {!preview.isReady && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="leading-relaxed">
            تكلفة المنتج غير مكتملة. قرارات التوسع/الإغلاق ستظهر بحذر لحين تسجيل التكلفة من تبويب التسعير أو الـ variants أو المخزون.
          </span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
        <div className={metricClass}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            مصدر التكلفة
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground">
            {sourceLabels[preview.costSource]}
          </p>
        </div>
        <div className={metricClass}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            التكلفة
          </p>
          <p className="mt-1 text-xs font-mono font-semibold text-foreground tabular-nums">
            {formatMoney(preview.unitCost, displayCurrency)}
          </p>
        </div>
        <div className={metricClass}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            Break-even CPA
          </p>
          <p className="mt-1 text-xs font-mono font-semibold text-foreground tabular-nums">
            {formatMoney(preview.breakEvenCpa, displayCurrency)}
          </p>
        </div>
        <div className={metricClass}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            Target CPA
          </p>
          <p className="mt-1 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatMoney(preview.targetCpa, displayCurrency)}
          </p>
        </div>
        <div className={metricClass}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            Break-even ROAS
          </p>
          <p className="mt-1 text-xs font-mono font-semibold text-foreground tabular-nums">
            {formatRatio(preview.breakEvenRoas)}
          </p>
        </div>
      </div>

      {/* Inputs & Preview Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
            <Coins className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">
              افتراضات الربحية
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground">
              شحن متوقع ({displayCurrency})
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.expectedShipping ?? ""}
                onChange={updateNumericSetting("expectedShipping")}
                className={inputBaseClass}
                placeholder="0"
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              مصاريف تحصيل ثابتة ({displayCurrency})
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.paymentFee ?? ""}
                onChange={updateNumericSetting("paymentFee")}
                className={inputBaseClass}
                placeholder="0"
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              نسبة الدفع/التحصيل %
              <input
                type="number"
                min="0"
                max="95"
                step="0.01"
                value={formatPercentInputValue(settings.paymentFeeRate)}
                onChange={updateNumericSetting("paymentFeeRate")}
                className={inputBaseClass}
                placeholder="0"
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              نسبة المرتجعات المتوقعة %
              <input
                type="number"
                min="0"
                max="95"
                step="0.01"
                value={formatPercentInputValue(settings.returnRate)}
                onChange={updateNumericSetting("returnRate")}
                className={inputBaseClass}
                placeholder="0"
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              صافي ربح مطلوب ({displayCurrency})
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.requiredNetProfit ?? ""}
                onChange={updateNumericSetting("requiredNetProfit")}
                className={inputBaseClass}
                placeholder="0"
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Max CPA يدوي ({displayCurrency})
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.configuredMaxCpa ?? ""}
                onChange={updateNumericSetting("configuredMaxCpa")}
                className={inputBaseClass}
                placeholder="اختياري"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
            <Info className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground">
              معاينة القرار
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <span className="text-muted-foreground">سعر البيع</span>
            <strong className="text-left font-mono tabular-nums text-foreground">
              {formatMoney(preview.price, displayCurrency)}
            </strong>
            <span className="text-muted-foreground">مصاريف الدفع</span>
            <strong className="text-left font-mono tabular-nums text-foreground">
              {formatMoney(preview.paymentFee, displayCurrency)}
            </strong>
            <span className="text-muted-foreground">احتياطي المرتجعات</span>
            <strong className="text-left font-mono tabular-nums text-foreground">
              {formatMoney(preview.returnReserve, displayCurrency)}
            </strong>
            <span className="text-muted-foreground">ربح قبل الإعلان</span>
            <strong className="text-left font-mono tabular-nums text-foreground">
              {formatMoney(preview.grossProfitPerPurchase, displayCurrency)}
            </strong>
            <span className="text-muted-foreground">صافي الربح المطلوب</span>
            <strong className="text-left font-mono tabular-nums text-foreground">
              {formatMoney(preview.requiredNetProfit, displayCurrency)}
            </strong>
            <span className="text-muted-foreground">حد CPA المستخدم</span>
            <strong className="text-left font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatMoney(preview.targetCpa, displayCurrency)}
            </strong>
          </div>
          {inventoryCostSummary?.unitCost !== null && inventoryCostSummary?.unitCost !== undefined && (
            <p className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground font-mono">
              المخزون: {formatMoney(inventoryCostSummary.unitCost, displayCurrency)} من {inventoryCostSummary.records || 0} سجلات.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdvertisingProfitTab;
