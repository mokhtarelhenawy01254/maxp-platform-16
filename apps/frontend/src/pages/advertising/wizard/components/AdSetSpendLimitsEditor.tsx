import React from "react";
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
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              حدود إنفاق المجموعة الإعلانية (Ad Set Spend Limits)
            </h4>
            <p className="text-[11px] text-gray-500">
              تحكم في الحد الأدنى أو الأقصى الذي تصرفه هذه المجموعة تحت ميزانية الحملة Advantage (CBO)
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
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {enabled && (
        <div className="pt-3 border-t border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Min Daily Spend */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                الحد الأدنى اليومي للإنفاق (اختياري)
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <span className="absolute left-3 top-2 text-xs text-gray-400">
                  EGP
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                يضمن عدم تجاهل خوارزمية فيسبوك لهذه المجموعة الإعلانية.
              </p>
            </div>

            {/* Max Daily Spend */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                الحد الأقصى اليومي للإنفاق (اختياري)
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <span className="absolute left-3 top-2 text-xs text-gray-400">
                  EGP
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                يضع سقفاً يمنع المجموعة من استنزاف كامل ميزانية الحملة.
              </p>
            </div>
          </div>

          <div className="p-2.5 bg-blue-50 border border-blue-200/60 rounded-lg flex items-start gap-2 text-[11px] text-blue-800">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
            <span>
              ملاحظة: توصي Meta بترك ميزانية الحملة مرنة بدون حدود إلا في حال الرغبة بضمان اختبار عادل لجمهور جديد أو منع منتج معين من استهلاك الميزانية.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
