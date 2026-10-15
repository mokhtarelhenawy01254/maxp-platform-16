import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  MapPin,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Sliders,
  RotateCcw,
  Check,
  Bot,
} from "lucide-react";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";
import { tToast } from "../../utils/i18n-toast";

export interface CheckoutAddressSettings {
  mode?: "hybrid" | "ai_parse" | "dropdown";
  aiEnabled?: boolean;
  model?: string;
  confidenceThreshold?: number;
  showConfirmationToCustomer?: boolean;
  cacheResults?: boolean;
  logRawAddress?: boolean;
  merchantCombobox?: boolean;
}

const DEFAULT_SETTINGS: CheckoutAddressSettings = {
  mode: "hybrid",
  aiEnabled: true,
  model: "gemini-2.5-flash",
  confidenceThreshold: 0.7,
  showConfirmationToCustomer: true,
  cacheResults: true,
  logRawAddress: true,
  merchantCombobox: true,
};

const parseSettings = (raw: unknown): CheckoutAddressSettings => {
  if (raw && typeof raw === "object") {
    return { ...DEFAULT_SETTINGS, ...(raw as Record<string, unknown>) };
  }
  return { ...DEFAULT_SETTINGS };
};

/**
 * إعدادات إدخال العنوان في الشيك أوت (المحافظة + المنطقة).
 * تتحكم في طريقة التعرف على المنطقة: نص حر + AI يقترح، أو قوائم منسدلة.
 */
const CheckoutAddressSettingsSection: React.FC<{
  settings: { checkoutAddressSettings?: unknown };
  onChange: (settings: { checkoutAddressSettings?: CheckoutAddressSettings }) => void;
}> = ({ settings, onChange }) => {
  const [form, setForm] = useState<CheckoutAddressSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setForm(parseSettings(settings.checkoutAddressSettings));
    setLoaded(true);
  }, [settings.checkoutAddressSettings]);

  const update = useCallback(
    (patch: Partial<CheckoutAddressSettings>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await storefrontSettingsService.updateSettings({
        checkoutAddressSettings: form,
      });
      if (result?.data) {
        onChange({ checkoutAddressSettings: form });
      }
      tToast.success("StoreSettings.success_save_ccce");
    } catch (error) {
      console.error("[CheckoutAddressSettings] Save failed:", error);
      toast.error(
        "حدث خطأ أثناء الحفظ: " +
          ((error as { message?: string })?.message || "Unknown error")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({ ...DEFAULT_SETTINGS });
    void (async () => {
      try {
        const result = await storefrontSettingsService.updateSettings({
          checkoutAddressSettings: { ...DEFAULT_SETTINGS },
        });
        if (result?.data) {
          onChange({ checkoutAddressSettings: { ...DEFAULT_SETTINGS } });
        }
        tToast.success("StoreSettings.msg_126b");
      } catch (error) {
        toast.error(
          "حدث خطأ أثناء الاستعادة: " +
            ((error as { message?: string })?.message || "")
        );
      }
    })();
  };

  if (!loaded) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm animate-pulse space-y-3 font-sans">
        <div className="h-4 w-48 bg-muted rounded-md" />
        <div className="h-8 w-full bg-muted/50 rounded-xl" />
      </div>
    );
  }

  const selectClassName =
    "w-full px-3.5 py-2.5 bg-card border border-border/70 text-foreground text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 shadow-xs";

  const toggleRow = (
    key: keyof CheckoutAddressSettings,
    label: string,
    desc: string,
    disabled = false
  ) => (
    <label
      className={`flex items-start justify-between gap-4 py-3 border-b border-border/50 last:border-0 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <div className="space-y-0.5">
        <span className="block text-xs sm:text-sm font-semibold text-foreground">
          {label}
        </span>
        <span className="block text-[11px] text-muted-foreground">
          {desc}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(form[key])}
        disabled={disabled}
        onClick={() => update({ [key]: !form[key] } as Partial<CheckoutAddressSettings>)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer select-none ${
          form[key] ? "bg-primary" : "bg-muted border border-border/70"
        } ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
            form[key] ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 font-sans text-xs">
      {/* Section Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary mt-0.5 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              إعدادات العنوان الذكي في الشيك أوت (المحافظة والمنطقة)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              طريقة إدخال عنوان العميل في صفحة الشيك أوت والتعرف التلقائي على منطقته على خريطة شركة الشحن
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            طريقة إدخال العنوان في صفحة الدفع
          </label>
          <select
            value={form.mode}
            onChange={(e) =>
              update({
                mode: e.target.value as CheckoutAddressSettings["mode"],
              })
            }
            className={selectClassName}
          >
            <option value="hybrid">Hybrid — نص حر + AI يقترح ويطابق الخريطة (مُوصى به)</option>
            <option value="ai_parse">AI كامل بدون تأكيد العميل</option>
            <option value="dropdown">قوائم منسدلة تقليدية (المحافظة ثم المنطقة)</option>
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Hybrid: العميل يكتب العنوان كما هو، والذكاء الاصطناعي يحدد المحافظة والمنطقة تلقائياً ويعرضها للتأكيد السريع. Dropdown: القوائم التقليدية فقط.
          </p>
        </div>

        {/* Feature Toggles Box */}
        <div className="rounded-xl border border-border/70 bg-muted/20 px-4 divide-y divide-border/50">
          {toggleRow(
            "aiEnabled",
            "تفعيل الذكاء الاصطناعي للتعرف على العنوان",
            "استخدام AI لتحديد المحافظة والمنطقة من العنوان المكتوب تلقائياً"
          )}
          {toggleRow(
            "showConfirmationToCustomer",
            "إظهار النتيجة للعميل للتأكيد",
            "عرض المحافظة والمنطقة المتعرف عليها ليعتمدها العميل بنقرة واحدة",
            !form.aiEnabled
          )}
          {toggleRow(
            "merchantCombobox",
            "بحث ذكي في لوحة التحكم",
            "تفعيل البحث النصي عن المحافظة والمنطقة في إنشاء الطلب اليدوي"
          )}
          {toggleRow(
            "cacheResults",
            "تخزين نتائج التعرف مؤقتاً (Cache)",
            "إعادة استخدام نتائج نفس العنوان بدلاً من استدعاء الذكاء الاصطناعي كل مرة",
            !form.aiEnabled
          )}
          {toggleRow(
            "logRawAddress",
            "تسجيل العنوان الخام في الطلب",
            "حفظ نص العنوان كما كتبه العميل في سجل التحليل للمراجعة والتدقيق"
          )}
        </div>

        {/* AI Model Parameters */}
        {form.aiEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-muted/10 border border-border/60 rounded-xl p-3.5">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-primary" />
                <span>النموذج المستخدم للتعرف</span>
              </label>
              <select
                value={form.model}
                onChange={(e) => update({ model: e.target.value })}
                className={selectClassName}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (استجابة فائقة السرعة)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (دقة مطابقة قصوى)</option>
                <option value="deepseek-flash">DeepSeek V4.1 Flash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  <span>نسبة الثقة المطلوبة للمطابقة</span>
                </span>
                <span className="font-mono tabular-nums text-primary font-bold">
                  {Math.round((form.confidenceThreshold || 0.7) * 100)}%
                </span>
              </label>
              <input
                type="range"
                min={50}
                max={95}
                step={5}
                value={Math.round((form.confidenceThreshold || 0.7) * 100)}
                onChange={(e) =>
                  update({ confidenceThreshold: Number(e.target.value) / 100 })
                }
                className="w-full mt-2 accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground font-mono tabular-nums mt-1">
                <span>50% (مرن)</span>
                <span>95% (صارم)</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-semibold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{saving ? "جاري الحفظ..." : "حفظ إعدادات العنوان"}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground border border-border/70 rounded-xl bg-card hover:bg-muted/60 transition shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              <span>استعادة الافتراضي</span>
            </button>
          </div>
        </div>

        {/* Information Callout */}
        <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-muted/20 rounded-xl p-3.5 border border-border/60">
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
          <span>
            عند تفعيل الذكاء الاصطناعي، يُحفظ العنوان كما كتبه العميل ويحوله النظام إلى محافظة + منطقة مطابقة على خريطة شركة الشحن لتفادي رفض البوالص أو أخطاء التوجيه.
          </span>
        </div>
      </div>
    </div>
  );
};

export { CheckoutAddressSettingsSection };
