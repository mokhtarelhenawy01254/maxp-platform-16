import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
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
} from "lucide-react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";

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
        { headers: getAuthHeaders() }
      );
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error: any) {
      toast.error("خطأ في جلب إعدادات بوابة الدفع");
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
      toast.error("يرجى ملء Merchant ID و API Key");
      return;
    }

    try {
      setSaving(true);
      const response = await axios.put(
        buildApiUrl("super-admin/platform/settings/kashier"),
        settings,
        { headers: getAuthHeaders() }
      );
      if (response.data.success) {
        toast.success("✅ تم حفظ إعدادات بوابة الدفع بنجاح");
        setIsDirty(false);
        // Re-fetch to get masked secretKey
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
      toast.error("يرجى ملء Merchant ID و API Key أولاً");
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const response = await axios.post(
        buildApiUrl("super-admin/platform/settings/kashier/test-connection"),
        settings,
        { headers: getAuthHeaders() }
      );
      setTestResult({
        success: response.data.success,
        message: response.data.message || "تم الاتصال بنجاح",
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
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isLive = settings.mode === "live";

  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-blue-600" size={28} />
            إعدادات بوابة الدفع المنصية
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            بيانات كاشير المستخدمة لتحصيل اشتراكات التجار على MaxP
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
            isLive
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}
        >
          {isLive ? <Zap size={16} /> : <Settings size={16} />}
          {isLive ? "وضع الإنتاج" : "وضع الاختبار"}
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield size={20} className="text-blue-500" />
          وضع التشغيل
        </h3>
        <div className="flex gap-4">
          {(["test", "live"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleChange("mode", mode)}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold border-2 transition-all ${
                settings.mode === mode
                  ? mode === "live"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                  : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
              }`}
            >
              {mode === "test" ? "🧪 وضع الاختبار (Test)" : "🚀 وضع الإنتاج (Live)"}
            </button>
          ))}
        </div>
        {isLive && (
          <div className="mt-3 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              أنت في وضع الإنتاج — ستُحصَّل مبالغ حقيقية من التجار. تأكد من صحة البيانات.
            </span>
          </div>
        )}
      </div>

      {/* Credentials */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <CreditCard size={20} className="text-blue-500" />
          بيانات كاشير
        </h3>

        <div className="space-y-5">
          {/* Merchant ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Merchant ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={settings.merchantId}
              onChange={(e) => handleChange("merchantId", e.target.value)}
              placeholder="MID-XXXXXXXX"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              API Key <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => handleChange("apiKey", e.target.value)}
                placeholder="api_key_xxxxxxxxxxxxxx"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Secret Key{" "}
              <span className="text-xs text-gray-400 font-normal">
                (اتركه فارغاً للإبقاء على القيمة المحفوظة)
              </span>
            </label>
            <div className="relative">
              <input
                type={showSecretKey ? "text" : "password"}
                value={settings.secretKey}
                onChange={(e) => handleChange("secretKey", e.target.value)}
                placeholder={
                  settings.secretKey === "***"
                    ? "محفوظ بأمان — أدخل قيمة جديدة للتغيير"
                    : "secret_key_xxxxxxxxxxxxxx"
                }
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Zap size={20} className="text-purple-500" />
          طرق الدفع المفعّلة
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          اختر طرق الدفع التي ستظهر للتجار عند اشتراكهم في المنصة
        </p>
        <div className="flex gap-4">
          {[
            {
              id: "card",
              label: "💳 بطاقة بنكية",
              desc: "Visa / Mastercard",
            },
            {
              id: "wallet",
              label: "📱 محفظة إلكترونية",
              desc: "Fawry / Vodafone Cash",
            },
          ].map((method) => {
            const isEnabled = settings.enabledPaymentMethods.includes(method.id);
            return (
              <button
                key={method.id}
                onClick={() => togglePaymentMethod(method.id)}
                className={`flex-1 p-4 rounded-xl border-2 text-right transition-all ${
                  isEnabled
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isEnabled
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300 dark:border-gray-500"
                    }`}
                  >
                    {isEnabled && (
                      <CheckCircle size={12} className="text-white" />
                    )}
                  </div>
                  <span className="text-lg">{method.label.split(" ")[0]}</span>
                </div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm">
                  {method.label.split(" ").slice(1).join(" ")}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {method.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Test Connection Result */}
      {testResult && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            testResult.success
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400"
          }`}
        >
          {testResult.success ? (
            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          ) : (
            <WifiOff size={20} className="flex-shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-semibold">
              {testResult.success ? "الاتصال ناجح ✅" : "فشل الاتصال ❌"}
            </div>
            <div className="text-sm mt-0.5">{testResult.message}</div>
          </div>
        </div>
      )}

      {/* Informational Note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-sm">
        <Info size={18} className="flex-shrink-0 mt-0.5" />
        <span>
          هذه البيانات تُستخدم فقط لتحصيل رسوم اشتراكات التجار في المنصة. لإعداد بوابات الدفع الخاصة بكل تاجر في متجره، يستخدم كل تاجر بياناته الخاصة من صفحة &quot;إعدادات المتجر&quot;.
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleTest}
          disabled={testing || saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              جاري الاختبار...
            </>
          ) : (
            <>
              <Wifi size={18} />
              اختبار الاتصال
            </>
          )}
        </button>

        <button
          onClick={handleSave}
          disabled={saving || testing || !isDirty}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold transition-all ${
            isDirty && !saving && !testing
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saving ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save size={18} />
              حفظ الإعدادات
            </>
          )}
        </button>
      </div>
    </div>
  );
}
