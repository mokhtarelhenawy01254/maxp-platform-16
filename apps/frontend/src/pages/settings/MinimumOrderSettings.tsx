import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import { apiClient } from "../../services/api";

interface MinimumOrderSettingsData {
  minimumOrderEnabled: boolean;
  minimumOrderAmount: number;
  minimumOrderMessage: string;
}

interface OrderSettingsResponse {
  success: boolean;
  data: MinimumOrderSettingsData;
  message?: string;
}

const DEFAULT_MINIMUM_ORDER_MESSAGE =
  "الحد الأدنى للطلبات هو {amount} جنيه. أضف منتجات بقيمة {remaining} جنيه لإتمام الطلب.";

function formatAmount(amount: number) {
  const value = Number(amount || 0);
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

export default function MinimumOrderSettings() {
  const [settings, setSettings] = useState<MinimumOrderSettingsData>({
    minimumOrderEnabled: false,
    minimumOrderAmount: 0,
    minimumOrderMessage: DEFAULT_MINIMUM_ORDER_MESSAGE,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSettings();
  }, []);

  const previewMessage = useMemo(() => {
    const amount = Number(settings.minimumOrderAmount || 0);
    const sampleCartTotal = amount > 0 ? amount * 0.6 : 0;
    const remaining = Math.max(0, amount - sampleCartTotal);

    return (settings.minimumOrderMessage || DEFAULT_MINIMUM_ORDER_MESSAGE)
      .replace(/\{amount\}/g, formatAmount(amount))
      .replace(/\{remaining\}/g, formatAmount(remaining));
  }, [settings.minimumOrderAmount, settings.minimumOrderMessage]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response =
        await apiClient.get<OrderSettingsResponse>("/order-settings");

      if (response.data.success) {
        const data = response.data.data;
        setSettings({
          minimumOrderEnabled: Boolean(data.minimumOrderEnabled),
          minimumOrderAmount: Number(data.minimumOrderAmount || 0),
          minimumOrderMessage:
            data.minimumOrderMessage || DEFAULT_MINIMUM_ORDER_MESSAGE,
        });
      }
    } catch (error) {
      console.error("Error fetching minimum order settings:", error);
      tToast.error("MinimumOrderSettings.failed_fetch_084b");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const amount = Number(settings.minimumOrderAmount || 0);

    if (settings.minimumOrderEnabled && amount <= 0) {
      tToast.error("MinimumOrderSettings.msg_6377");
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.put<
        OrderSettingsResponse,
        MinimumOrderSettingsData
      >("/order-settings", {
        minimumOrderEnabled: settings.minimumOrderEnabled,
        minimumOrderAmount: amount,
        minimumOrderMessage:
          settings.minimumOrderMessage.trim() || DEFAULT_MINIMUM_ORDER_MESSAGE,
      });

      if (response.data.success) {
        const data = response.data.data;
        setSettings({
          minimumOrderEnabled: Boolean(data.minimumOrderEnabled),
          minimumOrderAmount: Number(data.minimumOrderAmount || 0),
          minimumOrderMessage:
            data.minimumOrderMessage || DEFAULT_MINIMUM_ORDER_MESSAGE,
        });
        tToast.success("MinimumOrderSettings.success_save_d446");
      }
    } catch (error) {
      console.error("Error saving minimum order settings:", error);
      tToast.error("MinimumOrderSettings.failed_save_d041");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground font-mono text-xs gap-2 select-none" dir="rtl">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>جاري تحميل سياسة الحد الأدنى...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-foreground select-none" dir="rtl">
      {/* Telemetry Ribbon */}
      <div className="border border-border/70 bg-muted/20 px-4 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                settings.minimumOrderEnabled
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-muted-foreground"
              }`}
            />
            سياسة الحد الأدنى: {settings.minimumOrderEnabled ? "مفعلة وتفرض على السلة" : "معطلة"}
          </span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground font-mono text-[11px]">
            RULE: checkout.minimum_threshold
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground text-xs">
          <span>
            القيمة المعتمدة:{" "}
            <strong className="text-foreground">
              {formatAmount(settings.minimumOrderAmount)} ج.م
            </strong>
          </span>
        </div>
      </div>

      {/* Main Single Surface Panel */}
      <div className="rounded-xl border border-border/70 bg-card p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-3 border-b border-border/60 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              الحد الأدنى لقيمة الطلبات
            </h2>
            <p className="text-xs text-muted-foreground">
              تحديد أقل قيمة لمنتجات السلة قبل السماح للعميل بإتمام عملية الدفع والشراء
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          {/* Enable Toggle Bar */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-muted/15 p-3.5">
            <div>
              <label
                htmlFor="minimumOrderEnabled"
                className="text-xs font-semibold text-foreground cursor-pointer"
              >
                تفعيل فرض الحد الأدنى في المتجر
              </label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                عند التفعيل، سيتم حظر إتمام الشراء لأي سلة قيمتها أقل من المبلغ المحدد
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                id="minimumOrderEnabled"
                type="checkbox"
                checked={settings.minimumOrderEnabled}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    minimumOrderEnabled: event.target.checked,
                  })
                }
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-muted border border-border/80 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-muted-foreground after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:bg-primary-foreground" />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                قيمة الحد الأدنى (ج.م) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.minimumOrderAmount}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      minimumOrderAmount: Number(event.target.value),
                    })
                  }
                  disabled={!settings.minimumOrderEnabled}
                  className="w-full rounded-lg border border-border/80 bg-background px-3 py-1.5 pl-14 text-xs text-foreground font-mono tabular-nums focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                  ج.م
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/15 p-3 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                حالة التطبيق الحالية
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                {settings.minimumOrderEnabled
                  ? `مفعل إجبارياً للطلبات الأقل من ${formatAmount(settings.minimumOrderAmount)} ج.م`
                  : "معطل — يسمح بإتمام الطلب بأي قيمة"}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              نص التنبيه المعروض للعميل في السلة
            </label>
            <textarea
              value={settings.minimumOrderMessage}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  minimumOrderMessage: event.target.value,
                })
              }
              disabled={!settings.minimumOrderEnabled}
              rows={3}
              className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50 leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-muted-foreground font-mono">
              المتغيرات المدعومة: {"{amount}"} لقيمة الحد الأدنى، {"{remaining}"} للمبلغ المتبقي
            </p>
          </div>

          {settings.minimumOrderEnabled && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="space-y-0.5">
                <p className="font-semibold text-amber-500">
                  معاينة حية لرسالة السلة
                </p>
                <p className="text-foreground/90 text-xs">
                  {previewMessage}
                </p>
              </div>
            </div>
          )}
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
                <span>حفظ السياسة</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
