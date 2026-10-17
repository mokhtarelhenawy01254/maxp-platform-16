import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Clock, RotateCw } from "lucide-react";
import { OrderStatusDefinition } from "./AutomationEventSettingsCard";

export interface AutomationRuleFormData {
  fromStatus: string;
  toStatus: string;
  waitTime: string;
  timeUnit: string;
}

interface AutomationRuleFormProps {
  form: AutomationRuleFormData;
  setForm: React.Dispatch<React.SetStateAction<AutomationRuleFormData>>;
  statuses: OrderStatusDefinition[];
  saving: boolean;
  onCreate: () => void;
  getStatusName: (code: string) => string;
  getStatusColor: (code: string) => string;
  timeUnits: { value: string }[];
}

export const AutomationRuleForm: React.FC<AutomationRuleFormProps> = ({
  form,
  setForm,
  statuses,
  saving,
  onCreate,
  getStatusName,
  getStatusColor,
  timeUnits,
}) => {
  const { t } = useTranslation();

  const isFormValid =
    form.fromStatus &&
    form.toStatus &&
    form.waitTime &&
    form.fromStatus !== form.toStatus;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs sticky top-24">
      <h3 className="mb-4 text-sm font-bold text-foreground">
        {t("orders.automationAddRule") || "إضافة قاعدة جديدة"}
      </h3>

      <div className="space-y-4">
        {/* From Status */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            {t("orders.automationFromStatus") || "من الحالة"}
          </label>
          <select
            value={form.fromStatus}
            onChange={(e) => setForm((p) => ({ ...p, fromStatus: e.target.value }))}
            className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring transition-colors"
            dir="rtl"
          >
            <option value="">{t("orders.automationSelectStatus") || "اختر الحالة..."}</option>
            {statuses
              .filter((s) => s.code !== "TRASH")
              .map((s) => (
                <option key={s.code} value={s.code}>
                  {getStatusName(s.code)}
                </option>
              ))}
          </select>
        </div>

        {/* To Status */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            {t("orders.automationToStatus") || "إلى الحالة"}
          </label>
          <select
            value={form.toStatus}
            onChange={(e) => setForm((p) => ({ ...p, toStatus: e.target.value }))}
            className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring transition-colors"
            dir="rtl"
          >
            <option value="">{t("orders.automationSelectStatus") || "اختر الحالة..."}</option>
            {statuses
              .filter((s) => s.code !== "TRASH" && s.code !== form.fromStatus)
              .map((s) => (
                <option key={s.code} value={s.code}>
                  {getStatusName(s.code)}
                </option>
              ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Wait Time */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {t("orders.automationWaitTime") || "المدة الزمنية"}
            </label>
            <input
              type="number"
              min="1"
              value={form.waitTime}
              onChange={(e) => setForm((p) => ({ ...p, waitTime: e.target.value }))}
              className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-mono tabular-nums text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring transition-colors"
              dir="rtl"
              placeholder="30"
            />
          </div>

          {/* Time Unit */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {t("orders.automationTimeUnit") || "الوحدة"}
            </label>
            <select
              value={form.timeUnit}
              onChange={(e) => setForm((p) => ({ ...p, timeUnit: e.target.value }))}
              className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring transition-colors"
              dir="rtl"
            >
              {timeUnits.map((u) => (
                <option key={u.value} value={u.value}>
                  {t(`orders.timeUnit${u.value}`) || u.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Rule Preview */}
        {form.fromStatus && form.toStatus && form.waitTime && (
          <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-xs text-foreground leading-relaxed">
              {t("orders.automationAfter") || "بعد مرور"}{" "}
              <span className="font-bold font-mono tabular-nums text-primary">
                {form.waitTime} {t(`orders.timeUnit${form.timeUnit}`) || form.timeUnit}
              </span>{" "}
              {t("orders.automationOrderStaysIn") || "في حالة"}{" "}
              <span
                className="font-bold whitespace-nowrap"
                style={{ color: getStatusColor(form.fromStatus) }}
              >
                {getStatusName(form.fromStatus)}
              </span>{" "}
              {t("orders.automationWillChangeTo") || "يتم الانتقال تلقائياً إلى"}{" "}
              <span
                className="font-bold whitespace-nowrap"
                style={{ color: getStatusColor(form.toStatus) }}
              >
                {getStatusName(form.toStatus)}
              </span>
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onCreate}
          disabled={saving || !isFormValid}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <RotateCw className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {t("orders.automationCreateRule") || "إنشاء القاعدة"}
        </button>
      </div>
    </div>
  );
};
