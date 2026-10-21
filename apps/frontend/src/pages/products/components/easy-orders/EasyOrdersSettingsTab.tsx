import React from "react";
import {
  Cog6ToothIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { EasyOrdersSettings, EasyOrdersSyncLog } from "./types";

interface EasyOrdersSettingsTabProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  loading: boolean;
  syncing: boolean;
  settings: EasyOrdersSettings | null;
  syncLogs: EasyOrdersSyncLog[];
  saveSettings: () => void;
  syncOrders: () => void;
  loadSyncLogs: () => void;
}

export const EasyOrdersSettingsTab: React.FC<EasyOrdersSettingsTabProps> = ({
  apiKey,
  setApiKey,
  loading,
  syncing,
  settings,
  syncLogs,
  saveSettings,
  syncOrders,
  loadSyncLogs,
}) => {
  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <div className="bg-card rounded-xl border border-border/70 shadow-xs p-5">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-border/60">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <Cog6ToothIcon className="h-5 w-5" />
          </div>
          <h2 className="text-base font-bold text-foreground">إعدادات الربط</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                مفتاح الـ API الخاص بـ Easy Orders
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="أدخل مفتاح الـ API..."
                className="w-full px-3.5 py-2 border border-border/70 rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono"
              />
            </div>
            <button
              onClick={saveSettings}
              disabled={loading}
              className="px-5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
            >
              {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </button>
          </div>

          <div className="bg-muted/30 border border-border/60 rounded-xl p-4 text-xs">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
              <span>حالة المزامنة التلقائية</span>
            </h3>
            {settings ? (
              <div className="space-y-2 font-mono tabular-nums">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-sans">آخر مزامنة ناجحة:</span>
                  <span className="font-medium text-foreground">
                    {settings.lastSyncAt
                      ? new Date(settings.lastSyncAt).toLocaleString("ar-EG")
                      : "لم تتم بعد"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-sans">حالة آخر عملية:</span>
                  <span
                    className={`font-semibold ${
                      settings.lastSyncStatus === "success"
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    {settings.lastSyncStatus === "success" ? "ناجحة" : "فاشلة"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">لم يتم إعداد الربط بعد</p>
            )}
            <button
              onClick={syncOrders}
              disabled={syncing || !settings?.hasApiKey}
              className="w-full mt-4 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "جاري مزامنة الطلبات..." : "مزامنة الطلبات الآن"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logs Card */}
      <div className="bg-card rounded-xl border border-border/70 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <DocumentTextIcon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-foreground">سجلات المزامنة</h2>
          </div>
          <button
            onClick={loadSyncLogs}
            className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
            title="تحديث السجلات"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="px-5 py-3 font-semibold">التوقيت</th>
                <th className="px-5 py-3 font-semibold">الحالة</th>
                <th className="px-5 py-3 font-semibold">العناصر</th>
                <th className="px-5 py-3 font-semibold">المدة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono tabular-nums">
              {syncLogs.length > 0 ? (
                syncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap">
                      {new Date(log.startedAt).toLocaleString("ar-EG")}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium font-sans ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : log.status === "RUNNING"
                            ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                            : "bg-red-500/10 text-red-600 border border-red-500/20"
                        }`}
                      >
                        {log.status === "SUCCESS"
                          ? "ناجحة"
                          : log.status === "RUNNING"
                          ? "جاري العمل"
                          : "فاشلة"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {log.successCount} نجاح | {log.failedCount} فشل
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {log.completedAt
                        ? `${Math.floor(
                            (new Date(log.completedAt).getTime() -
                              new Date(log.startedAt).getTime()) /
                              1000
                          )} ثانية`
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground font-sans">
                    لا توجد سجلات حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
