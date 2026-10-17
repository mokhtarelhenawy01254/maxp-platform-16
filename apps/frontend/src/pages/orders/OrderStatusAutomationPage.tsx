import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  AutomationEventSettingsCard,
  OrderStatusDefinition,
  EventSettings,
} from "./automation/AutomationEventSettingsCard";
import {
  AutomationRuleForm,
  AutomationRuleFormData,
} from "./automation/AutomationRuleForm";
import {
  AutomationRulesList,
  AutoChangeRule,
} from "./automation/AutomationRulesList";

const TIME_UNITS = [
  { value: "Minutes" },
  { value: "Hours" },
  { value: "Days" },
];

const DEFAULT_STATUSES: OrderStatusDefinition[] = [
  { code: "PENDING", name: "قيد الانتظار", color: "#F59E0B" },
  { code: "CONFIRMED", name: "مؤكد", color: "#3B82F6" },
  { code: "PROCESSING", name: "قيد التجهيز", color: "#8B5CF6" },
  { code: "SHIPPED", name: "تم الشحن", color: "#06B6D4" },
  { code: "DELIVERED", name: "تم التوصيل", color: "#10B981" },
  { code: "CANCELLED", name: "ملغي", color: "#EF4444" },
  { code: "ON_HOLD", name: "معلق", color: "#F97316" },
];

export default function OrderStatusAutomationPage() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<AutoChangeRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState<AutomationRuleFormData>({
    fromStatus: "",
    toStatus: "",
    waitTime: "30",
    timeUnit: "Minutes",
  });

  const [eventSettings, setEventSettings] = useState<EventSettings>({
    printAutomationEnabled: false,
    printAutomationStatus: "",
    turboAutomationEnabled: false,
    turboAutomationStatus: "",
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  const [statuses, setStatuses] = useState<OrderStatusDefinition[]>(DEFAULT_STATUSES);

  // Fetch store statuses
  const fetchStatuses = useCallback(async () => {
    try {
      const res = await apiClient.get("/order-status");
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setStatuses(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch order statuses", err);
    }
  }, []);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/order-status-rules");
      const data = res.data?.data || res.data;
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch rules", err);
      toast.error(t("orders.automationLoadError") || "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await apiClient.get("/settings/company");
      if (res.data?.success && res.data?.data?.settings) {
        const companySettings = res.data.data.settings;
        setEventSettings({
          printAutomationEnabled: companySettings.printAutomationEnabled || false,
          printAutomationStatus: companySettings.printAutomationStatus || "",
          turboAutomationEnabled: companySettings.turboAutomationEnabled || false,
          turboAutomationStatus: companySettings.turboAutomationStatus || "",
        });
      }
    } catch (err) {
      console.error("Failed to fetch company settings", err);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
    fetchRules();
    fetchSettings();
  }, [fetchStatuses, fetchRules, fetchSettings]);

  const handleUpdateSetting = async (key: string, value: any) => {
    const updated = { ...eventSettings, [key]: value };
    setEventSettings(updated);
    try {
      await apiClient.put("/settings/company", {
        settings: { [key]: value },
      });
      toast.success(t("common.savedSuccessfully") || "Saved successfully");
    } catch (err) {
      console.error("Failed to update setting", err);
      toast.error(t("common.error") || "An error occurred");
    }
  };

  const handleCreate = async () => {
    if (!form.fromStatus || !form.toStatus || !form.waitTime) {
      toast.error(t("orders.automationFillAllFields") || "Please fill all fields");
      return;
    }
    if (form.fromStatus === form.toStatus) {
      toast.error(t("orders.automationSameStatus") || "From and To statuses cannot be the same");
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.post("/order-status-rules", {
        fromStatus: form.fromStatus,
        toStatus: form.toStatus,
        waitTime: parseInt(form.waitTime, 10),
        timeUnit: form.timeUnit,
      });

      const newRule = res.data?.data || res.data;
      if (newRule && newRule.id) {
        setRules((prev) => [newRule, ...prev]);
        setForm({ fromStatus: "", toStatus: "", waitTime: "30", timeUnit: "Minutes" });
        toast.success(t("orders.automationCreateSuccess") || "Rule created successfully");
      }
    } catch (err: any) {
      console.error("Failed to create rule", err);
      toast.error(
        err?.response?.data?.message || err?.message || t("orders.automationCreateError") || "Error creating rule"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiClient.delete(`/order-status-rules/${id}`);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("orders.automationDeleteSuccess") || "Rule deleted successfully");
    } catch (err) {
      console.error("Failed to delete rule", err);
      toast.error(t("orders.automationDeleteError") || "Failed to delete rule");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusName = (code: string) => {
    const statusKey = `orders.${code.toLowerCase()}`;
    const translated = t(statusKey);
    return translated !== statusKey
      ? translated
      : statuses.find((s) => s.code === code)?.name || code;
  };

  const getStatusColor = (code: string) => {
    return statuses.find((s) => s.code === code)?.color || "#6B7280";
  };

  const formatWaitTime = (waitTime: number, timeUnit: string) => {
    const unitKey = `orders.timeUnit${timeUnit}`;
    return `${waitTime || 0} ${t(unitKey) || timeUnit}`;
  };

  useEffect(() => {
    document.title = `${t("orders.automationTitle") || "أتمتة الحالات"} | ${t("common.maxp") || "MaxP"}`;
  }, [t]);

  return (
    <div className="flex flex-col p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-5" dir="rtl">
      {/* Top Header */}
      <div className="flex items-center gap-3 border-b border-border/70 pb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">
            {t("orders.automationTitle") || "أتمتة حالات الطلبات"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("orders.automationSubtitle") || "قواعد ذكية لتغيير حالات الطلبات تلقائياً وفق جدول زمني وأحداث التشغيل"}
          </p>
        </div>
      </div>

      {/* Event-Based Automation Section */}
      <AutomationEventSettingsCard
        eventSettings={eventSettings}
        statuses={statuses}
        loadingSettings={loadingSettings}
        onUpdateSetting={handleUpdateSetting}
        getStatusName={getStatusName}
      />

      {/* Rules Grid: Form (1 col) + Rules List (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <AutomationRuleForm
            form={form}
            setForm={setForm}
            statuses={statuses}
            saving={saving}
            onCreate={handleCreate}
            getStatusName={getStatusName}
            getStatusColor={getStatusColor}
            timeUnits={TIME_UNITS}
          />
        </div>

        <div className="lg:col-span-2">
          <AutomationRulesList
            rules={rules}
            loading={loading}
            deletingId={deletingId}
            onDelete={handleDelete}
            getStatusName={getStatusName}
            getStatusColor={getStatusColor}
            formatWaitTime={formatWaitTime}
          />
        </div>
      </div>
    </div>
  );
}
