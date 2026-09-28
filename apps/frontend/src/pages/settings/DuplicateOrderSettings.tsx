import React, { useEffect, useState } from "react";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/api";
import {
  CheckCircleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  ClockIcon,
  BellAlertIcon,
  GlobeAltIcon,
  ChartBarIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

export interface DuplicateOrderSettingsData {
  enabled: boolean;
  criteria: "phone" | "phone_amount" | "phone_items";
  activeStatuses: string[];
  windowEnabled: boolean;
  windowMinutes: number;
  action: "record_visible" | "record_hidden" | "block";
  alertTeam: boolean;
  includeStoreOrders: boolean;
  reportTreatment: "separate" | "cancelled";
  exemptPhones: string[];
}

const DEFAULT_SETTINGS: DuplicateOrderSettingsData = {
  enabled: true,
  criteria: "phone",
  activeStatuses: ["PENDING", "CONFIRMED", "PROCESSING", "PREPARING", "SHIPPED", "ON_HOLD"],
  windowEnabled: false,
  windowMinutes: 60,
  action: "record_visible",
  alertTeam: true,
  includeStoreOrders: true,
  reportTreatment: "separate",
  exemptPhones: [],
};

const AVAILABLE_STATUS_OPTIONS = [
  { code: "PENDING", label: "قيد الانتظار", dot: "bg-amber-500" },
  { code: "CONFIRMED", label: "مؤكد", dot: "bg-blue-500" },
  { code: "PROCESSING", label: "قيد التنفيذ", dot: "bg-purple-500" },
  { code: "PREPARING", label: "قيد التجهيز", dot: "bg-indigo-500" },
  { code: "SHIPPED", label: "تم الشحن", dot: "bg-cyan-500" },
  { code: "ON_HOLD", label: "معلق", dot: "bg-orange-500" },
];

const TIME_WINDOW_PRESETS = [
  { minutes: 60, label: "ساعة" },
  { minutes: 360, label: "6 ساعات" },
  { minutes: 1440, label: "24 ساعة" },
  { minutes: 4320, label: "3 أيام" },
  { minutes: 10080, label: "7 أيام" },
];

const DuplicateOrderSettings: React.FC = () => {
  const [settings, setSettings] = useState<DuplicateOrderSettingsData>(DEFAULT_SETTINGS);
  const [exemptPhonesText, setExemptPhonesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/order-settings/duplicates").catch(() => null)
        || await apiClient.get("/order-settings");

      if (response?.data?.success) {
        const raw = response.data.data?.duplicateSettings || response.data.data || {};
        const merged: DuplicateOrderSettingsData = {
          enabled: raw.enabled !== undefined ? Boolean(raw.enabled) : DEFAULT_SETTINGS.enabled,
          criteria: ["phone", "phone_amount", "phone_items"].includes(raw.criteria)
            ? raw.criteria
            : DEFAULT_SETTINGS.criteria,
          activeStatuses: Array.isArray(raw.activeStatuses) && raw.activeStatuses.length > 0
            ? raw.activeStatuses
            : DEFAULT_SETTINGS.activeStatuses,
          windowEnabled: raw.windowEnabled !== undefined ? Boolean(raw.windowEnabled) : DEFAULT_SETTINGS.windowEnabled,
          windowMinutes: Number(raw.windowMinutes || DEFAULT_SETTINGS.windowMinutes),
          action: ["record_visible", "record_hidden", "block"].includes(raw.action)
            ? raw.action
            : raw.duplicateOrderAction === "ignore"
              ? "block"
              : raw.duplicateOrderAction === "hidden"
                ? "record_hidden"
                : DEFAULT_SETTINGS.action,
          alertTeam: raw.alertTeam !== undefined ? Boolean(raw.alertTeam) : DEFAULT_SETTINGS.alertTeam,
          includeStoreOrders: raw.includeStoreOrders !== undefined
            ? Boolean(raw.includeStoreOrders)
            : DEFAULT_SETTINGS.includeStoreOrders,
          reportTreatment: raw.reportTreatment === "cancelled" ? "cancelled" : DEFAULT_SETTINGS.reportTreatment,
          exemptPhones: Array.isArray(raw.exemptPhones) ? raw.exemptPhones : [],
        };
        setSettings(merged);
        setExemptPhonesText(merged.exemptPhones.join("\n"));
      }
    } catch (error) {
      console.error("Error fetching duplicate order settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = (statusCode: string) => {
    setSettings((prev) => {
      const exists = prev.activeStatuses.includes(statusCode);
      const nextStatuses = exists
        ? prev.activeStatuses.filter((s) => s !== statusCode)
        : [...prev.activeStatuses, statusCode];
      return { ...prev, activeStatuses: nextStatuses.length > 0 ? nextStatuses : [statusCode] };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const parsedExemptPhones = exemptPhonesText
        .split(/[\n,;]+/)
        .map((p) => p.trim())
        .filter(Boolean);

      const payload: DuplicateOrderSettingsData = {
        ...settings,
        exemptPhones: parsedExemptPhones,
      };

      const res = await apiClient.put("/order-settings/duplicates", payload).catch(() => null)
        || await apiClient.put("/order-settings", {
          duplicateSettings: payload,
          duplicateOrderAction: payload.action === "block" ? "ignore" : payload.action === "record_hidden" ? "hidden" : "filter",
          duplicateOrderWindowMinutes: payload.windowMinutes,
        });

      if (res?.data?.success) {
        tToast.success("DuplicateOrderSettings.success_save_eed8");
        setSettings(payload);
        setExemptPhonesText(parsedExemptPhones.join("\n"));
      }
    } catch (error) {
      console.error("Error saving duplicate order settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <ArrowPathIcon className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* 1. Header & Master Switch */}
      <div className="bg-card border border-border/60 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">إعدادات فحص الطلبات المكررة</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              فحص تلقائي للطلبات المتكررة لنفس العميل لحماية المخزون ومنع الشحن المزدوج. تُحفظ الإعدادات لكل شركة على حدة.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-foreground">
              {settings.enabled ? "الفحص مفعّل" : "الفحص معطّل"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                settings.enabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enabled ? "-translate-x-6" : "-translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className={`space-y-5 transition-opacity ${settings.enabled ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
        {/* 2. Criteria & Active Statuses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Criteria Card */}
          <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs space-y-3">
            <label className="block text-xs font-semibold text-foreground">معيار كشف التكرار</label>
            <div className="space-y-2">
              {[
                { id: "phone", title: "رقم الموبايل (افتراضي)", desc: "أي طلب من نفس الرقم يُعتبر مكرر إذا كان له طلب سابق لا يزال جاريًا" },
                { id: "phone_amount", title: "موبايل + نفس المبلغ", desc: "نفس رقم الهاتف وتطابق إجمالي الطلب بالجنيه" },
                { id: "phone_items", title: "موبايل + نفس المنتجات", desc: "نفس رقم الهاتف وتطابق نفس الأصناف والكميات" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    settings.criteria === opt.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="duplicateCriteria"
                    value={opt.id}
                    checked={settings.criteria === opt.id}
                    onChange={() => setSettings((s) => ({ ...s, criteria: opt.id as any }))}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground">{opt.title}</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Active Statuses Card */}
          <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs space-y-3">
            <div className="space-y-0.5">
              <label className="block text-xs font-semibold text-foreground">الحالات المحسوبة «جاري العمل عليها»</label>
              <p className="text-[11px] text-muted-foreground">
                يقارن التكرار فقط بالطلبات التي تحمل إحدى الحالات المحددة أدناه:
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {AVAILABLE_STATUS_OPTIONS.map((st) => {
                const selected = settings.activeStatuses.includes(st.code);
                return (
                  <button
                    key={st.code}
                    type="button"
                    onClick={() => handleStatusToggle(st.code)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selected
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                    <span>{st.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40 text-[11px] text-muted-foreground leading-relaxed">
              💡 الحالات المنتهية (تم التسليم · مرتجع · مرتجع جزئي · مسترد · ملغي · مفقود) تُعتبر منتهية، وإذا طلب العميل مجددًا يُسجّل كطلب جديد عادي دون تصنيفه مكررًا.
            </div>
          </div>
        </div>

        {/* 3. Time Window & Action */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Time Window Card */}
          <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-primary" />
                <label className="text-xs font-semibold text-foreground">النافذة الزمنية للفحص</label>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.windowEnabled}
                onClick={() => setSettings((s) => ({ ...s, windowEnabled: !s.windowEnabled }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  settings.windowEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    settings.windowEnabled ? "-translate-x-4.5" : "-translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {settings.windowEnabled
                ? "يتم البحث عن المكرر فقط خلال الفترة المحددة أدناه."
                : "النافذة مغلقة: يتم فحص أي طلب سابق نشط للعميل بغض النظر عن تاريخ إنشائه."}
            </p>
            {settings.windowEnabled && (
              <div className="flex flex-wrap gap-2 pt-1">
                {TIME_WINDOW_PRESETS.map((preset) => (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, windowMinutes: preset.minutes }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border tabular-nums transition-colors ${
                      settings.windowMinutes === preset.minutes
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-muted/30 text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action on Duplicate Card */}
          <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs space-y-3">
            <label className="block text-xs font-semibold text-foreground">التصرف عند اكتشاف مكرر</label>
            <div className="space-y-2">
              {[
                { id: "record_visible", title: "يسجّل ويبان للفريق (افتراضي)", desc: "يُنشأ الطلب بحالة «طلب مكرر» ويظهر في قائمة الطلبات اليومية بعلامة واضحة" },
                { id: "record_hidden", title: "يسجّل ومخفي", desc: "يُنشأ الطلب بحالة «طلب مكرر» ويُخفى من القائمة الافتراضية (يظهر فقط عند الفلترة)" },
                { id: "block", title: "مايتسجلش خالص", desc: "يتم حظر الطلب المكرر تمامًا ولا يُحفظ في قاعدة البيانات" },
              ].map((act) => (
                <label
                  key={act.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    settings.action === act.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="duplicateAction"
                    value={act.id}
                    checked={settings.action === act.id}
                    onChange={() => setSettings((s) => ({ ...s, action: act.id as any }))}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground">{act.title}</span>
                    <p className="text-[11px] text-muted-foreground">{act.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Additional Controls & Whitelist */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Toggles & Reporting */}
          <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs space-y-3">
            <label className="block text-xs font-semibold text-foreground">خيارات الإشعارات والتقارير</label>
            <div className="space-y-3">
              {/* Alert Team Toggle */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <BellAlertIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-foreground font-medium">تنبيه الفريق عند رصد مكرر</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.alertTeam}
                  onClick={() => setSettings((s) => ({ ...s, alertTeam: !s.alertTeam }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.alertTeam ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      settings.alertTeam ? "-translate-x-4.5" : "-translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Include Store Orders Toggle */}
              <div className="flex items-center justify-between py-1 border-t border-border/40 pt-2">
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-foreground font-medium">المقارنة تشمل طلبات المتجر (الزائر)</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.includeStoreOrders}
                  onClick={() => setSettings((s) => ({ ...s, includeStoreOrders: !s.includeStoreOrders }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.includeStoreOrders ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      settings.includeStoreOrders ? "-translate-x-4.5" : "-translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Reporting Treatment */}
              <div className="border-t border-border/40 pt-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-foreground font-medium">المعاملة في التقارير</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, reportTreatment: "separate" }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      settings.reportTreatment === "separate"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    بند منفصل «مكرر»
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, reportTreatment: "cancelled" }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      settings.reportTreatment === "cancelled"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    يتحسب ملغي
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Whitelist / Exempt Phones */}
          <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-primary" />
              <label className="text-xs font-semibold text-foreground">استثناءات (أرقام مستثناة من الفحص)</label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              أرقام تجار الجملة والعملاء المميزين (VIP) لتجاوز فحص التكرار والسماح بطلبات متتالية دون تقييد:
            </p>
            <textarea
              rows={4}
              value={exemptPhonesText}
              onChange={(e) => setExemptPhonesText(e.target.value)}
              placeholder="01012345678&#10;01234567890&#10;(اكتب كل رقم في سطر جديد أو افصل بفواصل)"
              className="w-full px-3 py-2 text-xs border border-border/60 rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* 5. Save & Reset Action Bar */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircleIcon className="w-4 h-4" />
          )}
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
        <button
          type="button"
          onClick={fetchSettings}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/60 text-foreground hover:bg-muted/60 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className="w-4 h-4" />
          إعادة تحميل
        </button>
      </div>
    </div>
  );
};

export default DuplicateOrderSettings;
