import React from "react";
import { useTranslation } from "react-i18next";
import {
  Cog6ToothIcon,
  ClockIcon,
  BoltIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Switch } from "@/components/ui/switch";
import type { SettingsForm, DefaultSessionInfo, DeliveryPreviewItem } from "../types";

export interface TemplateSettingsTabProps {
  settings: SettingsForm | null;
  settingsLoading: boolean;
  settingsSaving: boolean;
  settingsSessions: { id: string; name: string; phoneNumber?: string; status: string; provider?: string }[];
  defaultSessionInfo: DefaultSessionInfo | null;
  deliveryPreview: Record<string, DeliveryPreviewItem>;
  syncingStatus: boolean;
  onUpdateSettings: React.Dispatch<React.SetStateAction<SettingsForm | null>>;
  onSaveSettings: () => void;
  onSyncMetaStatuses: () => void;
}

export const TemplateSettingsTab: React.FC<TemplateSettingsTabProps> = ({
  settings,
  settingsLoading,
  settingsSaving,
  settingsSessions,
  defaultSessionInfo,
  deliveryPreview,
  syncingStatus,
  onUpdateSettings,
  onSaveSettings,
  onSyncMetaStatuses,
}) => {
  const { t } = useTranslation();

  return (
    <div data-testid="settings-panel" className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-slate-900/50">
      <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
        <Cog6ToothIcon className="ms-1.5 inline h-5 w-5" />
        إعدادات إشعارات واتساب للطلبات
      </h2>

      {settingsLoading ? (
        <div className="flex justify-center py-10">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
        </div>
      ) : !settings ? (
        <p className="text-sm text-slate-400">{t("orders.settingsNone", "لا توجد إعدادات")}</p>
      ) : (
        <div className="space-y-5 max-w-xl">
          {/* General toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{t("orders.settingsEnableNotifications", "تفعيل إشعارات واتساب")}</p>
              <p className="text-xs text-slate-500">تشغيل أو إيقاف جميع إشعارات الواتساب</p>
            </div>
            <Switch
              checked={settings.isEnabled}
              onCheckedChange={(val) => onUpdateSettings((p) => p ? { ...p, isEnabled: val } : p)}
              aria-label="تفعيل إشعارات واتساب"
            />
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Order notifications toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">إشعارات حالات الطلبات</p>
              <p className="text-xs text-slate-500">إرسال رسالة واتساب عند تغيير حالة الطلب</p>
            </div>
            <Switch
              checked={settings.orderNotificationsEnabled}
              onCheckedChange={(val) => onUpdateSettings((p) => p ? { ...p, orderNotificationsEnabled: val } : p)}
              aria-label="إشعارات حالات الطلبات"
            />
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Default session */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-white">الجلسة الأساسية</label>
            <p className="mb-2 text-xs text-slate-500">جلسة الواتساب التي ستُرسل منها الرسائل</p>
            <select
              value={settings.defaultSessionId || ""}
              onChange={(e) => onUpdateSettings((p) => p ? { ...p, defaultSessionId: e.target.value || null } : p)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
            >
              <option value="">تلقائي (أي جلسة متصلة)</option>
              {settingsSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phoneNumber ? `(${s.phoneNumber})` : ""} - {s.status === "CONNECTED" ? "متصل" : "غير متصل"}
                </option>
              ))}
            </select>
            {defaultSessionInfo && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400">طريقة الإرسال الحالية:</span>
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${
                    defaultSessionInfo.provider === "META_CLOUD"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  }`}
                >
                  {defaultSessionInfo.provider === "META_CLOUD" ? "Meta Cloud API" : "Baileys"}
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-mono">{defaultSessionInfo.name}</span>
                {defaultSessionInfo.provider === "META_CLOUD" && !Object.values(deliveryPreview).some((item) => item.riskLevel === "none") && (
                  <span className="text-amber-500 dark:text-amber-400 font-medium">تحقق من حالة كل قالب</span>
                )}
              </div>
            )}
            {defaultSessionInfo?.provider === "META_CLOUD" && (
              <button
                onClick={onSyncMetaStatuses}
                disabled={syncingStatus}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ArrowPathIcon className={`h-3.5 w-3.5 ${syncingStatus ? "animate-spin" : ""}`} />
                مزامنة الحالات من ميتا
              </button>
            )}
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Sticky session */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{t("orders.settingsStickySession", "تثبيت الجلسة (Sticky Session)")}</p>
              <p className="text-xs text-slate-500">نفس العميل يستخدم نفس الجلسة دائماً</p>
            </div>
            <Switch
              checked={settings.stickySessionEnabled}
              onCheckedChange={(val) => onUpdateSettings((p) => p ? { ...p, stickySessionEnabled: val } : p)}
              aria-label="تثبيت الجلسة"
            />
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Quiet hours */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  <ClockIcon className="me-1 inline h-4 w-4" />
                  ساعات الهدوء
                </p>
                <p className="text-xs text-slate-500">عدم إرسال رسائل في هذه الفترة</p>
              </div>
              <Switch
                checked={settings.quietHoursEnabled}
                onCheckedChange={(val) => onUpdateSettings((p) => p ? { ...p, quietHoursEnabled: val } : p)}
                aria-label="ساعات الهدوء"
              />
            </div>
            {settings.quietHoursEnabled && (
              <div className="mt-2 flex items-center gap-3">
                <div>
                  <label className="text-xs text-slate-500">من</label>
                  <input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => onUpdateSettings((p) => p ? { ...p, quietHoursStart: e.target.value } : p)}
                    className="mt-1 block rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <span className="mt-5 text-slate-400">→</span>
                <div>
                  <label className="text-xs text-slate-500">إلى</label>
                  <input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => onUpdateSettings((p) => p ? { ...p, quietHoursEnd: e.target.value } : p)}
                    className="mt-1 block rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Rate limit */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-white">
              <BoltIcon className="me-1 inline h-4 w-4" />
              حد الإرسال (رسالة/دقيقة)
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={settings.rateLimitPerMinute}
              onChange={(e) => onUpdateSettings((p) => p ? { ...p, rateLimitPerMinute: parseInt(e.target.value) || 30 } : p)}
              className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          <button
            onClick={onSaveSettings}
            disabled={settingsSaving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {settingsSaving && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {t("orders.saveSettings", "حفظ الإعدادات")}
          </button>
        </div>
      )}
    </div>
  );
};

export default TemplateSettingsTab;
