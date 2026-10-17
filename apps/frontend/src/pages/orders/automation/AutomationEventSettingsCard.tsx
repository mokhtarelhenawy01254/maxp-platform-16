import React from "react";
import { Printer, Truck, RotateCw } from "lucide-react";

export interface OrderStatusDefinition {
  code: string;
  name: string;
  color?: string;
}

export interface EventSettings {
  printAutomationEnabled: boolean;
  printAutomationStatus: string;
  turboAutomationEnabled: boolean;
  turboAutomationStatus: string;
}

interface AutomationEventSettingsCardProps {
  eventSettings: EventSettings;
  statuses: OrderStatusDefinition[];
  loadingSettings: boolean;
  onUpdateSetting: (key: string, value: any) => void;
  getStatusName: (code: string) => string;
}

export const AutomationEventSettingsCard: React.FC<AutomationEventSettingsCardProps> = ({
  eventSettings,
  statuses,
  loadingSettings,
  onUpdateSetting,
  getStatusName,
}) => {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-bold text-foreground">
          الأتمتة المبنية على الأحداث
        </h3>
        <span className="text-[11px] text-muted-foreground font-medium">
          (تغيير الحالة تلقائياً عند تنفيذ إجراءات معينة)
        </span>
      </div>

      {loadingSettings ? (
        <div className="flex justify-center p-6 text-muted-foreground">
          <RotateCw className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Print Automation */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Printer className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-foreground">
                  تغيير الحالة عند طباعة الطلب
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSetting("printAutomationEnabled", !eventSettings.printAutomationEnabled)
                }
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                  eventSettings.printAutomationEnabled ? "bg-primary" : "bg-muted-foreground/30"
                }`}
                role="switch"
                aria-checked={eventSettings.printAutomationEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ${
                    eventSettings.printAutomationEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {eventSettings.printAutomationEnabled && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                  الحالة المستهدفة
                </label>
                <select
                  value={eventSettings.printAutomationStatus}
                  onChange={(e) => onUpdateSetting("printAutomationStatus", e.target.value)}
                  className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring transition-colors"
                  dir="rtl"
                >
                  <option value="">اختر الحالة...</option>
                  {statuses.map((s) => (
                    <option key={s.code} value={s.code}>
                      {getStatusName(s.code)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Turbo Automation */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-foreground">
                  تغيير الحالة عند الإرسال لتربو وصدور بوليصة
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSetting("turboAutomationEnabled", !eventSettings.turboAutomationEnabled)
                }
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                  eventSettings.turboAutomationEnabled ? "bg-primary" : "bg-muted-foreground/30"
                }`}
                role="switch"
                aria-checked={eventSettings.turboAutomationEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ${
                    eventSettings.turboAutomationEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {eventSettings.turboAutomationEnabled && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                  الحالة المستهدفة
                </label>
                <select
                  value={eventSettings.turboAutomationStatus}
                  onChange={(e) => onUpdateSetting("turboAutomationStatus", e.target.value)}
                  className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring transition-colors"
                  dir="rtl"
                >
                  <option value="">اختر الحالة...</option>
                  {statuses.map((s) => (
                    <option key={s.code} value={s.code}>
                      {getStatusName(s.code)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
