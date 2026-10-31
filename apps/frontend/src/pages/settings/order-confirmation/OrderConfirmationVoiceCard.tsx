import React, { useState, useEffect } from "react";
import api from "../../../services/api";
import { PhoneCall, Bot, AlertCircle, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";

interface VoiceSettings {
  enabled: boolean;
  autoCallEnabled: boolean;
  provider: "SIMULATION" | "VAPI";
  startHour: number;
  endHour: number;
  maxCallsNoAnswer: number;
  intervalMinutes: number;
  simulatedOutcome: "reached" | "no_answer" | "busy" | "wrong_number";
  webhookSecret?: string;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: true,
  autoCallEnabled: true,
  provider: "SIMULATION",
  startHour: 10,
  endHour: 22,
  maxCallsNoAnswer: 3,
  intervalMinutes: 30,
  simulatedOutcome: "reached",
};

export const OrderConfirmationVoiceCard: React.FC = () => {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    api
      .get<{ success: boolean; data: VoiceSettings }>("/voice/settings")
      .then((res) => {
        if (isMounted && res.data?.data) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...res.data.data,
          });
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("[VOICE-SETTINGS] Error fetching settings:", err.message);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const res = await api.put<{ success: boolean; data: VoiceSettings }>("/voice/settings", settings);
      if (res.data?.data) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...res.data.data,
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "فشل حفظ إعدادات المكالمات الصوتية");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-xs text-gray-500 animate-pulse">
        جاري تحميل إعدادات المكالمات الآلية...
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-base">
              إيجنت اتصالات وتأكيد الأوردرات (صوت الذكاء الاصطناعي)
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                AI Agent T23
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              إجراء مكالمات تأكيد الطلبات تلقائياً بالذكاء الاصطناعي مع منع التكرار وإعادة المحاولة الذكية.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving ? (
            "جاري الحفظ..."
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              تم الحفظ
            </>
          ) : (
            "حفظ إعدادات الصوت"
          )}
        </button>
      </div>

      {/* Simulation banner */}
      {settings.provider === "SIMULATION" && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">وضع المحاكاة الآمن (SIMULATION):</span> لن يتم إجراء أي مكالمات تليفونية
            حقيقية أو خصم رصيد. يتم محاكاة النتيجة وتدفق الطابور وسجل المحاولات بشكل فوري وموثوق للاختبار والتشغيل
            الداخلي.
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Toggle Switches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center justify-between p-3.5 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer">
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-gray-900 dark:text-white block">
              تفعيل مكالمات الصوت الذكية
            </span>
            <span className="text-xs text-gray-500">تمكين محرك الاتصال الآلي بالعملاء</span>
          </div>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
          />
        </label>

        <label className="flex items-center justify-between p-3.5 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer">
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-gray-900 dark:text-white block">
              الاتصال التلقائي عند الطلب
            </span>
            <span className="text-xs text-gray-500">جدولة مكالمة فورية عند إتمام الطلب من الموقع</span>
          </div>
          <input
            type="checkbox"
            checked={settings.autoCallEnabled}
            onChange={(e) => setSettings({ ...settings, autoCallEnabled: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
          />
        </label>
      </div>

      {/* Calling Hours & Provider */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            مزود خدمة المكالمات
          </label>
          <select
            value={settings.provider}
            onChange={(e) => setSettings({ ...settings, provider: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
          >
            <option value="SIMULATION">SIMULATION (محاكاة آمنة بدون رصيد)</option>
            <option value="VAPI">Vapi (مزود خارجي عبر ai_keys)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            بداية نافذة الاتصال (الساعة)
          </label>
          <input
            type="number"
            min={0}
            max={23}
            value={settings.startHour}
            onChange={(e) => setSettings({ ...settings, startHour: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-xs font-mono"
          />
          <span className="text-[10px] text-gray-400">مثال: 10 = العاشرة صباحاً</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            نهاية نافذة الاتصال (الساعة)
          </label>
          <input
            type="number"
            min={0}
            max={23}
            value={settings.endHour}
            onChange={(e) => setSettings({ ...settings, endHour: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-xs font-mono"
          />
          <span className="text-[10px] text-gray-400">مثال: 22 = العاشرة مساءً</span>
        </div>
      </div>

      {/* Attempts & Retries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            الحد الأقصى للمحاولات عند عدم الرد
          </label>
          <input
            type="number"
            min={0}
            max={10}
            value={settings.maxCallsNoAnswer}
            onChange={(e) => setSettings({ ...settings, maxCallsNoAnswer: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-xs font-mono"
          />
          <span className="text-[10px] text-gray-400">0 = بلا حد أقصى (حسب الإعدادات العامة)</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            الفاصل الزمني بين المحاولات (دقائق)
          </label>
          <input
            type="number"
            min={1}
            max={1440}
            value={settings.intervalMinutes}
            onChange={(e) => setSettings({ ...settings, intervalMinutes: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-xs font-mono"
          />
          <span className="text-[10px] text-gray-400">مثال: 30 دقيقة بين كل محاولة</span>
        </div>

        {settings.provider === "SIMULATION" && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              نتيجة المحاكاة الافتراضية
            </label>
            <select
              value={settings.simulatedOutcome}
              onChange={(e) => setSettings({ ...settings, simulatedOutcome: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
            >
              <option value="reached">تم الرد والتأكيد (reached)</option>
              <option value="no_answer">لم يتم الرد (no_answer)</option>
              <option value="busy">الخط مشغول (busy)</option>
              <option value="wrong_number">الرقم خاطئ (wrong_number)</option>
            </select>
            <span className="text-[10px] text-gray-400">النتيجة الناتجة في بيئة الاختبار</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderConfirmationVoiceCard;
