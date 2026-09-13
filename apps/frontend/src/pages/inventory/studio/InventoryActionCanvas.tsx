import React, { useState } from "react";
import {
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Tag,
  Boxes,
  RotateCcw,
} from "lucide-react";
import type { StudioEntity, StudioDraftAction } from "../../../components/agent-studio/types";
import { applyInventoryStudioAction } from "../../../services/inventoryAiService";

interface InventoryActionCanvasProps {
  selectedProduct: StudioEntity | null;
  activeDraft: StudioDraftAction | null;
  onDraftResolved?: () => void;
  onRequestAction?: (actionPrompt: string) => void;
  onProductUpdated?: (updatedProduct: Partial<StudioEntity>) => void;
}

export const InventoryActionCanvas: React.FC<InventoryActionCanvasProps> = ({
  selectedProduct,
  activeDraft,
  onDraftResolved,
  onRequestAction,
  onProductUpdated,
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Calculate Product Economics
  const price = selectedProduct?.price || 0;
  const cost = selectedProduct?.cost || 0;
  const stock = selectedProduct?.stock || 0;
  const profit = price > cost ? price - cost : 0;
  const marginPercent = price > 0 ? Math.round((profit / price) * 100) : 0;

  const isLowStock = stock < 10;
  const isOutOfStock = stock <= 0;

  const handleApplyDraft = async () => {
    if (!activeDraft || !selectedProduct?.id || isApplying) return;

    setIsApplying(true);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);

    try {
      const res = await applyInventoryStudioAction({
        type: activeDraft.type === "GENERAL_DRAFT" ? "PRICE_CHANGE" : activeDraft.type,
        productId: selectedProduct.id,
        newValue: activeDraft.proposedValue || 0,
        reason: activeDraft.reason,
      });

      if (res.success) {
        setActionSuccessMessage(res.message || "تم تنفيذ الإجراء بنجاح");
        if (activeDraft.type === "PRICE_CHANGE" && onProductUpdated) {
          onProductUpdated({ price: Number(activeDraft.proposedValue) });
        } else if (activeDraft.type === "STOCK_ADJUSTMENT" && onProductUpdated) {
          onProductUpdated({ stock: Number(activeDraft.proposedValue) });
        }
        if (onDraftResolved) {
          setTimeout(() => onDraftResolved(), 1200);
        }
      } else {
        setActionErrorMessage(res.error || "تعذر تطبيق التعديل");
      }
    } catch (err: any) {
      setActionErrorMessage(err.message || "حدث خطأ غير متوقع أثناء تطبيق التعديل");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-5 space-y-4 select-none">
      {/* Canvas Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              لوحة اقتصاديات المنتج والمخزون
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              مؤشرات الأرباح والكميات المتاحة والتوصيات المعتمدة
            </p>
          </div>
        </div>

        {selectedProduct && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold tabular-nums ${
              isOutOfStock
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300"
                : isLowStock
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
            }`}
          >
            {isOutOfStock ? "نفذ المخزون" : isLowStock ? "مخزون حرج" : "مخزون آمن"}
          </span>
        )}
      </div>

      {/* Selected Product Card */}
      {selectedProduct ? (
        <div className="space-y-4">
          {/* Product Overview Tile */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-center">
                {selectedProduct.mainImage ? (
                  <img
                    src={selectedProduct.mainImage}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-7 h-7 text-slate-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {selectedProduct.name}
                  </h3>
                  {selectedProduct.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium shrink-0">
                      {selectedProduct.category}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <span className="tabular-nums">
                    سعر البيع:{" "}
                    <strong className="text-slate-900 dark:text-white font-black">
                      {price} ج.م
                    </strong>
                  </span>
                  {cost > 0 && (
                    <span className="tabular-nums">
                      التكلفة:{" "}
                      <strong className="text-slate-700 dark:text-slate-300 font-bold">
                        {cost} ج.م
                      </strong>
                    </span>
                  )}
                  <span className="tabular-nums">
                    الرصيد:{" "}
                    <strong
                      className={`font-black ${
                        isLowStock ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {stock} قطعة
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* Margin % */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                <span>هامش الربح</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums">
                {marginPercent}%
              </div>
              <div className="text-[10px] text-slate-400 tabular-nums">
                صافي: {profit} ج.م / ق
              </div>
            </div>

            {/* Stock Units */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                <span>الكمية بالمخزن</span>
                <Package className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums">
                {stock}
              </div>
              <div className="text-[10px] text-slate-400">
                {stock >= 10 ? "مستوى آمن" : "يتطلب إعادة طلب"}
              </div>
            </div>

            {/* Reorder Threshold */}
            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                <span>حد إعادة الطلب</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums">
                10 ق
              </div>
              <div className="text-[10px] text-slate-400">
                مستوى أمان المخزون
              </div>
            </div>
          </div>

          {/* Active Action / Draft Proposal Card */}
          {activeDraft && (
            <div className="p-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-indigo-600 text-white">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-100">
                    {activeDraft.title || "مسودة توصية من وكيل المخزون"}
                  </h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 font-bold">
                  بانتظار الاعتماد
                </span>
              </div>

              {activeDraft.reason && (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60">
                  {activeDraft.reason}
                </p>
              )}

              {/* Value Comparison */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block mb-0.5">القيمة الحالية</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                    {activeDraft.currentValue !== undefined ? activeDraft.currentValue : price}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mb-0.5 font-bold">
                    القيمة المقترحة
                  </span>
                  <span className="text-sm font-black text-emerald-800 dark:text-emerald-200 tabular-nums">
                    {activeDraft.proposedValue}
                  </span>
                </div>
              </div>

              {/* Success / Error Banners */}
              {actionSuccessMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{actionSuccessMessage}</span>
                </div>
              )}

              {actionErrorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{actionErrorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApplyDraft}
                  disabled={isApplying}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isApplying ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>اعتماد وتطبيق الإجراء</span>
                </button>

                {onDraftResolved && (
                  <button
                    type="button"
                    onClick={onDraftResolved}
                    disabled={isApplying}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs transition cursor-pointer"
                  >
                    تجاهل
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Strategy Assist Triggers */}
          <div className="space-y-2 pt-2">
            <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              أدوات التحليل والضبط السريع
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onRequestAction?.(
                    `افحص هامش الربح لمنتج "${selectedProduct.name}" وقارنه بالتكلفة ${cost} ج.م واقترح أفضل تسعير.`
                  )
                }
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 active:scale-[0.98] transition text-right cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    مراجعة الهامش والتسعير
                  </span>
                  <Tag className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  حساب صافي الربح واقتراح سعر بيع متوازن
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  onRequestAction?.(
                    `تحقق من حركة مبيعات ورصيد منتج "${selectedProduct.name}" (${stock} قطعة) وتوقع معدل الاستهلاك.`
                  )
                }
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 active:scale-[0.98] transition text-right cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    توقع نفاذ المخزون
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition" />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  تقدير الأيام المتبقية وحساب حد إعادة الطلب
                </p>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Package className="w-8 h-8 mb-2 opacity-40 text-indigo-500" />
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            لم يتم تحديد منتج بعد
          </h3>
          <p className="text-[11px] text-slate-500 max-w-xs">
            اختر منتجاً من الشريط العلوي أو رادار المنتجات لعرض مؤشرات الهامش والكميات والمسودات التفاعلية.
          </p>
        </div>
      )}
    </div>
  );
};
