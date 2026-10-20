import { Clock, Eye, ShieldCheck, TrendingUp } from "lucide-react";
import { fmtMoney } from "../../shared";
import { type WorkTypeForm, CATEGORY_LABELS } from "../types/workTypeTypes";

interface WorkTypeLivePreviewProps {
  modal: WorkTypeForm;
  liveProfit: number;
  liveMarginPct: number;
}

export function WorkTypeLivePreview({
  modal,
  liveProfit,
  liveMarginPct,
}: WorkTypeLivePreviewProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-2">
          <Eye className="w-4 h-4 text-blue-600" />
          معاينة حية (كيف تظهر للطبيب في البوابة)
        </label>
        <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/20 dark:to-gray-850 p-4 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                {CATEGORY_LABELS[modal.category] || modal.category}
              </span>
              <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 mt-1">
                {modal.name.trim() || "اسم نوع الشغل"}
              </h4>
            </div>
            <div className="text-end">
              <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {fmtMoney(modal.price)} ج.م
              </div>
              <span className="text-[10px] text-gray-400">
                {modal.pricingMode === "PER_UNIT"
                  ? "/ وحدة واحدة"
                  : "سعر شامل"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">الخامة:</span>
              <span className="font-medium truncate max-w-[150px]">
                {modal.defaultMaterial || "—"}
              </span>
            </div>
            {modal.materialBrand && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">الماركة:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {modal.materialBrand}
                </span>
              </div>
            )}
            {modal.defaultWarrantyYears > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> الضمان:
                </span>
                <span className="font-mono tabular-nums">
                  {modal.defaultWarrantyYears} سنوات
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-gray-400">
                <Clock className="w-3.5 h-3.5" /> مدة التنفيذ:
              </span>
              <span className="font-mono tabular-nums">
                {modal.leadTimeDays} أيام عمل
              </span>
            </div>
          </div>

          {modal.instructions && (
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-200">
              <span className="font-bold block mb-0.5">
                توصيات التحضير للعيادة:
              </span>
              <p className="line-clamp-3">{modal.instructions}</p>
            </div>
          )}
        </div>
      </div>

      {/* Profit Margin Analyzer Card for Lab Owner */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3.5 space-y-2 text-xs">
        <div className="flex items-center justify-between font-bold text-gray-800 dark:text-gray-200">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> تحليل ربحية الخدمة
          </span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
            {liveMarginPct}% هامش
          </span>
        </div>
        <div className="space-y-1 text-gray-600 dark:text-gray-300">
          <div className="flex justify-between">
            <span>سعر البيع للطبيب:</span>
            <span className="font-bold font-mono tabular-nums">
              {fmtMoney(modal.price)} ج.م
            </span>
          </div>
          <div className="flex justify-between">
            <span>تكلفة المواد والبلوكات:</span>
            <span className="text-red-500 font-bold font-mono tabular-nums">
              -{fmtMoney(modal.costPrice)} ج.م
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t dark:border-gray-700 font-bold text-emerald-600 dark:text-emerald-400">
            <span>صافي ربح الوحدة / الخدمة:</span>
            <span className="font-mono tabular-nums">
              +{fmtMoney(liveProfit)} ج.م
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkTypeLivePreview;
