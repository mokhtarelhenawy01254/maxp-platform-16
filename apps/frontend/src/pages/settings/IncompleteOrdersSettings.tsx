import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/api";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  Clock,
  Save,
  Loader2,
  ShoppingBag,
  RotateCw,
  Zap,
} from "lucide-react";
import ConvertIncompleteOrdersModal, {
  ConvertSummary,
} from "./components/ConvertIncompleteOrdersModal";

interface OrderSettingsApiResponse {
  success: boolean;
  data?: {
    incompleteOrderLostAfterHours?: string | number;
    showIncompleteCartsInOrders?: boolean;
    autoConvertIncompleteToPending?: boolean;
    [key: string]: any;
  };
}

interface ConvertSummaryApiResponse {
  success: boolean;
  data?: ConvertSummary;
}

const MIN_HOURS = 1;
const MAX_HOURS = 720;

export default function IncompleteOrdersSettings() {
  const [hours, setHours] = useState<number>(24);
  const [showIncompleteInOrders, setShowIncompleteInOrders] = useState(false);
  const [autoConvertIncomplete, setAutoConvertIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // حالة تحويل الطلبات غير المكتملة إلى قيد الانتظار
  const [summary, setSummary] = useState<ConvertSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchSummary();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<OrderSettingsApiResponse>("/order-settings");
      if (response.data?.success && response.data?.data) {
        const value = parseInt(
          String(response.data.data.incompleteOrderLostAfterHours),
          10
        );
        if (!Number.isNaN(value) && value >= MIN_HOURS && value <= MAX_HOURS) {
          setHours(value);
        } else {
          setHours(24);
        }
        setShowIncompleteInOrders(
          Boolean(response.data.data.showIncompleteCartsInOrders)
        );
        setAutoConvertIncomplete(
          Boolean(response.data.data.autoConvertIncompleteToPending)
        );
      }
    } catch (error) {
      console.error("Error fetching incomplete order settings:", error);
      tToast.error("IncompleteOrdersSettings.error_fetch_53e5");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const response = await apiClient.get<ConvertSummaryApiResponse>(
        "/orders-new/incomplete/convert-summary"
      );
      if (response.data?.success && response.data?.data) {
        setSummary(response.data.data);
      }
    } catch (error) {
      console.warn("Error fetching incomplete orders summary:", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSave = async () => {
    if (hours < MIN_HOURS || hours > MAX_HOURS) {
      toast.error(`المدة يجب أن تكون بين ${MIN_HOURS} و ${MAX_HOURS} ساعة`);
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.put<OrderSettingsApiResponse>("/order-settings", {
        incompleteOrderLostAfterHours: hours,
        showIncompleteCartsInOrders: showIncompleteInOrders,
        autoConvertIncompleteToPending: autoConvertIncomplete,
      });

      if (response.data?.success) {
        toast.success("تم حفظ إعدادات الطلبات غير المكتملة بنجاح");
        if (autoConvertIncomplete) {
          toast.info("تم تفعيل التحويل التلقائي: يتم فحص ونقل السلال غير المكتملة مباشرة إلى تابة قيد الانتظار");
        }
        fetchSettings();
        fetchSummary();
      }
    } catch (error) {
      console.error("Error saving incomplete order settings:", error);
      tToast.error("IncompleteOrdersSettings.error_save_bccf");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground font-mono text-xs gap-2 select-none" dir="rtl">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>جاري تحميل إعدادات الطلبات غير المكتملة...</span>
      </div>
    );
  }

  const totalIncompleteCount = summary?.total ?? 0;
  const activeCount = summary?.active ?? summary?.activeReady ?? 0;
  const lostCount = summary?.lost ?? summary?.lostReady ?? 0;
  const readyToConvertCount = summary?.readyToConvert ?? 0;

  return (
    <div className="space-y-4 text-foreground select-none" dir="rtl">
      {/* Telemetry Ribbon */}
      <div className="border border-border/70 bg-muted/20 px-4 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            نظام استعادة السلال المتروكة
          </span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground font-mono text-[11px]">
            TIMEOUT: {hours}H
          </span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
            إجمالي غير المكتملة: <strong className="text-foreground">{totalIncompleteCount.toLocaleString()}</strong>
          </span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
            جاهز برقم هاتف: <strong className="text-emerald-500">{readyToConvertCount.toLocaleString()}</strong>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-muted-foreground text-xs">
          <span>
            عرض السلال بالطلبات:{" "}
            <strong className="text-foreground">
              {showIncompleteInOrders ? "مفعل" : "معطل"}
            </strong>
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1.5">
            التحويل التلقائي لقيد الانتظار:{" "}
            <strong className={autoConvertIncomplete ? "text-emerald-500 font-bold" : "text-muted-foreground"}>
              {autoConvertIncomplete ? "مفعل تلقائياً" : "معطل"}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Single Surface Panel */}
      <div className="rounded-xl border border-border/70 bg-card p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-3 border-b border-border/60 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              إعدادات الطلبات غير المكتملة والسلال المتروكة
            </h2>
            <p className="text-xs text-muted-foreground">
              تحديد الفترة الزمنية التي يتم بعدها اعتبار السلة المتروكة طلباً مفقوداً للبدء في إجراءات الاستعادة
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              مهلة اعتبار الطلب مفقوداً (بالساعات)
            </label>
            <div className="flex items-center gap-2.5 max-w-xs">
              <input
                type="number"
                min={MIN_HOURS}
                max={MAX_HOURS}
                value={hours}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setHours(Number.isNaN(value) ? MIN_HOURS : value);
                }}
                className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground font-mono tabular-nums focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground font-mono shrink-0">ساعة</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              يتم احتساب المدة من توقيت آخر إدخال لبيانات العميل داخل نموذج الشيك آوت
            </p>

            <div className="mt-2.5 p-2.5 rounded-lg border border-border/60 bg-muted/15 text-xs text-muted-foreground font-mono">
              معيار الفرز: أي سلة لم يتم تأكيدها خلال <strong className="text-foreground font-bold tabular-nums">{hours} ساعة</strong> تُصنف تلقائياً كـ "طلب مفقود" للمتابعة.
            </div>
          </div>

          {/* Toggle Switch: دمج وعرض السلال في جدول الطلبات */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-muted/15 p-3.5">
            <div>
              <p className="text-xs font-semibold text-foreground">
                دمج وعرض السلال غير المكتملة في جدول الطلبات الرئيسي
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                تظهر السلال المتروكة جنباً إلى جنب مع الطلبات المكتملة لسهولة الفلترة وتعيينها لفريق خدمة العملاء
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={showIncompleteInOrders}
                onChange={() => setShowIncompleteInOrders((prev) => !prev)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-muted border border-border/80 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-muted-foreground after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:bg-primary-foreground" />
            </label>
          </div>

          {/* ⚡ تحويل الطلبات غير المكتملة إلى تابة «قيد الانتظار» مع مفتاح تفعيل/تعطيل */}
          <div className={`rounded-xl border transition-all p-4.5 space-y-4 shadow-2xs ${
            autoConvertIncomplete
              ? "border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/25 ring-1 ring-emerald-500/20"
              : "border-border/70 bg-muted/10"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                  autoConvertIncomplete
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted border-border/80 text-muted-foreground"
                }`}>
                  <Zap className={`h-5 w-5 ${autoConvertIncomplete ? "animate-pulse" : ""}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">
                      تحويل الطلبات غير المكتملة إلى تابة «قيد الانتظار»
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      autoConvertIncomplete
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-muted text-muted-foreground border-border/80"
                    }`}>
                      {autoConvertIncomplete ? "مفعل تلقائياً" : "غير مفعل"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      تسميع مباشر في تجهيز الطلبات
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">
                    عند تفعيل هذا الخيار، يتم نقل وتحويل أي سلة متروكة (متوفر بها رقم هاتف العميل) تلقائياً وبشكل دوري ومباشر إلى طلبات فعلية رسمية بحالة «قيد الانتظار» PENDING لتسمع وتظهر داخل تابة قيد الانتظار بجدول الطلبات لتجهيزها ومتابعتها بدون الحاجة للتحويل اليدوي.
                  </p>
                </div>
              </div>

              {/* زر التفعيل / التعطيل (Toggle Switch) */}
              <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                <div className="text-right sm:text-left">
                  <span className={`block text-xs font-bold font-mono ${
                    autoConvertIncomplete ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  }`}>
                    {autoConvertIncomplete ? "مفعل" : "غير مفعل"}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {autoConvertIncomplete ? "التحويل مستمر كل دقيقة" : "التحويل متوقف"}
                  </span>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={autoConvertIncomplete}
                    onChange={() => setAutoConvertIncomplete((prev) => !prev)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-muted border border-border/80 after:absolute after:left-[3px] after:top-[3px] after:h-4.5 after:w-4.5 after:rounded-full after:bg-muted-foreground after:transition-all peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:bg-white" />
                </label>
              </div>
            </div>

            {/* بانر حالة التفعيل اللحظية */}
            {autoConvertIncomplete ? (
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span>
                    <strong>نظام التحويل التلقائي نشط:</strong> السلال المتروكة التي تحتوي على رقم هاتف تتحول تلقائياً كل دقيقة إلى تابة «قيد الانتظار».
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                  مزامنة دورية PENDING ⚡
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-muted-foreground text-xs flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
                <span>
                  التحويل التلقائي معطل حالياً. قم بتفعيل المفتاح أعلاه ثم اضغط «حفظ الإعدادات» لتحويل السلال غير المكتملة تلقائياً لقيد الانتظار.
                </span>
              </div>
            )}

            {/* تفاصيل العدادات المتطابقة مع صفحة /orders/incomplete وزر التحويل اليدوي الفوري */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50 text-xs">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-muted-foreground font-mono text-[11px] tabular-nums">
                <span>إجمالي غير المكتملة: <strong className="text-foreground">{totalIncompleteCount.toLocaleString()}</strong></span>
                <span className="text-border">|</span>
                <span>نشطة: <strong className="text-foreground">{activeCount.toLocaleString()}</strong></span>
                <span className="text-border">|</span>
                <span>مفقودة: <strong className="text-foreground">{lostCount.toLocaleString()}</strong></span>
                <span className="text-border">|</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">بهاتف: <strong>{readyToConvertCount.toLocaleString()}</strong></span>
                {(summary?.noPhoneCount ?? 0) > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span
                      className="text-amber-500/90 font-medium"
                      title="سلال مسجلة بدون رقم هاتف"
                    >
                      بدون هاتف: {(summary?.noPhoneCount ?? 0).toLocaleString()}
                    </span>
                  </>
                )}
                <button
                  type="button"
                  onClick={fetchSummary}
                  disabled={summaryLoading}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="تحديث البيانات"
                >
                  <RotateCw className={`h-3 w-3 ${summaryLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowConvertModal(true)}
                disabled={summaryLoading || totalIncompleteCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 text-xs font-semibold shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
                title="تحويل يدوي دفعي فوري مع تخصيص الخيارات"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>تحويل يدوي فوري الآن ({readyToConvertCount.toLocaleString()})</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-border/60 pt-3 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>حفظ الإعدادات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* نافذة التحويل المنبثقة للتحويل اليدوي */}
      <ConvertIncompleteOrdersModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        summary={summary}
        onConversionSuccess={() => {
          fetchSummary();
        }}
      />
    </div>
  );
}
