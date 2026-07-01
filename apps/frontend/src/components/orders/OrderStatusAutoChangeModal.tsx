import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { XMarkIcon, PlusIcon, TrashIcon, ClockIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";

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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderStatuses: OrderStatusDefinition[];
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

export default function OrderStatusAutoChangeModal({ isOpen, onClose, orderStatuses }: Props) {
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

  const statuses = orderStatuses.length > 0 ? orderStatuses : DEFAULT_STATUSES;

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/order-status-rules");
      setRules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch rules", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen, fetchRules]);

  const handleCreate = async () => {
    if (!form.fromStatus || !form.toStatus || !form.waitTime) return;
    if (form.fromStatus === form.toStatus) return;

    setSaving(true);
    try {
      const res = await apiClient.post("/order-status-rules", {
        fromStatus: form.fromStatus,
        toStatus: form.toStatus,
        waitTime: parseInt(form.waitTime, 10),
        timeUnit: form.timeUnit,
      });
      setRules((prev) => [res.data, ...prev]);
      setForm({ fromStatus: "", toStatus: "", waitTime: "30", timeUnit: "Minutes" });
    } catch (err) {
      console.error("Failed to create rule", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiClient.delete(`/order-status-rules/${id}`);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete rule", err);
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
    return `${waitTime} ${unitMap[timeUnit] || timeUnit}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.55)" }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 shadow-2xl flex flex-col"
        style={{
          background: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 0 20px rgba(139, 92, 246, 0.5)",
              }}
            >
              <BoltIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">تغيير الحالة التلقائي</h2>
              <p className="text-xs text-slate-400">غيّر حالة الطلبات تلقائياً بعد مرور وقت محدد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Add New Rule Form */}
          <div
            className="mb-6 rounded-2xl border border-white/10 p-5"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <h3 className="mb-4 text-sm font-semibold text-white">إضافة قاعدة جديدة</h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* From Status */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">من حالة</label>
                <select
                  value={form.fromStatus}
                  onChange={(e) => setForm((p) => ({ ...p, fromStatus: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
                  dir="rtl"
                >
                  <option value="" className="bg-slate-900">اختر الحالة</option>
                  {statuses
                    .filter((s) => s.code !== "TRASH")
                    .map((s) => (
                      <option key={s.code} value={s.code} className="bg-slate-900">
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* To Status */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">إلى حالة</label>
                <select
                  value={form.toStatus}
                  onChange={(e) => setForm((p) => ({ ...p, toStatus: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
                  dir="rtl"
                >
                  <option value="" className="bg-slate-900">اختر الحالة</option>
                  {statuses
                    .filter((s) => s.code !== "TRASH" && s.code !== form.fromStatus)
                    .map((s) => (
                      <option key={s.code} value={s.code} className="bg-slate-900">
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Wait Time */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">المدة الزمنية</label>
                <input
                  type="number"
                  min="1"
                  value={form.waitTime}
                  onChange={(e) => setForm((p) => ({ ...p, waitTime: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
                  dir="rtl"
                  placeholder="30"
                />
              </div>

              {/* Time Unit */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">وحدة الوقت</label>
                <select
                  value={form.timeUnit}
                  onChange={(e) => setForm((p) => ({ ...p, timeUnit: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
                  dir="rtl"
                >
                  {TIME_UNITS.map((u) => (
                    <option key={u.value} value={u.value} className="bg-slate-900">
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview */}
            {form.fromStatus && form.toStatus && form.waitTime && (
              <div
                className="mt-4 flex items-center gap-2 rounded-xl border border-indigo-500/20 px-4 py-3"
                style={{ background: "rgba(99,102,241,0.08)" }}
              >
                <ClockIcon className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                <span className="text-xs text-slate-300">
                  بعد{" "}
                  <span className="font-bold text-white">
                    {form.waitTime} {TIME_UNITS.find((u) => u.value === form.timeUnit)?.label}
                  </span>{" "}
                  من بقاء الطلب في{" "}
                  <span className="font-bold" style={{ color: getStatusColor(form.fromStatus) }}>
                    {getStatusName(form.fromStatus)}
                  </span>
                  {" "}يتغير تلقائياً إلى{" "}
                  <span className="font-bold" style={{ color: getStatusColor(form.toStatus) }}>
                    {getStatusName(form.toStatus)}
                  </span>
                </span>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={saving || !form.fromStatus || !form.toStatus || !form.waitTime || form.fromStatus === form.toStatus}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 4px 15px rgba(99,102,241,0.3)",
              }}
            >
              {saving ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
              إضافة القاعدة
            </button>
          </div>

          {/* Rules List */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-300">
              القواعد المفعّلة
              {rules.length > 0 && (
                <span className="mr-2 rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
                  {rules.length}
                </span>
              )}
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : rules.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed border-white/10 py-10 text-center"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <BoltIcon className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                <p className="text-sm text-slate-500">لا توجد قواعد بعد</p>
                <p className="mt-1 text-xs text-slate-600">أضف قاعدتك الأولى لتغيير الحالات تلقائياً</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="group flex items-center gap-3 rounded-2xl border border-white/8 px-4 py-3.5 transition hover:border-white/15"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    {/* From */}
                    <div
                      className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold"
                      style={{
                        background: `${getStatusColor(rule.fromStatus)}18`,
                        color: getStatusColor(rule.fromStatus),
                        border: `1px solid ${getStatusColor(rule.fromStatus)}30`,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: getStatusColor(rule.fromStatus) }}
                      />
                      {getStatusName(rule.fromStatus)}
                    </div>

                    {/* Arrow + time */}
                    <div className="flex flex-1 items-center gap-2">
                      <ArrowRightIcon className="h-3 w-3 text-slate-600 rtl:rotate-180" />
                      <div className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1">
                        <ClockIcon className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-400">
                          {formatWaitTime(rule.waitTime, rule.timeUnit)}
                        </span>
                      </div>
                      <ArrowRightIcon className="h-3 w-3 text-slate-600 rtl:rotate-180" />
                    </div>

                    {/* To */}
                    <div
                      className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold"
                      style={{
                        background: `${getStatusColor(rule.toStatus)}18`,
                        color: getStatusColor(rule.toStatus),
                        border: `1px solid ${getStatusColor(rule.toStatus)}30`,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: getStatusColor(rule.toStatus) }}
                      />
                      {getStatusName(rule.toStatus)}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={deletingId === rule.id}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    >
                      {deletingId === rule.id ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border border-red-400 border-t-transparent" />
                      ) : (
                        <TrashIcon className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4">
          <p className="text-center text-xs text-slate-500">
            يتم تشغيل هذه القواعد تلقائياً كل دقيقة على جميع الطلبات
          </p>
        </div>
      </div>
    </div>
  );
}
