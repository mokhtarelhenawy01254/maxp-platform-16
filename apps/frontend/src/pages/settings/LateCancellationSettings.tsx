import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/api";
import {
  ShieldAlert,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Save,
  Check,
} from "lucide-react";

interface OrderStatusOption {
  code: string;
  name: string;
  nameEn?: string;
  statusType: string;
  sortOrder?: number;
}

interface GroupedStatusOption {
  name: string;
  codes: string[];
}

interface LateCancellationState {
  lateCancellationInterceptEnabled: boolean;
  lateCancellationTargetStatuses: string[];
}

const EXCLUDED_STATUS_CODES = new Set([
  "CANCELLED",
  "PENDING_CANCELLATION",
  "TRASH",
  "DRAFT",
  "DUPLICATE_ORDER",
  "RETURNED",
  "PARTIALLY_RETURNED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "EXCHANGED",
]);

export const LateCancellationSettings: React.FC = () => {
  const [settings, setSettings] = useState<LateCancellationState>({
    lateCancellationInterceptEnabled: false,
    lateCancellationTargetStatuses: ["PROCESSING", "PREPARING", "PACKAGED"],
  });
  const [availableStatuses, setAvailableStatuses] = useState<GroupedStatusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([fetchSettings(), fetchOrderStatuses()]);
  }, []);

  const fetchOrderStatuses = async () => {
    try {
      const [orderResp, prepResp] = await Promise.all([
        apiClient.get("/order-status?statusType=order"),
        apiClient.get("/order-status?statusType=preparation"),
      ]);

      const mapStatuses = (data: any[]): OrderStatusOption[] =>
        (data || [])
          .filter((s: any) => !EXCLUDED_STATUS_CODES.has(s.code))
          .map((s: any) => ({
            code: s.code,
            name: s.name,
            nameEn: s.nameEn,
            statusType: s.statusType,
            sortOrder: s.sortOrder,
          }));

      const orderList = mapStatuses(orderResp.data?.data);
      const prepList = mapStatuses(prepResp.data?.data);

      const merged = [...orderList, ...prepList].sort(
        (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
      );

      const groupedMap = new Map<string, GroupedStatusOption>();
      merged.forEach((s) => {
        if (!groupedMap.has(s.name)) {
          groupedMap.set(s.name, { name: s.name, codes: [s.code] });
        } else {
          const group = groupedMap.get(s.name)!;
          if (!group.codes.includes(s.code)) {
            group.codes.push(s.code);
          }
        }
      });

      setAvailableStatuses(Array.from(groupedMap.values()));
    } catch (error) {
      console.error("Error fetching order statuses:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/settings/cancellation");
      if (response.data.success) {
        const data = response.data.data;
        setSettings({
          lateCancellationInterceptEnabled:
            data?.lateCancellationInterceptEnabled ?? false,
          lateCancellationTargetStatuses:
            data?.lateCancellationTargetStatuses ?? [
              "PROCESSING",
              "PREPARING",
              "PACKAGED",
            ],
        });
      }
    } catch (error) {
      console.error("Error fetching late cancellation settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiClient.put("/settings/cancellation", {
        lateCancellationInterceptEnabled: settings.lateCancellationInterceptEnabled,
        lateCancellationTargetStatuses: settings.lateCancellationTargetStatuses,
      });
      if (response.data.success) {
        tToast.success("LateCancellationSettings.success_save_767c");
        void fetchSettings();
      }
    } catch (error) {
      console.error("Error saving late cancellation settings:", error);
      toast.error("فشل حفظ إعدادات اعتراض الإلغاء");
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (codes: string[]) => {
    setSettings((prev) => {
      const isCurrentlySelected = codes.some((code) =>
        prev.lateCancellationTargetStatuses.includes(code)
      );

      let newStatuses = [...prev.lateCancellationTargetStatuses];
      if (isCurrentlySelected) {
        newStatuses = newStatuses.filter((code) => !codes.includes(code));
      } else {
        newStatuses = [...newStatuses, ...codes];
      }

      newStatuses = Array.from(new Set(newStatuses));

      return {
        ...prev,
        lateCancellationTargetStatuses: newStatuses,
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <RotateCw className="w-5 h-5 animate-spin" />
        <span className="mr-2 text-xs font-medium">جاري تحميل إعدادات الإلغاء المتأخر...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              إعدادات الطلبات
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">اعتراض الإلغاء المتأخر</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            نظام اعتراض الإلغاء المتأخر (Late Cancellation Intercept)
          </h2>
          <p className="text-xs text-muted-foreground">
            إيقاف خروج الطلبات قيد التجهيز أو التغليف في المخزن عند طلب الإلغاء وتحويلها لحالة فحص فوري
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => { void fetchSettings(); void fetchOrderStatuses(); }}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>تحديث</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {saving ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>حالة الاعتراض الآلي</span>
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">
              {settings.lateCancellationInterceptEnabled ? "مفعل ومحمى" : "معطل"}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded font-mono ${
              settings.lateCancellationInterceptEnabled
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}>
              {settings.lateCancellationInterceptEnabled ? "Online" : "Off"}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>الحالات المستهدفة</span>
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {settings.lateCancellationTargetStatuses.length}
            </span>
            <span className="text-[11px] text-muted-foreground">حالات خاضعة للاعتراض</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>حظر ماسح الشحن (AWB Scanner)</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">
              {settings.lateCancellationInterceptEnabled ? "حظر فوري" : "غير نشط"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Anti-Dispatch</span>
          </div>
        </div>
      </div>

      {/* Main Single-Surface Panel */}
      <div className="bg-card border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60">
        {/* Toggle Intercept */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-muted/15">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <label
                htmlFor="late-cancellation-toggle"
                className="text-sm font-semibold text-foreground cursor-pointer"
              >
                تفعيل نظام اعتراض الإلغاء المتأخر
              </label>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-rose-500/10 text-rose-700 dark:text-rose-300">
                Intercept Gateway
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pr-8">
              عند طلب العميل أو المشرف إلغاء طلب وصل لمرحلة التجهيز أو التغليف، يتم نقله تلقائياً إلى حالة{" "}
              <span className="font-semibold text-foreground underline decoration-rose-500/40">
                «إلغاء قيد التنفيذ»
              </span>{" "}
              بدلاً من إلغائه نهائياً، لتفادي خروج الشحنة مع المندوب قبل استردادها من المخزن.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              id="late-cancellation-toggle"
              checked={settings.lateCancellationInterceptEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  lateCancellationInterceptEnabled: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-10 h-5.5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Target Statuses Selection */}
        <div className={`p-4 sm:p-5 space-y-3 transition-opacity ${
          !settings.lateCancellationInterceptEnabled ? "opacity-50 pointer-events-none" : ""
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <h3 className="text-xs font-semibold text-foreground">الحالات الخاضعة لبروتوكول الاعتراض</h3>
              <p className="text-[11px] text-muted-foreground">
                اختر الحالات التشغيلية التي يتم حظر الإلغاء المباشر عندها وتحويلها لفحص المخزن أولاً
              </p>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
              {settings.lateCancellationTargetStatuses.length} محددة
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
            {availableStatuses.length === 0 ? (
              <div className="col-span-full py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                لم يتم العثور على حالات نشطة بالسيستم
              </div>
            ) : (
              availableStatuses.map((s) => {
                const isSelected = s.codes.some((code) =>
                  settings.lateCancellationTargetStatuses.includes(code)
                );
                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => toggleGroup(s.codes)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all active:scale-[0.98] ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs"
                        : "border-border/70 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {settings.lateCancellationTargetStatuses.length === 0 && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>تحذير: لم تحدد أي حالة مستهدفة — لن يتم اعتراض أي طلب حتى تختار حالة تشغيلية واحدة على الأقل.</span>
            </div>
          )}
        </div>

        {/* Operating workflow guidance */}
        <div className="p-4 bg-muted/20 flex items-start gap-2.5 text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">مسار عمل اعتراض الشحنات في المخزن:</p>
            <p className="leading-relaxed">
              عند تحويل الطلب إلى «إلغاء قيد التنفيذ»، يتم عزله فوراً من قوائم الشحن، كما يرفض ماسح الباركود (Barcode Scanner) إتمام بوليصة الشحن. بمجرد قيام أمين المخزن باسترجاع الأصناف وإعادتها للرف، يكتمل الإلغاء نهائياً ويتحول إلى «ملغي».
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LateCancellationSettings;
