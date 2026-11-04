import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Info,
} from "lucide-react";
import { apiClient } from "../../../services/api";
import { toast } from "sonner";

export interface ConvertSummary {
  total: number;
  readyToConvert: number;
  activeReady: number;
  lostReady: number;
  noPhoneCount: number;
  lostAfterHours: number;
}

export interface ConversionResult {
  totalEligible: number;
  convertedCount: number;
  skippedDuplicatesCount: number;
  failedCount: number;
  orders: Array<{
    cartId: string;
    orderNumber: string;
    orderId: string;
    total: number;
    customerName: string;
    customerPhone: string;
  }>;
  skipped: Array<{
    cartId: string;
    message: string;
    existingOrder?: {
      orderNumber: string;
      status: string;
    };
  }>;
  errors: Array<{
    cartId: string;
    message: string;
  }>;
}

interface ConvertIncompleteOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ConvertSummary | null;
  onConversionSuccess: () => void;
}

export const ConvertIncompleteOrdersModal: React.FC<ConvertIncompleteOrdersModalProps> = ({
  isOpen,
  onClose,
  summary,
  onConversionSuccess,
}) => {
  const [scope, setScope] = useState<"all" | "active" | "lost">("all");
  const [force, setForce] = useState<boolean>(false);
  const [converting, setConverting] = useState<boolean>(false);
  const [result, setResult] = useState<ConversionResult | null>(null);

  if (!isOpen) return null;

  const getTargetCount = () => {
    if (!summary) return 0;
    if (scope === "active") return summary.activeReady;
    if (scope === "lost") return summary.lostReady;
    return summary.readyToConvert;
  };

  const handleStartConversion = async () => {
    try {
      setConverting(true);
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data: ConversionResult;
      }>("/orders-new/incomplete/bulk-convert", {
        scope,
        force,
      });

      if (res.data?.success && res.data?.data) {
        setResult(res.data.data);
        onConversionSuccess();
        if (res.data.data.convertedCount > 0) {
          toast.success(`تم تحويل ${res.data.data.convertedCount} طلب بنجاح إلى قيد الانتظار`);
        } else if (res.data.data.skippedDuplicatesCount > 0) {
          toast.warning("تم تخطي الطلبات لوجود طلبات سابقة لنفس العملاء. يمكنك تفعيل فرض التحويل.");
        } else {
          toast.info(res.data.message || "اكتمل التحويل");
        }
      } else {
        toast.error(res.data?.message || "حدث خطأ أثناء تحويل الطلبات");
      }
    } catch (err: any) {
      console.error("Conversion error:", err);
      const errorMsg =
        err.response?.data?.message || err.message || "فشل تحويل الطلبات غير المكتملة";
      toast.error(errorMsg);
    } finally {
      setConverting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
  };

  const targetCount = getTargetCount();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-xl text-foreground space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                تحويل الطلبات غير المكتملة إلى «قيد الانتظار»
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                تسميع وتحويل السلال المتروكة المؤهلة إلى طلبات رسمية بالجدول الرئيسي
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={converting}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        {!result ? (
          <div className="space-y-4 text-xs">
            {/* Context Box */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-muted-foreground font-mono">
                <span>إجمالي السلال المتاحة للتحويل (مع هاتف):</span>
                <strong className="text-foreground text-sm font-bold tabular-nums">
                  {summary?.readyToConvert ?? 0}
                </strong>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono tabular-nums border-t border-border/40 pt-2">
                <span>نشطة: <strong className="text-foreground">{summary?.activeReady ?? 0}</strong></span>
                <span>•</span>
                <span>مفقودة: <strong className="text-foreground">{summary?.lostReady ?? 0}</strong></span>
                {(summary?.noPhoneCount ?? 0) > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-500">بدون هاتف (مستبعدة): {summary?.noPhoneCount ?? 0}</span>
                  </>
                )}
              </div>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="block font-semibold text-foreground text-xs">
                نطاق الطلبات المراد تحويلها:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                    scope === "all"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs"
                      : "border-border/70 bg-background hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <span className="text-xs">كافة السلال</span>
                  <span className="text-[11px] font-mono tabular-nums mt-0.5 opacity-80">
                    ({summary?.readyToConvert ?? 0})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope("active")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                    scope === "active"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs"
                      : "border-border/70 bg-background hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <span className="text-xs">النشطة فقط</span>
                  <span className="text-[11px] font-mono tabular-nums mt-0.5 opacity-80">
                    ({summary?.activeReady ?? 0})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope("lost")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                    scope === "lost"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs"
                      : "border-border/70 bg-background hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <span className="text-xs">المفقودة فقط</span>
                  <span className="text-[11px] font-mono tabular-nums mt-0.5 opacity-80">
                    ({summary?.lostReady ?? 0})
                  </span>
                </button>
              </div>
            </div>

            {/* Force Convert Checkbox */}
            <div className="rounded-xl border border-border/70 bg-muted/15 p-3.5 space-y-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="mt-0.5 rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-semibold text-foreground">
                    تخطي فحص الطلبات المسجلة خلال آخر 48 ساعة (فرض التحويل)
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    الوضع الطبيعي يستبعد التحويل إذا كان لنفس رقم الهاتف طلب قائم بالفعل لمنع الازدواجية والتكرار. تفعيل هذا الخيار يحول كافة السلال المختارة.
                  </p>
                </div>
              </label>
            </div>

            {/* Explanation Warning */}
            <div className="flex items-start gap-2 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 text-[11px]">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                عند التأكيد، ستتحول هذه السلال تلقائياً إلى طلبات برقم طلب رسمي وبحالة «قيد الانتظار» PENDING، وتُحذف السلال من تابة غير المكتملة وتظهر في تابة قيد الانتظار.
              </span>
            </div>
          </div>
        ) : (
          /* Result View */
          <div className="space-y-4 text-xs">
            {result.convertedCount > 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 text-center">
                <div className="flex justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-10 w-10 animate-in zoom-in-75 duration-200" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  تم تحويل {result.convertedCount} طلب بنجاح إلى حالة «قيد الانتظار»!
                </h3>
                <p className="text-xs text-muted-foreground">
                  تم إنشاء الطلبات وحذف السلال المحولة من غير المكتملة، وأصبحت متاحة فوراً بجدول الطلبات الرئيسي تحت تابة «قيد الانتظار».
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-center">
                <div className="flex justify-center text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-10 w-10" />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  لم يتم تحويل أي طلبات جديدة
                </h3>
              </div>
            )}

            {/* Skipped Details */}
            {result.skippedDuplicatesCount > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span>تم تخطي {result.skippedDuplicatesCount} سلة لوجود طلبات سابقة خلال 48 ساعة</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  تم حماية متجرك من تكرار الأوردرات والشحن المزدوج لهؤلاء العملاء. لتحويلهم، يمكنك إعادة المحاولة مع تفعيل خيار «فرض التحويل».
                </p>
              </div>
            )}

            {/* Error Details */}
            {result.failedCount > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 space-y-1 text-destructive">
                <div className="font-semibold">
                  فشل تحويل {result.failedCount} سلة بسبب أخطاء في البيانات.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="border-t border-border/60 pt-3.5 flex items-center justify-between gap-2">
          {!result ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={converting}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleStartConversion}
                disabled={converting || targetCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
              >
                {converting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري التحويل ({targetCount})...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    <span>تأكيد وتحويل ({targetCount}) طلب</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {result.skippedDuplicatesCount > 0 && !force ? (
                <button
                  type="button"
                  onClick={() => {
                    handleReset();
                    setForce(true);
                  }}
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3.5 py-1.5 text-xs font-medium hover:bg-amber-500/20 transition-all cursor-pointer"
                >
                  إعادة المحاولة مع فرض التحويل
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              )}

              <Link
                to="/orders?status=pending"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <span>الانتقال لتابة قيد الانتظار</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConvertIncompleteOrdersModal;
