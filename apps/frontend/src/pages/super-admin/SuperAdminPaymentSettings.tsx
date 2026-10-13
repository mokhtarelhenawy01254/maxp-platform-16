import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  CreditCard,
  Eye,
  EyeOff,
  Save,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Settings,
  Shield,
  Zap,
  RefreshCw,
  Info,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface KashierSettings {
  merchantId: string;
  apiKey: string;
  secretKey: string;
  mode: "test" | "live";
  enabledPaymentMethods: string[];
}

const DEFAULT_SETTINGS: KashierSettings = {
  merchantId: "",
  apiKey: "",
  secretKey: "",
  mode: "test",
  enabledPaymentMethods: ["card", "wallet"],
};

export default function SuperAdminPaymentSettings() {
  const [settings, setSettings] = useState<KashierSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const getAuthHeaders = () => {
    const token = tokenManager.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        buildApiUrl("super-admin/platform/settings/kashier"),
        { headers: getAuthHeaders() },
      );
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error: any) {
      tToast.error("SuperAdminPaymentSettings.error_fetch_922f");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof KashierSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setTestResult(null);
  };

  const togglePaymentMethod = (method: string) => {
    setSettings((prev) => {
      const current = prev.enabledPaymentMethods;
      const updated = current.includes(method)
        ? current.filter((m) => m !== method)
        : [...current, method];
      return { ...prev, enabledPaymentMethods: updated };
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!settings.merchantId || !settings.apiKey) {
      tToast.error("SuperAdminPaymentSettings.msg_d1a0");
      return;
    }

    try {
      setSaving(true);
      const response = await axios.put(
        buildApiUrl("super-admin/platform/settings/kashier"),
        settings,
        { headers: getAuthHeaders() },
      );
      if (response.data.success) {
        tToast.success("SuperAdminPaymentSettings.success_save_a705");
        setIsDirty(false);
        await fetchSettings();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "خطأ في حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!settings.merchantId || !settings.apiKey) {
      tToast.error("SuperAdminPaymentSettings.msg_7700");
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const response = await axios.post(
        buildApiUrl("super-admin/platform/settings/kashier/test-connection"),
        settings,
        { headers: getAuthHeaders() },
      );
      setTestResult({
        success: response.data.success,
        message:
          response.data.message || i18n.t("SuperAdminPaymentSettings.msg_25c4"),
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message:
          error.response?.data?.error ||
          error.response?.data?.message ||
          "فشل الاتصال. يرجى مراجعة البيانات.",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>جاري تحميل إعدادات بوابة الدفع...</span>
        </div>
      </div>
    );
  }

  const isLive = settings.mode === "live";

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <CreditCard className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                إعدادات بوابة الدفع المنصية
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
                  isLive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                {isLive ? "وضع الإنتاج" : "وضع الاختبار"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              بيانات Kashier المعتمدة لتحصيل رسوم اشتراكات التجار وباقات المنصة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testing || saving}
            className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
          >
            {testing ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <Wifi className="size-3.5 text-primary" />
            )}
            <span>{testing ? "جاري الاختبار..." : "اختبار الاتصال"}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || testing || !isDirty}
            className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
          >
            {saving ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            <span>حفظ الإعدادات</span>
          </Button>
        </div>
      </div>

      {/* Mode Selector Chassis */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <h2 className="text-xs font-semibold text-foreground">وضع التشغيل</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleChange("mode", "test")}
            className={`p-3 rounded-lg border text-right transition-all flex flex-col justify-between ${
              settings.mode === "test"
                ? "border-amber-500/40 bg-amber-500/5 shadow-2xs"
                : "border-border/60 bg-muted/10 hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Settings className="size-3.5 text-amber-500" />
                وضع الاختبار (Sandbox)
              </span>
              {settings.mode === "test" && (
                <span className="size-2 rounded-full bg-amber-500" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              لا يتم خصم أموال حقيقية — مخصص للاختبارات الفنية
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleChange("mode", "live")}
            className={`p-3 rounded-lg border text-right transition-all flex flex-col justify-between ${
              settings.mode === "live"
                ? "border-emerald-500/40 bg-emerald-500/5 shadow-2xs"
                : "border-border/60 bg-muted/10 hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Zap className="size-3.5 text-emerald-500" />
                وضع الإنتاج (Production)
              </span>
              {settings.mode === "live" && (
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              تحصيل مبالغ حقيقية من بطاقات ومحافظ التجار المشتركين
            </p>
          </button>
        </div>

        {isLive && (
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>
              أنت في وضع الإنتاج — ستُحصَّل مبالغ حقيقية من التجار. تأكد من صحة البيانات المسجلة.
            </span>
          </div>
        )}
      </div>

      {/* Credentials Chassis */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
          <CreditCard className="size-4 text-primary" />
          <h2 className="text-xs font-semibold text-foreground">بيانات الاعتماد (API Credentials)</h2>
        </div>

        <div className="space-y-3 text-xs">
          {/* Merchant ID */}
          <div>
            <label className="block text-muted-foreground mb-1">
              Merchant ID <span className="text-destructive">*</span>
            </label>
            <Input
              value={settings.merchantId}
              onChange={(e) => handleChange("merchantId", e.target.value)}
              placeholder="MID-XXXXXXXX"
              className="h-8 text-xs font-mono bg-background"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-muted-foreground mb-1">
              API Key <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => handleChange("apiKey", e.target.value)}
                placeholder="api_key_xxxxxxxxxxxxxx"
                className="h-8 text-xs font-mono bg-background pl-8"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-muted-foreground mb-1">
              Secret Key{" "}
              <span className="text-[10px] text-muted-foreground/70 font-normal">
                (اتركه فارغاً للإبقاء على القيمة المحفوظة في قاعدة البيانات)
              </span>
            </label>
            <div className="relative">
              <Input
                type={showSecretKey ? "text" : "password"}
                value={settings.secretKey}
                onChange={(e) => handleChange("secretKey", e.target.value)}
                placeholder={
                  settings.secretKey === "***"
                    ? "محفوظ بأمان — أدخل قيمة جديدة للتغيير"
                    : "secret_key_xxxxxxxxxxxxxx"
                }
                className="h-8 text-xs font-mono bg-background pl-8"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecretKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Chassis */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
          <Zap className="size-4 text-primary" />
          <h2 className="text-xs font-semibold text-foreground">طرق الدفع المفعّلة</h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          حدد خيارات الدفع المتاحة للتجار عند الترقية أو تجديد الاشتراك
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              id: "card",
              title: "بطاقة بنكية",
              icon: CreditCard,
              desc: "Visa / Mastercard / Meeza",
            },
            {
              id: "wallet",
              title: "محفظة إلكترونية",
              icon: Smartphone,
              desc: "Vodafone Cash / InstaPay / Wallets",
            },
          ].map((method) => {
            const isEnabled = settings.enabledPaymentMethods.includes(method.id);
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => togglePaymentMethod(method.id)}
                className={`p-3 rounded-lg border text-right transition-all flex items-center justify-between ${
                  isEnabled
                    ? "border-primary/40 bg-primary/5 shadow-2xs"
                    : "border-border/60 bg-muted/10 opacity-60 hover:opacity-80"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`size-7 rounded-md flex items-center justify-center ${
                      isEnabled
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground border border-border/60"
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-foreground block">
                      {method.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {method.desc}
                    </span>
                  </div>
                </div>

                <div
                  className={`size-4 rounded-full border flex items-center justify-center ${
                    isEnabled
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/80"
                  }`}
                >
                  {isEnabled && <CheckCircle2 className="size-3" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Test Connection Result */}
      {testResult && (
        <div
          className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
            testResult.success
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {testResult.success ? (
            <CheckCircle className="size-4 shrink-0 mt-0.5" />
          ) : (
            <WifiOff className="size-4 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-semibold block">
              {testResult.success ? "الاتصال ناجح" : "فشل الاتصال"}
            </span>
            <span className="text-[11px] mt-0.5 block opacity-90">
              {testResult.message}
            </span>
          </div>
        </div>
      )}

      {/* Informational Note */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/60 text-muted-foreground text-[11px]">
        <Info className="size-4 text-primary shrink-0 mt-0.5" />
        <span>
          هذه البيانات تُستخدم فقط لتحصيل رسوم اشتراكات التجار في منصة MaxP. أما إعدادات بوابات الدفع الخاصة بكل تاجر في متجره لعملائه، فيقوم التاجر بضبطها من شاشة &quot;إعدادات المتجر - بوابات الدفع&quot;.
        </span>
      </div>
    </div>
  );
}
