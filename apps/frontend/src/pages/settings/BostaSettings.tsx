import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  CheckCircle2,
  XCircle,
  Key,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Lock,
  Webhook,
  Eye,
  EyeOff,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";

interface BostaSettingsData {
  bostaEnabled: boolean;
  bostaApiKey: string;
  bostaWebhookToken: string;
  hasApiKey: boolean;
  maskedApiKey: string;
}

export const BostaSettings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showWebhookPlain, setShowWebhookPlain] = useState(false);
  const [settings, setSettings] = useState<BostaSettingsData>({
    bostaEnabled: false,
    bostaApiKey: "",
    bostaWebhookToken: "",
    hasApiKey: false,
    maskedApiKey: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/store-settings/bosta");
      if (res.data?.success) {
        setSettings({
          bostaEnabled: res.data.data.bostaEnabled || false,
          bostaApiKey: "",
          bostaWebhookToken: res.data.data.bostaWebhookToken || "",
          hasApiKey: res.data.data.hasApiKey || false,
          maskedApiKey: res.data.data.maskedApiKey || "",
        });
      }
    } catch {
      tToast.error("BostaSettings.failed_load_f24b");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.bostaApiKey && !settings.hasApiKey) {
      tToast.error("BostaSettings.msg_d142");
      return;
    }
    try {
      setSaving(true);
      const res = await apiClient.put("/store-settings/bosta", {
        bostaApiKey: settings.bostaApiKey || undefined,
        bostaWebhookToken: settings.bostaWebhookToken || undefined,
        bostaEnabled: settings.bostaEnabled,
      });
      if (res.data?.success) {
        tToast.success("BostaSettings.success_save_6d9e");
        loadSettings();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل حفظ إعدادات Bosta للشحن");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-2 text-muted-foreground select-none" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs font-medium">جاري تحميل إعدادات تكامل Bosta...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-4 select-none" dir="rtl">
      {/* Top Breadcrumb & Title */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => navigate("/settings/store")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
        >
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          <span>العودة لإعدادات المتجر والشحن</span>
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground">
                إعدادات الربط مع شركة Bosta للشحن
              </h1>
              <p className="text-xs text-muted-foreground">
                التكامل المباشر لإنشاء بوالص الشحن وتتبع الطرود ومزامنة الحالات
              </p>
            </div>
          </div>

          <a
            href="https://business.bosta.co"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline border border-border/70 bg-card px-3 py-1.5 rounded-lg shadow-2xs cursor-pointer"
          >
            <span>لوحة تحكم Bosta</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Single-Surface Chassis Card */}
      <div className="bg-card border border-border/70 rounded-xl p-5 shadow-2xs space-y-5">
        {/* Activation Banner */}
        <div
          className={`p-3.5 rounded-lg border transition-colors flex flex-wrap items-center justify-between gap-4 ${
            settings.bostaEnabled
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100"
              : "bg-muted/30 border-border/70 text-foreground"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                settings.bostaEnabled
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {settings.bostaEnabled ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                {settings.bostaEnabled ? "تكامل Bosta مفعّل ونشط" : "تكامل Bosta غير مفعّل"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {settings.bostaEnabled
                  ? "يتم إصدار بوالص الشحن تلقائياً وتتبع الطرود ومزامنة التسليم مع Bosta"
                  : "قم بتفعيل التكامل وإدخال مفتاح API للبدء في شحن الطلبات عبر Bosta"}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer select-none" dir="ltr">
            <input
              type="checkbox"
              checked={settings.bostaEnabled}
              onChange={(e) =>
                setSettings({ ...settings, bostaEnabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-10 h-5.5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary" />
          </label>
        </div>

        {/* API Key Configuration Section */}
        <div className="space-y-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Bosta API Key (مفتاح الربط)</h3>
          </div>

          <div className="space-y-3">
            {settings.hasApiKey && settings.maskedApiKey && (
              <div className="bg-muted/20 p-3 rounded-lg border border-border/60 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>المفتاح الحالي مخزن ومشفر بأمان في النظام:</span>
                  </p>
                  <code className="text-xs font-mono tabular-nums text-foreground bg-background border border-border/70 px-2 py-0.5 rounded inline-block" dir="ltr">
                    {settings.maskedApiKey}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  className="text-xs font-medium text-primary hover:underline border border-border/70 bg-card px-2.5 py-1 rounded-md transition-colors shadow-2xs cursor-pointer"
                >
                  {showApiKeyInput ? "إلغاء التغيير" : "تحديث المفتاح"}
                </button>
              </div>
            )}

            {(showApiKeyInput || !settings.hasApiKey) && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">
                  {settings.hasApiKey ? "أدخل مفتاح API الجديد للتبديل:" : "أدخل مفتاح Bosta API Key:"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <input
                    type="password"
                    value={settings.bostaApiKey}
                    onChange={(e) => setSettings({ ...settings, bostaApiKey: e.target.value })}
                    placeholder="bosta_live_..."
                    dir="ltr"
                    className="w-full bg-background border border-border/80 text-foreground text-xs font-mono rounded-lg pr-9 pl-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  يمكنك استخراج المفتاح من إعدادات الحساب والمطورين في لوحة Bosta للأعمال.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Webhook Token Section */}
        <div className="space-y-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4 text-primary" />
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Webhook Verification Token (اختياري)</h3>
          </div>

          <div className="space-y-1.5">
            <div className="relative">
              <input
                type={showWebhookPlain ? "text" : "password"}
                value={settings.bostaWebhookToken}
                onChange={(e) =>
                  setSettings({ ...settings, bostaWebhookToken: e.target.value })
                }
                placeholder="Bearer Token للتحقق من هوية إشعارات Bosta Webhook"
                dir="ltr"
                className="w-full bg-background border border-border/80 text-foreground text-xs font-mono rounded-lg pl-9 pr-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowWebhookPlain(!showWebhookPlain)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showWebhookPlain ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              يستخدم للتحقق من صحة توقيع إشعارات تغيير حالة الشحنات الواردة من سيرفرات Bosta.
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={() => navigate("/settings/store")}
            className="px-3.5 py-1.5 text-xs font-medium border border-border/70 rounded-lg bg-card text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (settings.bostaEnabled && !settings.bostaApiKey && !settings.hasApiKey)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saving ? "جاري الحفظ..." : "حفظ إعدادات Bosta"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BostaSettings;
