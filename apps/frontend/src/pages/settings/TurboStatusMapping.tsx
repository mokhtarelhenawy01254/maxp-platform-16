import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Save,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Shuffle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";

interface StatusMapping {
  [turboStatus: string]: {
    orderStatus: string | null;
  };
}

interface OrderStatusOption {
  code: string;
  name: string;
}

const TURBO_STATUS_LIST: { key: string; labelAr: string; labelEn: string }[] = [
  { key: "turbo_saved", labelAr: "تم الحفظ (بانتظار الإرسال)", labelEn: "Saved (Pending Send)" },
  { key: "turbo_sent", labelAr: "مرسلة لتربو", labelEn: "Sent to Turbo" },
  { key: "processing", labelAr: "قيد التنفيذ بالفرع", labelEn: "Branch Processing" },
  { key: "out_for_delivery", labelAr: "مسلمة للمندوب", labelEn: "Out for Delivery" },
  { key: "delivered", labelAr: "تم التسليم", labelEn: "Delivered" },
  { key: "remitted", labelAr: "تم التوريد والتحصيل", labelEn: "Remitted" },
  { key: "returned_to_company", labelAr: "مرتجعات بالشركة", labelEn: "Returned to Company" },
  { key: "returned_received", labelAr: "مرتجعات وصلتني", labelEn: "Returned Received" },
  { key: "returned_to_customer", labelAr: "مرتجعة للعميل", labelEn: "Returned to Customer" },
  { key: "returned_resent", labelAr: "معاد إرسالها", labelEn: "Returned Resent" },
  { key: "returned_missing", labelAr: "مرتجع مفقود", labelEn: "Returned Missing" },
  { key: "returned_destroyed", labelAr: "مرتجع معدوم", labelEn: "Returned Destroyed" },
  { key: "cancelled", labelAr: "ملغي", labelEn: "Cancelled" },
  { key: "delayed", labelAr: "مؤجلة", labelEn: "Delayed" },
  { key: "incomplete", labelAr: "غير مكتملة", labelEn: "Incomplete" },
  { key: "archived", labelAr: "مؤرشفة", labelEn: "Archived" },
];

const TURBO_STATUS_GROUP_MAP: Record<string, { labelAr: string; keys: string[] }> = {
  "قيد المعالجة": {
    labelAr: "مرحلة المعالجة والفرز",
    keys: ["turbo_saved", "turbo_sent", "processing"],
  },
  "التوصيل": {
    labelAr: "مرحلة الخروج والتوصيل الميداني",
    keys: ["out_for_delivery", "delivered", "remitted", "delayed"],
  },
  "المرتجعات": {
    labelAr: "مسارات المرتجعات والتسوية",
    keys: [
      "returned_to_company",
      "returned_received",
      "returned_to_customer",
      "returned_resent",
      "returned_missing",
      "returned_destroyed",
    ],
  },
  "حالات أخرى": {
    labelAr: "حالات استثنائية وأرشيفية",
    keys: ["cancelled", "incomplete", "archived"],
  },
};

export const TurboStatusMapping: React.FC = () => {
  const { t: tVal, i18n } = useTranslation();
  const t = tVal as (key: string, options?: Record<string, unknown>) => string;
  const navigate = useNavigate();
  const isRtl = i18n.language === "ar";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapping, setMapping] = useState<StatusMapping>({});
  const [orderStatuses, setOrderStatuses] = useState<OrderStatusOption[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [mappingRes, statusesRes] = await Promise.all([
        apiClient.get("/settings/turbo-status-mapping"),
        apiClient.get("/order-status"),
      ]);

      if (mappingRes.data?.success) {
        setMapping(mappingRes.data.data.mapping || {});
      }

      if (statusesRes.data?.success && Array.isArray(statusesRes.data.data)) {
        setOrderStatuses(statusesRes.data.data);
      }
    } catch (error: unknown) {
      console.error("Error loading data:", error);
      tToast.error("TurboStatusMapping.failed_load_4efb");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMappingChange = (turboKey: string, orderStatus: string) => {
    setMapping((prev) => ({
      ...prev,
      [turboKey]: { orderStatus: orderStatus || null },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiClient.put("/settings/turbo-status-mapping", {
        mapping,
      });
      if (response.data?.success) {
        tToast.success("TurboStatusMapping.success_save_7f59");
      }
    } catch (error: unknown) {
      console.error("Error saving mapping:", error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "فشل حفظ إعدادات الربط");
    } finally {
      setSaving(false);
    }
  };

  const getStatusName = (code: string | null) => {
    if (!code) return "";
    const found = orderStatuses.find((s) => s.code === code);
    if (found?.name) return found.name;
    const statusKey = `orders.${code.toLowerCase()}`;
    const translated = t(statusKey);
    return translated !== statusKey ? translated : code;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-muted-foreground gap-2.5" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs font-medium">جاري تحميل حالات وربط شركة Turbo Express...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5 select-none" dir="rtl">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/shipping-companies"
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                ربط حالات Turbo Express بحالات النظام
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                تحديث حالات الطلبات التلقائي عند استلام إشعارات التوصيل والتحصيل عبر Webhook
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 shadow-2xs cursor-pointer active:scale-[0.98]"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saving ? "جاري الحفظ..." : "حفظ جدول الحالات"}</span>
          </button>
        </div>
      </div>

      {/* Main Mapping Card */}
      <div className="bg-card border border-border/70 rounded-xl p-5 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Shuffle className="w-4 h-4 text-primary" />
            <span>جدول تعيين الحالات (Status Mapping Matrix)</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
            Turbo Webhook Auto-Sync
          </span>
        </div>

        <div className="space-y-6">
          {Object.entries(TURBO_STATUS_GROUP_MAP).map(([groupName, group]) => (
            <div key={groupName} className="space-y-2.5">
              <h3 className="text-xs font-semibold text-foreground px-1 border-r-2 border-primary pr-2">
                {group.labelAr}
              </h3>
              <div className="space-y-1.5">
                {group.keys.map((turboKey) => {
                  const info = TURBO_STATUS_LIST.find((s) => s.key === turboKey);
                  const currentMapping = mapping[turboKey];
                  const selectedStatus = currentMapping?.orderStatus || "";

                  return (
                    <div
                      key={turboKey}
                      className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {isRtl ? info?.labelAr : info?.labelEn}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {turboKey}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline rotate-180" />
                        <select
                          value={selectedStatus}
                          onChange={(e) => handleMappingChange(turboKey, e.target.value)}
                          className="w-full sm:w-60 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                          dir={isRtl ? "rtl" : "ltr"}
                        >
                          <option value="">-- لا يوجد تغيير (تجاهل) --</option>
                          {orderStatuses
                            .filter((s) => s.code !== "TRASH")
                            .map((s) => (
                              <option key={s.code} value={s.code}>
                                {getStatusName(s.code)}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Notice Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-foreground space-y-1">
          <span className="font-semibold block">ملاحظات هامة لتشغيل المزامنة:</span>
          <p className="text-muted-foreground leading-relaxed text-[11px]">
            عند اختيار «لا يوجد تغيير»، سيتم الاحتفاظ بحالة الطلب الحالية في النظام دون تعديل عند وصول إشعار هذه الحالة من Turbo. الحالات التي تعين على «تم التسليم» تقوم تلقائياً بتحديث حالة الدفع إلى «مكتمل».
          </p>
        </div>
      </div>
    </div>
  );
};

export default TurboStatusMapping;