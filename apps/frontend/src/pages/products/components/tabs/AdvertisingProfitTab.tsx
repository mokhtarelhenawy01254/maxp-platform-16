import { DollarSign as BanknotesIcon, DollarSign as CurrencyDollarIcon, AlertTriangle as ExclamationTriangleIcon, Info as InformationCircleIcon, Circle as SwatchIcon } from 'lucide-react';
import React from "react";
;
import type { ProductFormData, ProductVariant } from "../../types";
import {
  buildAdProfitabilityPreview,
  formatPercentInputValue,
  type FacebookAdsDecisionSettings,
  type InventoryCostSummary,
} from "../../utils/adProfitabilitySettings";

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
  "mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

const metricClass =
  "rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800";

const formatMoney = (value: number | null | undefined, currency: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ${currency}`;
};

const formatRatio = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return value.toLocaleString("ar-EG", { maximumFractionDigits: 2 });
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
    <div className="animate-fade-in space-y-3">
      <div className="flex flex-col gap-2 rounded-md border border-indigo-100 bg-indigo-50/60 px-3 py-2 dark:border-indigo-900/40 dark:bg-indigo-900/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            ربحية الإعلانات
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            التكلفة قراءة فقط من المنتج/المخزون، والإعدادات هنا تخص قرار الإعلان.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenPricing}
            className="inline-flex items-center rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-gray-900 dark:text-indigo-200"
          >
            <CurrencyDollarIcon className="ml-1.5 h-4 w-4" />
            تعديل التكلفة
          </button>
          <button
            type="button"
            onClick={onOpenVariants}
            className="inline-flex items-center rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-gray-900 dark:text-indigo-200"
          >
            <SwatchIcon className="ml-1.5 h-4 w-4" />
            تكاليف الـ variants
          </button>
        </div>
      </div>

      {!preview.isReady && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span>
            تكلفة المنتج غير مكتملة. قرارات التوسع/الإغلاق هتظهر بحذر لحد ما تتسجل
            التكلفة من تبويب التسعير أو من الـ variants أو المخزون.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
        <div className={metricClass}>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            مصدر التكلفة
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {sourceLabels[preview.costSource]}
          </p>
        </div>
        <div className={metricClass}>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            التكلفة
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {formatMoney(preview.unitCost, displayCurrency)}
          </p>
        </div>
        <div className={metricClass}>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            Break-even CPA
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {formatMoney(preview.breakEvenCpa, displayCurrency)}
          </p>
        </div>
        <div className={metricClass}>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            Target CPA
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {formatMoney(preview.targetCpa, displayCurrency)}
          </p>
        </div>
        <div className={metricClass}>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            Break-even ROAS
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {formatRatio(preview.breakEvenRoas)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center gap-2">
            <BanknotesIcon className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              افتراضات الربحية
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
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
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
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
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
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
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
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
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
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
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
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

        <section className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center gap-2">
            <InformationCircleIcon className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              معاينة القرار
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">سعر البيع</span>
            <strong className="text-left text-gray-900 dark:text-white">
              {formatMoney(preview.price, displayCurrency)}
            </strong>
            <span className="text-gray-500 dark:text-gray-400">مصاريف الدفع</span>
            <strong className="text-left text-gray-900 dark:text-white">
              {formatMoney(preview.paymentFee, displayCurrency)}
            </strong>
            <span className="text-gray-500 dark:text-gray-400">احتياطي المرتجعات</span>
            <strong className="text-left text-gray-900 dark:text-white">
              {formatMoney(preview.returnReserve, displayCurrency)}
            </strong>
            <span className="text-gray-500 dark:text-gray-400">ربح قبل الإعلان</span>
            <strong className="text-left text-gray-900 dark:text-white">
              {formatMoney(preview.grossProfitPerPurchase, displayCurrency)}
            </strong>
            <span className="text-gray-500 dark:text-gray-400">صافي الربح المطلوب</span>
            <strong className="text-left text-gray-900 dark:text-white">
              {formatMoney(preview.requiredNetProfit, displayCurrency)}
            </strong>
            <span className="text-gray-500 dark:text-gray-400">حد CPA المستخدم</span>
            <strong className="text-left text-emerald-700 dark:text-emerald-300">
              {formatMoney(preview.targetCpa, displayCurrency)}
            </strong>
          </div>
          {inventoryCostSummary?.unitCost !== null && inventoryCostSummary?.unitCost !== undefined && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              المخزون: {formatMoney(inventoryCostSummary.unitCost, displayCurrency)}
              {" "}من {inventoryCostSummary.records || 0} سجلات.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
