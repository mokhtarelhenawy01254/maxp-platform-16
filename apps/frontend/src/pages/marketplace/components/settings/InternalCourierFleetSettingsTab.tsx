import React from "react";
import { Truck } from "lucide-react";
import { InternalCourierFleetTreasurySection } from "./InternalCourierFleetTreasurySection";
import { InternalCourierFleetWorkflowSection } from "./InternalCourierFleetWorkflowSection";
import { JsonRecord } from "../../types/appSettingsTypes";

interface InternalCourierFleetSettingsTabProps {
  normalizedSettings: JsonRecord;
  treasuryAccounts: Array<{ id: string; name: string; type: string; balance: number }>;
  updateAtPath: (path: string, value: unknown) => void;
  navigate: (path: string) => void;
}

export const InternalCourierFleetSettingsTab: React.FC<InternalCourierFleetSettingsTabProps> = ({
  normalizedSettings,
  treasuryAccounts,
  updateAtPath,
  navigate,
}) => {
  const courierGeneral = (normalizedSettings["general"] as JsonRecord | undefined) || {};
  const courierRemittance = (normalizedSettings["remittance"] as JsonRecord | undefined) || {};
  const courierWorkflow = (normalizedSettings["fieldWorkflow"] as JsonRecord | undefined) || {};
  const courierCommission = (normalizedSettings["commission"] as JsonRecord | undefined) || {};
  const courierNotifications = (normalizedSettings["notifications"] as JsonRecord | undefined) || {};

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <InternalCourierFleetTreasurySection
        courierRemittance={courierRemittance}
        treasuryAccounts={treasuryAccounts}
        updateAtPath={updateAtPath}
        navigate={navigate}
      />

      {/* Section 2: Dispatch & Manifest Generation */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">إعدادات مأموريات التوزيع والمانيفست</h3>
            <p className="text-xs text-muted-foreground">صياغة كود الرحلات وضوابط كشوف التسليم الورقية</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              بادئة كود المأمورية (Manifest Prefix)
            </label>
            <input
              type="text"
              value={String(courierGeneral["runCodePrefix"] || "RUN")}
              onChange={(e) => updateAtPath("general.runCodePrefix", e.target.value.toUpperCase())}
              placeholder="مثال: RUN أو CAI-RUN"
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none uppercase font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              الصيغة الناتجة: <span className="font-mono text-foreground font-semibold">{String(courierGeneral["runCodePrefix"] || "RUN")}-20260923-001</span>
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
              <input
                type="checkbox"
                checked={Boolean(courierGeneral["autoPrintManifestOnDispatch"] ?? false)}
                onChange={(e) => updateAtPath("general.autoPrintManifestOnDispatch", e.target.checked)}
                className="mt-0.5 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-medium text-foreground block">طباعة المانيفست فور التكليف</span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  فتح شاشة الطباعة مباشرة فور إسناد الشحنات للمندوب من صالة تجهيز الطلبات.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
              <input
                type="checkbox"
                checked={Boolean(courierGeneral["includeCustomerPhoneInManifest"] ?? true)}
                onChange={(e) => updateAtPath("general.includeCustomerPhoneInManifest", e.target.checked)}
                className="mt-0.5 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-medium text-foreground block">إظهار أرقام هواتف العملاء في المانيفست المطبوع</span>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  طباعة رقم هاتف العميل بجانب العنوان لضمان التواصل حتى في حال تعطل هاتف المندوب.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <InternalCourierFleetWorkflowSection
        courierWorkflow={courierWorkflow}
        courierNotifications={courierNotifications}
        courierCommission={courierCommission}
        updateAtPath={updateAtPath}
      />
    </div>
  );
};
