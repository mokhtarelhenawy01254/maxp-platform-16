import React from "react";
import {
  BanknotesIcon,
  CalendarDaysIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface AdSetBudgetStepProps {
  isCboCampaign: boolean;
  campaignBudgetText?: string;
  budgetType: "DAILY" | "LIFETIME";
  onBudgetTypeChange: (type: "DAILY" | "LIFETIME") => void;
  budgetAmount: number;
  onBudgetAmountChange: (amount: number) => void;
  startTime: string;
  onStartTimeChange: (time: string) => void;
  hasEndDate: boolean;
  onHasEndDateChange: (has: boolean) => void;
  endTime: string;
  onEndTimeChange: (time: string) => void;
  bidStrategy: string;
  onBidStrategyChange: (strategy: string) => void;
  bidValue?: number;
  onBidValueChange: (val?: number) => void;
  attributionWindow: string;
  onAttributionWindowChange: (window: string) => void;
  isDynamicCreative: boolean;
  onDynamicCreativeChange: (enabled: boolean) => void;
}

const BID_STRATEGIES = [
  {
    id: "LOWEST_COST_WITHOUT_CAP",
    title: "أعلى حجم (Highest Volume / Lowest Cost)",
    description: "الحصول على أكبر قدر من النتائج الممكنة ضمن الميزانية (الافتراضي)",
    badge: "الأكثر استخداماً",
  },
  {
    id: "COST_CAP",
    title: "سقف تكلفة النتيجة (Cost per result goal)",
    description: "تحديد حد أقصى لتكلفة كل عملية شراء (مثلاً لا تزيد عن 70 ج.م)",
    badge: "لضبط هوامش الربح",
    hasInput: true,
  },
  {
    id: "BID_CAP",
    title: "الحد الأقصى للمزايدة (Bid Cap)",
    description: "تحديد أعلى سعر مزايدة تدفعه ميتا في المزاد الإعلاني الواحد",
    badge: "للمحترفين",
    hasInput: true,
  },
];

const ATTRIBUTION_WINDOWS = [
  {
    id: "7d_click_1d_view",
    title: "7 أيام نقر أو يوم واحد مشاهدة (7d click / 1d view)",
    description: "المعيار القياسي الموصى به لمتاجر التجارة الإلكترونية والتسوق",
  },
  {
    id: "1d_click_1d_view",
    title: "يوم واحد نقر أو يوم واحد مشاهدة (1d click / 1d view)",
    description: "للمنتجات سريعة الشراء والقرارات اللحظية",
  },
  {
    id: "7d_click",
    title: "7 أيام نقر فقط (7d click)",
    description: "تجاهل مشاهدات الإعلان واحتساب النقر الفعلي فقط",
  },
  {
    id: "1d_click",
    title: "يوم واحد نقر فقط (1d click)",
    description: "أقصر نافذة احتساب إسناد للشراء المباشر الفوري",
  },
];

export const AdSetBudgetStep: React.FC<AdSetBudgetStepProps> = ({
  isCboCampaign,
  campaignBudgetText,
  budgetType,
  onBudgetTypeChange,
  budgetAmount,
  onBudgetAmountChange,
  startTime,
  onStartTimeChange,
  hasEndDate,
  onHasEndDateChange,
  endTime,
  onEndTimeChange,
  bidStrategy,
  onBidStrategyChange,
  bidValue,
  onBidValueChange,
  attributionWindow,
  onAttributionWindowChange,
  isDynamicCreative,
  onDynamicCreativeChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Budget Configuration */}
      <div>
        <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
          <BanknotesIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <span>الميزانية ونظام الإنفاق (Budget & Spending)</span>
        </label>

        {isCboCampaign ? (
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-purple-900 dark:text-purple-200">
              <SparklesIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>ميزانية الحملة Advantage+ مفعلة (CBO)</span>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300">
              هذه الحملة تستخدم توزيع الميزانية الذكي على مستوى الحملة بالكامل
              {campaignBudgetText ? ` (${campaignBudgetText})` : ""}.
              سيقوم نظام ميتا بتوزيع الإنفاق تلقائياً على المجموعات الأكثر تحقيقاً للمبيعات، ولن تحتاج لتحديد ميزانية لهذه المجموعة يدوياً.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  نوع الميزانية *
                </label>
                <select
                  value={budgetType}
                  onChange={(e) =>
                    onBudgetTypeChange(e.target.value as "DAILY" | "LIFETIME")
                  }
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="DAILY">ميزانية يومية (Daily Budget)</option>
                  <option value="LIFETIME">ميزانية إجمالية طوال المدة (Lifetime Budget)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  مبلغ الميزانية (ج.م) *
                </label>
                <input
                  type="number"
                  min={1}
                  step={10}
                  value={budgetAmount || ""}
                  onChange={(e) => onBudgetAmountChange(Number(e.target.value))}
                  placeholder="مثال: 500"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              * سيتم إنفاق هذا المبلغ وفق وتيرة المزاد اليومي لحسابك الإعلاني.
            </p>
          </div>
        )}
      </div>

      {/* Schedule & Timing */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
        <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
          <CalendarDaysIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <span>الجدولة وتوقيت الإطلاق (Schedule)</span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          حدد موعد بدء تشغيل المجموعة الإعلانية (بالتوقيت المحلي للقاهرة)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              تاريخ وتوقيت البدء
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                تاريخ وتوقيت الانتهاء
              </label>
              <label className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasEndDate}
                  onChange={(e) => onHasEndDateChange(e.target.checked)}
                  className="w-3.5 h-3.5 text-cyan-600 rounded cursor-pointer"
                />
                <span>تحديد موعد انتهاء</span>
              </label>
            </div>
            <input
              type="datetime-local"
              disabled={!hasEndDate}
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 ${
                hasEndDate
                  ? "border-gray-300 dark:border-gray-700"
                  : "border-gray-200 dark:border-gray-800 opacity-50 cursor-not-allowed"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Cost Control & Bid Strategy */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
        <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <span>استراتيجية التحكم بالتكلفة والمزايدة (Bid Strategy)</span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          التحكم في تكلفة الشراء أو ترك النظام للمزايدة التلقائية للحصول على أكبر عدد من المبيعات
        </p>

        <div className="space-y-2">
          {BID_STRATEGIES.map((bs) => {
            const isSelected = bidStrategy === bs.id;
            return (
              <div
                key={bs.id}
                onClick={() => onBidStrategyChange(bs.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-cyan-600 bg-cyan-50/50 dark:bg-cyan-950/20 dark:border-cyan-400 shadow-xs"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 bg-white dark:bg-gray-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="bid_strategy"
                      checked={isSelected}
                      onChange={() => onBidStrategyChange(bs.id)}
                      className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                          {bs.title}
                        </span>
                        {bs.badge && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 font-semibold">
                            {bs.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {bs.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircleIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  )}
                </div>

                {isSelected && bs.hasInput && (
                  <div className="mt-3 pt-3 border-t border-cyan-100 dark:border-cyan-900/40 flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                      الحد الأقصى المستهدف (ج.م):
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={5}
                      value={bidValue || ""}
                      onChange={(e) =>
                        onBidValueChange(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="مثال: 70"
                      className="w-36 px-3 py-1.5 bg-white dark:bg-gray-900 border border-cyan-400 rounded-lg text-xs font-bold text-gray-900 dark:text-white"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-[11px] text-gray-400">
                      (سيتوقف الإعلان إذا زادت تكلفة النتيجة عن هذا المبلغ)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Attribution Settings */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
        <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1.5">
          إعدادات نافذة الإسناد (Attribution Setting)
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          الفترة الزمنية التي يقوم البيكسل بنسب عملية الشراء فيها إلى هذا الإعلان
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ATTRIBUTION_WINDOWS.map((win) => {
            const isSelected = attributionWindow === win.id;
            return (
              <button
                key={win.id}
                type="button"
                onClick={() => onAttributionWindowChange(win.id)}
                className={`text-right p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-cyan-600 bg-cyan-50/50 dark:bg-cyan-950/20 dark:border-cyan-400 shadow-xs"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs text-gray-900 dark:text-white">
                    {win.title}
                  </span>
                  {isSelected && (
                    <CheckCircleIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {win.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Creative Option */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-xl border border-cyan-200 dark:border-cyan-800/50 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                التوليف الإبداعي الديناميكي (Dynamic Creative / DCO)
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              السماح لميتا باختبار تركيبات مختلفة من الصور والنصوص والعناوين وتوليد النسخة الأفضل لكل عميل تلقائياً
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isDynamicCreative}
              onChange={(e) => onDynamicCreativeChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};
