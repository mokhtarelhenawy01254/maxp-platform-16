import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { TrashIcon, ClockIcon, ArrowRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface OrderStatusDefinition {
  code: string;
  name: string;
  color?: string;
}

interface AutoChangeRule {
  id: string;
  fromStatus: string;
  toStatus: string;
  waitTime: number;
  timeUnit: string;
  isActive: boolean;
}

const TIME_UNITS = [
  { value: "Minutes" },
  { value: "Hours" },
  { value: "Days" },
];

const DEFAULT_STATUSES = [
  { code: "PENDING", color: "#F59E0B" },
  { code: "CONFIRMED", color: "#3B82F6" },
  { code: "PROCESSING", color: "#8B5CF6" },
  { code: "SHIPPED", color: "#06B6D4" },
  { code: "DELIVERED", color: "#10B981" },
  { code: "CANCELLED", color: "#EF4444" },
  { code: "ON_HOLD", color: "#F97316" },
];

export default function OrderStatusAutomationPage() {
  const { t } = useTranslation();
  const [rules, setRules] = useState<AutoChangeRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    fromStatus: "",
    toStatus: "",
    waitTime: "30",
    timeUnit: "Minutes",
  });

  const [eventSettings, setEventSettings] = useState({
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
      const data = res.data?.data || res.data; // Support both {success: true, data: []} and []
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch rules", err);
      toast.error(t("orders.automationLoadError"));
    } finally {
      setLoading(false);
    }
  }, []);

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
        settings: { [key]: value }
      });
      toast.success(t("common.savedSuccessfully") || "Saved successfully");
    } catch (err) {
      console.error("Failed to update setting", err);
      toast.error(t("common.error") || "An error occurred");
    }
  };

  const handleCreate = async () => {
    if (!form.fromStatus || !form.toStatus || !form.waitTime) {
      toast.error(t("orders.automationFillAllFields"));
      return;
    }
    if (form.fromStatus === form.toStatus) {
      toast.error(t("orders.automationSameStatus"));
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
        toast.success(t("orders.automationCreateSuccess"));
      } else {
        const payloadStr = JSON.stringify(res.data, null, 2);
        console.error("Invalid response from server. res.data:", payloadStr);
        throw new Error(`Invalid response: ${payloadStr}`);
      }
    } catch (err: any) {
      console.error("Failed to create rule", err);
      toast.error(err?.response?.data?.message || err?.message || t("orders.automationCreateError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiClient.delete(`/order-status-rules/${id}`);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("orders.automationDeleteSuccess"));
    } catch (err) {
      console.error("Failed to delete rule", err);
      toast.error(t("orders.automationDeleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusName = (code: string) => {
    const statusKey = `orders.${code.toLowerCase()}`;
    const translated = t(statusKey);
    return translated !== statusKey ? translated : (statuses.find((s) => s.code === code)?.name || code);
  };

  const getStatusColor = (code: string) => {
    return statuses.find((s) => s.code === code)?.color || "#6B7280";
  };

  const formatWaitTime = (waitTime: number, timeUnit: string) => {
    const unitKey = `orders.timeUnit${timeUnit}`;
    return `${waitTime || 0} ${t(unitKey)}`;
  };

  useEffect(() => {
    document.title = `${t("orders.automationTitle")} | ${t("common.maxp")}`;
  }, [t]);

  return (
    <div className="flex h-full flex-col p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full">

      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)",
            }}
          >
            <BoltIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("orders.automationTitle")}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("orders.automationSubtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Event-Based Automation Section */}
      <div className="mb-6 rounded-[22px] border border-slate-200/70 bg-white/70 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-950/50">
        <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
          ╪º┘ä╪ú╪¬┘à╪¬╪⌐ ╪º┘ä┘à╪¿┘å┘è╪⌐ ╪╣┘ä┘ë ╪º┘ä╪ú╪¡╪»╪º╪½
        </h3>
        {loadingSettings ? (
          <div className="flex justify-center p-4">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Print Automation */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  ╪¬╪║┘è┘è╪▒ ╪º┘ä╪¡╪º┘ä╪⌐ ╪╣┘å╪» ╪╖╪¿╪º╪╣╪⌐ ╪º┘ä╪╖┘ä╪¿
                </span>
                <button
                  onClick={() => handleUpdateSetting("printAutomationEnabled", !eventSettings.printAutomationEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    eventSettings.printAutomationEnabled ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                  role="switch"
                  aria-checked={eventSettings.printAutomationEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                      eventSettings.printAutomationEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {eventSettings.printAutomationEnabled && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                    ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä┘à╪│╪¬┘ç╪»┘ü╪⌐
                  </label>
                  <select
                    value={eventSettings.printAutomationStatus}
                    onChange={(e) => handleUpdateSetting("printAutomationStatus", e.target.value)}
                    className="w-full rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-white transition"
                    dir="rtl"
                  >
                    <option value="" className="dark:bg-slate-900">╪º╪«╪¬╪▒ ╪º┘ä╪¡╪º┘ä╪⌐...</option>
                    {statuses.map((s) => (
                      <option key={s.code} value={s.code} className="dark:bg-slate-900">
                        {getStatusName(s.code)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Turbo Automation */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  ╪¬╪║┘è┘è╪▒ ╪º┘ä╪¡╪º┘ä╪⌐ ╪╣┘å╪» ╪º┘ä╪Ñ╪▒╪│╪º┘ä ┘ä╪¬╪▒╪¿┘ê ┘ê╪╡╪»┘ê╪▒ ╪¿┘ê┘ä┘è╪╡╪⌐
                </span>
                <button
                  onClick={() => handleUpdateSetting("turboAutomationEnabled", !eventSettings.turboAutomationEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    eventSettings.turboAutomationEnabled ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                  role="switch"
                  aria-checked={eventSettings.turboAutomationEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                      eventSettings.turboAutomationEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {eventSettings.turboAutomationEnabled && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                    ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä┘à╪│╪¬┘ç╪»┘ü╪⌐
                  </label>
                  <select
                    value={eventSettings.turboAutomationStatus}
                    onChange={(e) => handleUpdateSetting("turboAutomationStatus", e.target.value)}
                    className="w-full rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-white transition"
                    dir="rtl"
                  >
                    <option value="" className="dark:bg-slate-900">╪º╪«╪¬╪▒ ╪º┘ä╪¡╪º┘ä╪⌐...</option>
                    {statuses.map((s) => (
                      <option key={s.code} value={s.code} className="dark:bg-slate-900">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add New Rule Form */}
        <div className="lg:col-span-1">
          <div className="rounded-[22px] border border-slate-200/70 bg-white/70 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-950/50 backdrop-blur-xl sticky top-24">
            <h3 className="mb-5 text-base font-bold text-slate-900 dark:text-white">{t("orders.automationAddRule")}</h3>

            <div className="space-y-4">
              {/* From Status */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">{t("orders.automationFromStatus")}</label>
                <select
                  value={form.fromStatus}
                  onChange={(e) => setForm((p) => ({ ...p, fromStatus: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white transition"
                  dir="rtl"
                >
                  <option value="" className="dark:bg-slate-900">{t("orders.automationSelectStatus")}</option>
                  {statuses
                    .filter((s) => s.code !== "TRASH")
                    .map((s) => (
                      <option key={s.code} value={s.code} className="dark:bg-slate-900">
                        {getStatusName(s.code)}
                      </option>
                    ))}
                </select>
              </div>

              {/* To Status */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">{t("orders.automationToStatus")}</label>
                <select
                  value={form.toStatus}
                  onChange={(e) => setForm((p) => ({ ...p, toStatus: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white transition"
                  dir="rtl"
                >
                  <option value="" className="dark:bg-slate-900">{t("orders.automationSelectStatus")}</option>
                  {statuses
                    .filter((s) => s.code !== "TRASH" && s.code !== form.fromStatus)
                    .map((s) => (
                      <option key={s.code} value={s.code} className="dark:bg-slate-900">
                        {getStatusName(s.code)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Wait Time */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">{t("orders.automationWaitTime")}</label>
                  <input
                    type="number"
                    min="1"
                    value={form.waitTime}
                    onChange={(e) => setForm((p) => ({ ...p, waitTime: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white transition"
                    dir="rtl"
                    placeholder="30"
                  />
                </div>

                {/* Time Unit */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">{t("orders.automationTimeUnit")}</label>
                  <select
                    value={form.timeUnit}
                    onChange={(e) => setForm((p) => ({ ...p, timeUnit: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white transition"
                    dir="rtl"
                  >
                    {TIME_UNITS.map((u) => (
                      <option key={u.value} value={u.value} className="dark:bg-slate-900">
                        {t(`orders.timeUnit${u.value}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview */}
              {form.fromStatus && form.toStatus && form.waitTime && (
                <div
                  className="mt-2 flex items-start gap-3 rounded-xl border border-indigo-500/20 p-4"
                  style={{ background: "rgba(99,102,241,0.08)" }}
                >
                  <ClockIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t("orders.automationAfter")}{" "}
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">
                      {form.waitTime} {t(`orders.timeUnit${form.timeUnit}`)}
                    </span>{" "}
                    {t("orders.automationOrderStaysIn")}{" "}
                    <span className="font-bold whitespace-nowrap" style={{ color: getStatusColor(form.fromStatus) }}>
                      {getStatusName(form.fromStatus)}
                    </span>
                    {t("orders.automationWillChangeTo")}{" "}
                    <span className="font-bold whitespace-nowrap" style={{ color: getStatusColor(form.toStatus) }}>
                      {getStatusName(form.toStatus)}
                    </span>
                  </span>
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={saving || !form.fromStatus || !form.toStatus || !form.waitTime || form.fromStatus === form.toStatus}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  boxShadow: "0 4px 15px rgba(99,102,241,0.3)",
                }}
              >
                {saving ? (
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <PlusIcon className="h-5 w-5" />
                )}
                {t("orders.automationCreateRule")}
              </button>
            </div>
          </div>
        </div>

        {/* Rules List */}
        <div className="lg:col-span-2">
          <div className="rounded-[22px] border border-slate-200/70 bg-white/70 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-950/50 min-h-[400px]">
            <h3 className="mb-5 text-base font-bold text-slate-900 dark:text-white flex items-center gap-3">
              {t("orders.automationActiveRules")}
              {rules.length > 0 && (
                <span className="flex h-6 items-center justify-center rounded-full bg-indigo-500/10 px-2.5 text-xs text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {rules.length}
                </span>
              )}
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <span className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
                <p>{t("orders.automationLoadingRules")}</p>
              </div>
            ) : rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/70 py-20 text-center dark:border-white/10">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900/50">
                  <BoltIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-300">{t("orders.automationNoRules")}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  {t("orders.automationNoRulesDesc")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/50 bg-slate-50/50 p-4 transition-all hover:border-indigo-200 hover:bg-white dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/10 dark:hover:bg-white/[0.04]"
                  >
                    <div className="flex flex-1 flex-wrap items-center gap-3">
                      {/* From */}
                      <div
                        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold shadow-sm"
                        style={{
                          background: `${getStatusColor(rule.fromStatus)}15`,
                          color: getStatusColor(rule.fromStatus),
                          border: `1px solid ${getStatusColor(rule.fromStatus)}30`,
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: getStatusColor(rule.fromStatus) }}
                        />
                        {getStatusName(rule.fromStatus)}
                      </div>

                      {/* Arrow + time */}
                      <div className="flex items-center gap-2 px-1">
                        <ArrowRightIcon className="h-4 w-4 text-slate-400 rtl:rotate-180" />
                        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-white px-2.5 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                          <ClockIcon className="h-4 w-4 text-indigo-500" />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {formatWaitTime(rule.waitTime, rule.timeUnit)}
                          </span>
                        </div>
                        <ArrowRightIcon className="h-4 w-4 text-slate-400 rtl:rotate-180" />
                      </div>

                      {/* To */}
                      <div
                        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold shadow-sm"
                        style={{
                          background: `${getStatusColor(rule.toStatus)}15`,
                          color: getStatusColor(rule.toStatus),
                          border: `1px solid ${getStatusColor(rule.toStatus)}30`,
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: getStatusColor(rule.toStatus) }}
                        />
                        {getStatusName(rule.toStatus)}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={deletingId === rule.id}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      title={t("orders.automationDeleteRule")}
                    >
                      {deletingId === rule.id ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                      ) : (
                        <TrashIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
