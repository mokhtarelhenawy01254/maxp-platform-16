import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { TrashIcon, ClockIcon, ArrowRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

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
  { value: "Minutes", label: "دقيقة" },
  { value: "Hours", label: "ساعة" },
  { value: "Days", label: "يوم" },
];

const DEFAULT_STATUSES = [
  { code: "PENDING", name: "قيد الانتظار", color: "#F59E0B" },
  { code: "CONFIRMED", name: "مؤكد", color: "#3B82F6" },
  { code: "PROCESSING", name: "قيد التجهيز", color: "#8B5CF6" },
  { code: "SHIPPED", name: "تم الشحن", color: "#06B6D4" },
  { code: "DELIVERED", name: "تم التسليم", color: "#10B981" },
  { code: "CANCELLED", name: "ملغي", color: "#EF4444" },
  { code: "ON_HOLD", name: "معلق", color: "#F97316" },
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

  const [statuses, setStatuses] = useState<OrderStatusDefinition[]>(DEFAULT_STATUSES);

  // Fetch store statuses
  const fetchStatuses = useCallback(async () => {
    try {
      const res = await apiClient.get("/orders-new/statuses");
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
      toast.error("حدث خطأ أثناء تحميل القواعد");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
    fetchRules();
  }, [fetchStatuses, fetchRules]);

  const handleCreate = async () => {
    if (!form.fromStatus || !form.toStatus || !form.waitTime) {
      toast.error("يرجى تعبئة جميع الحقول");
      return;
    }
    if (form.fromStatus === form.toStatus) {
      toast.error("الحالة القديمة يجب أن تكون مختلفة عن الجديدة");
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
        toast.success("تم إنشاء القاعدة بنجاح");
      } else {
        throw new Error("Invalid response");
      }
    } catch (err: any) {
      console.error("Failed to create rule", err);
      toast.error(err?.response?.data?.message || "حدث خطأ أثناء إنشاء القاعدة");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiClient.delete(`/order-status-rules/${id}`);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success("تم حذف القاعدة بنجاح");
    } catch (err) {
      console.error("Failed to delete rule", err);
      toast.error("حدث خطأ أثناء حذف القاعدة");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusName = (code: string) => {
    return statuses.find((s) => s.code === code)?.name || code;
  };

  const getStatusColor = (code: string) => {
    return statuses.find((s) => s.code === code)?.color || "#6B7280";
  };

  const formatWaitTime = (waitTime: number, timeUnit: string) => {
    const unitMap: Record<string, string> = {
      Minutes: "دقيقة",
      Hours: "ساعة",
      Days: "يوم",
    };
    return `${waitTime || 0} ${unitMap[timeUnit] || timeUnit}`;
  };

  return (
    <div className="flex h-full flex-col p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      <Helmet>
        <title>{`أتمتة الحالات | ${t("common.maxp")}`}</title>
      </Helmet>

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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">أتمتة الحالات</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              غيّر حالة الطلبات تلقائياً بعد مرور وقت محدد (Cron Job يعمل في الخلفية)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add New Rule Form */}
        <div className="lg:col-span-1">
          <div className="rounded-[22px] border border-slate-200/70 bg-white/70 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-950/50 backdrop-blur-xl sticky top-24">
            <h3 className="mb-5 text-base font-bold text-slate-900 dark:text-white">إضافة قاعدة جديدة</h3>

            <div className="space-y-4">
              {/* From Status */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">من حالة</label>
                <select
                  value={form.fromStatus}
                  onChange={(e) => setForm((p) => ({ ...p, fromStatus: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white transition"
                  dir="rtl"
                >
                  <option value="" className="dark:bg-slate-900">اختر الحالة</option>
                  {statuses
                    .filter((s) => s.code !== "TRASH")
                    .map((s) => (
                      <option key={s.code} value={s.code} className="dark:bg-slate-900">
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* To Status */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">إلى حالة</label>
                <select
                  value={form.toStatus}
                  onChange={(e) => setForm((p) => ({ ...p, toStatus: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white transition"
                  dir="rtl"
                >
                  <option value="" className="dark:bg-slate-900">اختر الحالة</option>
                  {statuses
                    .filter((s) => s.code !== "TRASH" && s.code !== form.fromStatus)
                    .map((s) => (
                      <option key={s.code} value={s.code} className="dark:bg-slate-900">
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Wait Time */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">المدة الزمنية</label>
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
                  <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">وحدة الوقت</label>
                  <select
                    value={form.timeUnit}
                    onChange={(e) => setForm((p) => ({ ...p, timeUnit: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white transition"
                    dir="rtl"
                  >
                    {TIME_UNITS.map((u) => (
                      <option key={u.value} value={u.value} className="dark:bg-slate-900">
                        {u.label}
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
                    بعد مرور{" "}
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">
                      {form.waitTime} {TIME_UNITS.find((u) => u.value === form.timeUnit)?.label}
                    </span>{" "}
                    على بقاء الطلب في حالة{" "}
                    <span className="font-bold whitespace-nowrap" style={{ color: getStatusColor(form.fromStatus) }}>
                      {getStatusName(form.fromStatus)}
                    </span>
                    ، سيتم تغييره تلقائياً إلى حالة{" "}
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
                إنشاء القاعدة
              </button>
            </div>
          </div>
        </div>

        {/* Rules List */}
        <div className="lg:col-span-2">
          <div className="rounded-[22px] border border-slate-200/70 bg-white/70 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-950/50 min-h-[400px]">
            <h3 className="mb-5 text-base font-bold text-slate-900 dark:text-white flex items-center gap-3">
              القواعد الفعّالة
              {rules.length > 0 && (
                <span className="flex h-6 items-center justify-center rounded-full bg-indigo-500/10 px-2.5 text-xs text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {rules.length}
                </span>
              )}
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <span className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
                <p>جاري تحميل القواعد...</p>
              </div>
            ) : rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/70 py-20 text-center dark:border-white/10">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900/50">
                  <BoltIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-300">لا توجد قواعد مفعّلة حالياً</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  قم بإضافة قواعد لتغيير حالات الطلبات آلياً لتقليل العمل اليدوي وتسريع معالجة الطلبات.
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
                      title="حذف القاعدة"
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
