import React from "react";
import { useTranslation } from "react-i18next";
import { Sliders, AlertCircle, Info } from "lucide-react";

interface AdSetSpendLimitsEditorProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  minDailySpend?: number;
  onMinDailySpendChange: (val?: number) => void;
  maxDailySpend?: number;
  onMaxDailySpendChange: (val?: number) => void;
  campaignBudget: number;
}

export const AdSetSpendLimitsEditor: React.FC<AdSetSpendLimitsEditorProps> = ({
  enabled,
  onToggle,
  minDailySpend,
  onMinDailySpendChange,
  maxDailySpend,
  onMaxDailySpendChange,
  campaignBudget,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3" dir={isEn ? "ltr" : "rtl"}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              {isEn ? "Ad Set Spend Limits" : "حدود إنفاق المجموعة الإعلانية (Ad Set Spend Limits)"}
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {isEn
                ? "Control minimum or maximum spend for this ad set under Advantage Campaign Budget (CBO)"
                : "تحكم في الحد الأدنى أو الأقصى الذي تصرفه هذه المجموعة تحت ميزانية الحملة Advantage (CBO)"}
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {enabled && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Min Daily Spend */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {isEn ? "Daily Minimum Spend (Optional)" : "الحد الأدنى اليومي للإنفاق (اختياري)"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={campaignBudget}
                  value={minDailySpend ?? ""}
                  onChange={(e) =>
                    onMinDailySpendChange(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="0.00"
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-medium placeholder-gray-400 dark:placeholder-gray-500 ${isEn ? "pr-12" : "pl-12"}`}
                />
                <span className={`absolute top-2 text-xs text-gray-400 dark:text-gray-500 ${isEn ? "right-3" : "left-3"}`}>
                  EGP
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                {isEn
                  ? "Ensures Facebook's algorithm doesn't overlook this ad set."
                  : "يضمن عدم تجاهل خوارزمية فيسبوك لهذه المجموعة الإعلانية."}
              </p>
            </div>

            {/* Max Daily Spend */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {isEn ? "Daily Maximum Spend (Optional)" : "الحد الأقصى اليومي للإنفاق (اختياري)"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={campaignBudget}
                  value={maxDailySpend ?? ""}
                  onChange={(e) =>
                    onMaxDailySpendChange(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="0.00"
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-medium placeholder-gray-400 dark:placeholder-gray-500 ${isEn ? "pr-12" : "pl-12"}`}
                />
                <span className={`absolute top-2 text-xs text-gray-400 dark:text-gray-500 ${isEn ? "right-3" : "left-3"}`}>
                  EGP
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                {isEn
                  ? "Sets a cap preventing this ad set from draining the entire campaign budget."
                  : "يضع سقفاً يمنع المجموعة من استنزاف كامل ميزانية الحملة."}
              </p>
            </div>
          </div>

          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 rounded-lg flex items-start gap-2 text-[11px] text-blue-800 dark:text-blue-200">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <span>
              {isEn
                ? "Note: Meta recommends leaving campaign budgets flexible without limits unless you specifically want to ensure fair testing for a new audience or prevent a single product from consuming the budget."
                : "ملاحظة: توصي Meta بترك ميزانية الحملة مرنة بدون حدود إلا في حال الرغبة بضمان اختبار عادل لجمهور جديد أو منع منتج معين من استهلاك الميزانية."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
