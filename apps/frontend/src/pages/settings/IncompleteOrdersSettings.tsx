import React, { useEffect, useState } from "react";
import { apiClient } from "../../services/api";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  Layers,
} from "lucide-react";

const MIN_HOURS = 1;
const MAX_HOURS = 720;

export default function IncompleteOrdersSettings() {
  const [hours, setHours] = useState<number>(24);
  const [showIncompleteInOrders, setShowIncompleteInOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/order-settings");
      if (response.data?.success) {
        const value = parseInt(
          response.data.data?.incompleteOrderLostAfterHours,
          10
        );
        if (!Number.isNaN(value) && value >= MIN_HOURS && value <= MAX_HOURS) {
          setHours(value);
        } else {
          setHours(24);
        }
        setShowIncompleteInOrders(
          Boolean(response.data.data?.showIncompleteCartsInOrders)
        );
      }
    } catch (error) {
      console.error("Error fetching incomplete order settings:", error);
      tToast.error("IncompleteOrdersSettings.error_fetch_53e5");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (hours < MIN_HOURS || hours > MAX_HOURS) {
      toast.error(`المدة يجب أن تكون بين ${MIN_HOURS} و ${MAX_HOURS} ساعة`);
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.put("/order-settings", {
        incompleteOrderLostAfterHours: hours,
        showIncompleteCartsInOrders: showIncompleteInOrders,
      });

      if (response.data?.success) {
        tToast.success("IncompleteOrdersSettings.success_save_8fed");
        fetchSettings();
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
      <div className="flex items-center justify-center p-8 text-muted-foreground font-mono text-xs">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        جاري تحميل إعدادات الطلبات غير المكتملة...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-foreground font-sans rtl" dir="rtl">
      {/* Telemetry Ribbon */}
      <div className="border border-border/70 bg-muted/20 px-4 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            نظام استعادة السلال المتروكة
          </span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground font-mono">
            TIMEOUT: {hours}H
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground">
          <span>
            عرض السلال بقائمة الطلبات:{" "}
            <strong className="text-foreground">
              {showIncompleteInOrders ? "مفعل" : "معطل"}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Single Surface Panel */}
      <div className="rounded-lg border border-border/70 bg-card p-5 space-y-5">
        <div className="flex items-center gap-3 border-b border-border/70 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted/40 border border-border/70">
            <Clock className="h-4 w-4 text-primary" />
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

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              مهلة اعتبار الطلب مفقوداً (بالساعات)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={MIN_HOURS}
                max={MAX_HOURS}
                value={hours}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setHours(Number.isNaN(value) ? MIN_HOURS : value);
                }}
                className="w-full max-w-xs rounded-md border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground font-mono tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground font-mono">ساعة</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              يتم احتساب المدة من توقيت آخر إدخال لبيانات العميل داخل نموذج الشيك آوت
            </p>

            <div className="mt-3 p-3 rounded-md border border-border/70 bg-muted/10 text-xs text-muted-foreground font-mono">
              معيار الفرز: أي سلة لم يتم تأكيدها خلال <strong className="text-foreground font-bold">{hours} ساعة</strong> تُصنف تلقائياً كـ "طلب مفقود" للمتابعة.
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between gap-4 rounded-md border border-border/70 bg-muted/10 p-3.5">
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
        </div>

        <div className="border-t border-border/70 pt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                حفظ الإعدادات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
