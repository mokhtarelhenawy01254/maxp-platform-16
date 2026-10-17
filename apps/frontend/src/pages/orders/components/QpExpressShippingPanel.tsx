import React, { useState, useEffect } from "react";
import {
  Truck,
  RefreshCw,
  Copy,
  Check,
  Phone,
  User,
  MessageSquare,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useQpExpressShipping } from "../hooks/useQpExpressShipping";

interface QpExpressShippingPanelProps {
  order: any;
  setOrder: (order: any) => void;
  canManageShipments?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "طلب جديد / قيد التجهيز", color: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: AlertCircle },
  OUT_FOR_DELIVERY: { label: "خرج للتوصيل مع المندوب", color: "border-primary/20 bg-primary/10 text-primary", icon: Truck },
  DELIVERED: { label: "تم التسليم بنجاح", color: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  RETURNED: { label: "مرتجع / ملغي", color: "border-destructive/20 bg-destructive/10 text-destructive", icon: AlertCircle },
  UNKNOWN: { label: "غير محدد", color: "border-border/60 bg-muted/30 text-muted-foreground", icon: Truck },
};

export const QpExpressShippingPanel: React.FC<QpExpressShippingPanelProps> = ({
  order,
  setOrder,
  canManageShipments = true,
}) => {
  const { loading, trackingData, fetchTracking, createShipment } = useQpExpressShipping(order, setOrder);
  const [customNotes, setCustomNotes] = useState(
    order?.notes || "المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة"
  );
  const [copied, setCopied] = useState(false);

  const trackingNumber =
    trackingData?.trackingNumber ||
    order?.shippingTrackingNumber ||
    (order?.shippingCarrier === "QP_EXPRESS" ? order?.trackingNumber : null);

  useEffect(() => {
    if (trackingNumber) {
      fetchTracking();
    }
  }, [trackingNumber]);

  const copyTracking = () => {
    if (trackingNumber) {
      navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      toast.success("تم نسخ رقم البوليصة");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreate = async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية لإرسال الشحنات");
      return;
    }
    await createShipment(customNotes);
  };

  const statusInfo = trackingData?.status
    ? STATUS_CONFIG[trackingData.status] || STATUS_CONFIG.UNKNOWN
    : STATUS_CONFIG.PENDING;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              شركة كيو بي إكسبريس (QP Express)
            </h3>
            <p className="text-xs text-muted-foreground">
              الشحن المباشر والتوصيل المحلي السريع
            </p>
          </div>
        </div>

        {trackingNumber && (
          <button
            type="button"
            onClick={fetchTracking}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
            title="تحديث الحالة اللحظية"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث الحالة</span>
          </button>
        )}
      </div>

      {trackingNumber ? (
        <div className="space-y-3.5">
          {/* Status & Waybill Card */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">
                  رقم بوليصة الشحن (AWB):
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {trackingNumber}
                  </span>
                  <button
                    type="button"
                    onClick={copyTracking}
                    className="p-1 hover:bg-muted rounded text-muted-foreground transition"
                    title="نسخ رقم البوليصة"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  {copied && <span className="text-[11px] text-emerald-600 font-medium">تم النسخ!</span>}
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block mb-1">
                  الحالة اللحظية:
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold ${statusInfo.color}`}
                >
                  <statusInfo.icon className="h-3.5 w-3.5" />
                  <span>{trackingData?.statusLabel || statusInfo.label}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Delivery & Driver Details */}
          {trackingData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {trackingData.driverName && (
                <div className="flex items-center gap-2.5 p-2.5 bg-muted/20 rounded-lg border border-border/60">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <div className="truncate">
                    <span className="text-[11px] text-muted-foreground block">المندوب:</span>
                    <span className="font-semibold text-foreground">
                      {trackingData.driverName}
                    </span>
                  </div>
                </div>
              )}

              {trackingData.driverPhone && (
                <div className="flex items-center gap-2.5 p-2.5 bg-muted/20 rounded-lg border border-border/60">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-[11px] text-muted-foreground block">هاتف المندوب:</span>
                    <a
                      href={`tel:${trackingData.driverPhone}`}
                      className="font-semibold font-mono tabular-nums text-primary hover:underline"
                    >
                      {trackingData.driverPhone}
                    </a>
                  </div>
                </div>
              )}

              {trackingData.statusNote && (
                <div className="sm:col-span-2 flex items-start gap-2.5 p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 block">
                      ملاحظة المندوب الميدانية:
                    </span>
                    <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">
                      {trackingData.statusNote}
                    </p>
                  </div>
                </div>
              )}

              {trackingData.totalFees !== undefined && (
                <div className="flex items-center gap-2.5 p-2.5 bg-muted/20 rounded-lg border border-border/60">
                  <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <span className="text-[11px] text-muted-foreground block">مصاريف الشحن:</span>
                    <span className="font-bold font-mono tabular-nums text-foreground">
                      {trackingData.totalFees} ج.م
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Unshipped Order - Form to Create Shipment */
        <div className="space-y-3.5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            لم يتم إنشاء بوليصة شحن لهذا الطلب بعد لدى كيو بي إكسبريس. يمكنك إرسال الطلب مباشرة
            وتوليد البوليصة.
          </p>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              ملاحظات المعاينة والتسليم للمندوب:
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="مثال: المعاينة في وجود المندوب"
              className="w-full text-xs p-2.5 rounded-lg border border-border/70 bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-xs sm:text-sm transition shadow-xs active:scale-[0.97] disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>جاري الإرسال وتوليد البوليصة...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4 rtl:rotate-180" />
                <span>إرسال الشحنة إلى QP Express وتوليد البوليصة</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default QpExpressShippingPanel;
