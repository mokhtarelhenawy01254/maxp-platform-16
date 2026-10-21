import React from "react";
import { Target, Sparkles, MessageCircle, Gift } from "lucide-react";
import { FilterMode } from "./types";

interface CustomerPointsCampaignsRibbonProps {
  earningRuleText: string;
  atRiskCount: number;
  onFilterModeChange: (mode: FilterMode) => void;
}

export const CustomerPointsCampaignsRibbon: React.FC<CustomerPointsCampaignsRibbonProps> = ({
  earningRuleText,
  atRiskCount,
  onFilterModeChange,
}) => {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-5 shadow-sm dark:border-amber-900/30 dark:from-gray-800 dark:to-amber-900/10">
        <div className="mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-500">
          <Target className="h-5 w-5" />
          <h4 className="font-semibold text-gray-900 dark:text-white">
            برامج ولاء كبار المتاجر
          </h4>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 h-16">
          فعّل إرسال رسائل آلية عند وصول العميل لمستوى VIP لمكافأته بتوصيل مجاني لتعزيز شعوره بالولاية.
        </p>
        <button
          type="button"
          onClick={() => onFilterModeChange("VIP")}
          className="w-full text-sm py-2 px-3 bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 shadow-sm transition dark:bg-gray-800 dark:border-gray-600 dark:text-amber-400 cursor-pointer"
        >
          عرض عملاء VIP الآن
        </button>
      </div>

      <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-white to-purple-50 p-5 shadow-sm dark:border-purple-900/30 dark:from-gray-800 dark:to-purple-900/10">
        <div className="mb-3 flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <Sparkles className="h-5 w-5" />
          <h4 className="font-semibold text-gray-900 dark:text-white">
            أيام المضاعفات الترويجية
          </h4>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 h-10">
          أبلغ العملاء عن أيام ترويجية لكسب مضاعف عبر الواتساب.
        </p>
        <p className="text-xs text-purple-700 dark:text-purple-300 mb-4 font-medium flex items-center line-clamp-1 w-full truncate">
          المعدل الحالي: {earningRuleText}
        </p>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 text-sm py-2 px-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm transition cursor-pointer"
        >
          <MessageCircle className="h-4 w-4" />
          إرسال تنبيه بالبرنامج (قريباً)
        </button>
      </div>

      <div className="rounded-xl border border-red-200 bg-gradient-to-br from-white to-red-50 p-5 shadow-sm dark:border-red-900/30 dark:from-gray-800 dark:to-red-900/10">
        <div className="mb-3 flex items-center gap-2 text-red-600 dark:text-red-500">
          <Gift className="h-5 w-5" />
          <h4 className="font-semibold text-gray-900 dark:text-white">
            حملات إنقاذ النقاط (Expiry)
          </h4>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 h-16">
          العملاء المهددون بخسارة رصيدهم. ارسل لهم عروض استبدال سريعة قبل خصم النقاط نهائياً.
        </p>
        <button
          type="button"
          onClick={() => onFilterModeChange("AT_RISK")}
          className="w-full text-sm py-2 px-3 bg-red-50 border border-red-200 text-red-700 font-medium rounded-lg shadow-sm hover:bg-red-100 transition dark:bg-red-900/30 dark:border-red-900 dark:text-red-400 cursor-pointer font-mono tabular-nums"
        >
          استهداف ({atRiskCount}) عميل
        </button>
      </div>
    </div>
  );
};
