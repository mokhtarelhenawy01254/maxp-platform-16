import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  Star,
  Wallet,
  Crown,
  Plus,
  Minus,
  RefreshCw,
  Send,
  Loader2,
  TrendingUp,
  Save,
  User,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { useDateFormat } from "../../hooks/useDateFormat";

interface PortalSummary {
  loyaltySystem?: string;
  card?: any;
  loyalty?: {
    method?: string;
    tier?: { name?: string; nameAr?: string; color?: string; id?: string } | null;
    nextTier?: { name?: string; nameAr?: string } | null;
    rewards?: { freeShipping?: boolean; discountPercent?: number };
    points?: {
      current?: number;
      totalEarned?: number;
      totalRedeemed?: number;
      joinedAt?: string;
    };
  };
  autoDiscount?: {
    discountPercent?: number;
    validityDays?: number;
    status?: string | null;
    activeVoucher?: {
      id?: string;
      percent?: number;
      amount?: number;
      expiresAt?: string;
      sourceOrderNumber?: string;
    } | null;
  } | null;
  wallet?: {
    balance?: number;
    totalCashback?: number;
    currency?: string;
  };
}

interface LoyaltyRecord {
  programId: string;
  programName?: string | null;
  programType?: string;
  points: number;
  totalEarned?: number;
  tierName?: string | null;
  status?: string;
}

const CustomerLoyaltyTab: React.FC<{
  customerId: string;
  loyaltyRecords?: LoyaltyRecord[];
  isAdmin: boolean;
}> = ({ customerId, loyaltyRecords, isAdmin }) => {
  const { formatDate } = useDateFormat();
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingCard, setSendingCard] = useState(false);
  const [modal, setModal] = useState<null | { type: "add" | "redeem"; programId: string; programName: string }>(null);
  const [pointsInput, setPointsInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Tier override state
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideMethod, setOverrideMethod] = useState("");
  const [overrideBenefits, setOverrideBenefits] = useState({
    freeShipping: false,
    discountPercent: 0,
    priorityShipping: false,
    customText: "",
  });
  const [overrideSaving, setOverrideSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get(
        `/hr/customer-loyalty/customers/${customerId}/portal-summary`,
      );
      setSummary(res?.data?.data || null);
    } catch (e) {
      console.error("Error loading customer loyalty summary:", e);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isAdmin) {
      loadOverride();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, customerId]);

  const loadOverride = async () => {
    setOverrideLoading(true);
    try {
      const res: any = await apiClient.get(
        `/hr/customer-loyalty/customers/${customerId}/tier-override`,
      );
      const o = res?.data?.data;
      setOverrideMethod(o?.tierMethod || "");
      const b = o?.tierBenefits || {};
      setOverrideBenefits({
        freeShipping: Boolean(b.freeShipping),
        discountPercent: Number(b.discountPercent || 0),
        priorityShipping: Boolean(b.priorityShipping),
        customText: b.customText || "",
      });
    } catch (e) {
      console.error("Error loading tier override:", e);
    } finally {
      setOverrideLoading(false);
    }
  };

  const saveOverride = async () => {
    setOverrideSaving(true);
    try {
      const res: any = await apiClient.put(
        `/hr/customer-loyalty/customers/${customerId}/tier-override`,
        {
          tierMethod: overrideMethod || null,
          tierBenefits: overrideBenefits,
        },
      );
      toast.success(res?.data?.message || "تم حفظ مزايا العميل ✓");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل حفظ مزايا العميل");
    } finally {
      setOverrideSaving(false);
    }
  };

  const OVERRIDE_METHODS = [
    { value: "", label: "افتراضي الشركة" },
    { value: "POINTS", label: "بالنقاط" },
    { value: "SPENT", label: "بالفلوس المدفوعة" },
    { value: "ITEMS", label: "بعدد القطع" },
    { value: "ORDER_COUNT", label: "بعدد الأوردرات" },
  ];

  const activeProgram =
    (Array.isArray(loyaltyRecords) && loyaltyRecords.find((r) => r.status === "ACTIVE")) ||
    (Array.isArray(loyaltyRecords) && loyaltyRecords[0]) ||
    null;

  const submitPoints = async () => {
    if (!modal) return;
    const points = Number(pointsInput);
    if (!points || points <= 0) {
      toast.error("أدخل عدد نقاط صحيح");
      return;
    }
    setSubmitting(true);
    try {
      const body =
        modal.type === "add"
          ? { customerId, programId: modal.programId, points, reason: reasonInput || "إضافة من صفحة العميل" }
          : { customerId, programId: modal.programId, points };
      await apiClient.post(
        `/hr/customer-loyalty/${modal.type === "add" ? "add-points" : "redeem-points"}`,
        body,
      );
      toast.success(modal.type === "add" ? "تمت إضافة النقاط ✓" : "تم استبدال النقاط ✓");
      setModal(null);
      setPointsInput("");
      setReasonInput("");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.response?.data?.message || "فشلت العملية");
    } finally {
      setSubmitting(false);
    }
  };

  const sendCard = async () => {
    setSendingCard(true);
    try {
      const tier = summary?.loyalty?.tier;
      const params = new URLSearchParams();
      if (activeProgram?.programId) params.append("programId", activeProgram.programId);
      if (tier?.id) params.append("tierId", tier.id);
      const qs = params.toString();
      const res: any = await apiClient.post(
        `/hr/customer-loyalty/customers/${customerId}/card/send${qs ? `?${qs}` : ""}`,
      );
      const sent = res?.data?.data?.send?.success;
      toast.success(sent ? "تم إرسال كارت العضوية ✓" : "تم تجهيز الكارت (لم يُرسل للواتساب)");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل إرسال كارت العضوية");
    } finally {
      setSendingCard(false);
    }
  };

  if (loading) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isAutoDiscount = summary?.loyaltySystem === "AUTO_DISCOUNT" || Boolean(summary?.autoDiscount);
  const points = summary?.loyalty?.points;
  const wallet = summary?.wallet;
  const tier = summary?.loyalty?.tier;

  return (
    <div className="space-y-4">
      {/* Tier / System card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-indigo-500" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {isAutoDiscount ? "نظام الخصم التلقائي" : "مستوى الولاء"}
            </p>
          </div>
          {isAutoDiscount ? (
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {summary?.autoDiscount?.discountPercent ?? 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">خصم على الأوردر الجاي</p>
              <p className="mt-1 text-xs">
                {summary?.autoDiscount?.status === "AVAILABLE" ? (
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    خصم متاح ✓
                  </span>
                ) : summary?.autoDiscount?.status === "PRE_ACTIVATION" ? (
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    قبل تفعيل النظام
                  </span>
                ) : (
                  <span className="text-gray-400">لا يوجد كوبون حاليًا</span>
                )}
              </p>
              {summary?.autoDiscount?.activeVoucher && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  كوبون {summary.autoDiscount.activeVoucher.percent}% من أوردر #
                  {summary.autoDiscount.activeVoucher.sourceOrderNumber || "—"} — ينتهي{" "}
                  {summary.autoDiscount.activeVoucher.expiresAt
                    ? formatDate(summary.autoDiscount.activeVoucher.expiresAt)
                    : "—"}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <p
                className="text-2xl font-bold"
                style={{ color: tier?.color || "#6366f1" }}
              >
                {tier?.nameAr || tier?.name || "بدون مستوى"}
              </p>
              {summary?.loyalty?.nextTier && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  التالي: {summary.loyalty.nextTier.nameAr || summary.loyalty.nextTier.name}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {summary?.loyalty?.rewards?.freeShipping && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                    شحن مجاني
                  </span>
                )}
                {Number(summary?.loyalty?.rewards?.discountPercent || 0) > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                    خصم {summary?.loyalty?.rewards?.discountPercent}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Points */}
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">النقاط</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {points?.current ?? 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            كلها: {points?.totalEarned ?? 0} • مستبدلة: {points?.totalRedeemed ?? 0}
          </p>
          {isAdmin && activeProgram && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setModal({ type: "add", programId: activeProgram.programId, programName: activeProgram.programName || "" })}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" /> إضافة
              </button>
              <button
                onClick={() => setModal({ type: "redeem", programId: activeProgram.programId, programName: activeProgram.programName || "" })}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs hover:bg-orange-700"
              >
                <Minus className="h-3.5 w-3.5" /> استبدال
              </button>
            </div>
          )}
        </div>

        {/* Wallet */}
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">المحفظة / الكاش باك</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(wallet?.balance ?? 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            إجمالي الكاش باك: {formatCurrency(wallet?.totalCashback ?? 0)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          {isAdmin && (
            <button
              onClick={sendCard}
              disabled={sendingCard}
              className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {sendingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              إرسال كارت العضوية
            </button>
          )}
        </div>
        {!isAutoDiscount && summary?.loyalty?.tier && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            طريقة الحساب: {summary.loyalty.method || "افتراضي الشركة"}
          </span>
        )}
      </div>

      {/* Tier Override */}
      {isAdmin && !isAutoDiscount && (
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              مزايا / طريقة حساب مخصصة لهذا العميل
            </h4>
            {overrideLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">طريقة حساب هذا العميل</label>
              <select
                value={overrideMethod}
                onChange={(e) => setOverrideMethod(e.target.value)}
                className="w-full mt-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {OVERRIDE_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3 bg-gray-50 dark:bg-gray-700/40 p-3 rounded-lg">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={overrideBenefits.freeShipping}
                onChange={(e) =>
                  setOverrideBenefits((b) => ({ ...b, freeShipping: e.target.checked }))
                }
                className="h-4 w-4 accent-indigo-600"
              />
              شحن مجاني
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={overrideBenefits.priorityShipping}
                onChange={(e) =>
                  setOverrideBenefits((b) => ({ ...b, priorityShipping: e.target.checked }))
                }
                className="h-4 w-4 accent-indigo-600"
              />
              شحن سريع / أولوية
            </label>
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <span className="whitespace-nowrap">خصم %</span>
              <input
                type="number"
                min="0"
                max="100"
                value={overrideBenefits.discountPercent}
                onChange={(e) =>
                  setOverrideBenefits((b) => ({
                    ...b,
                    discountPercent: Number(e.target.value),
                  }))
                }
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <input
              value={overrideBenefits.customText}
              onChange={(e) =>
                setOverrideBenefits((b) => ({ ...b, customText: e.target.value }))
              }
              placeholder="ميزة مخصصة..."
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={saveOverride}
              disabled={overrideSaving}
              className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {overrideSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ مزايا العميل
            </button>
          </div>
        </div>
      )}

      {/* Add / Redeem points modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {modal.type === "add" ? "إضافة نقاط" : "استبدال نقاط"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {modal.programName || "برنامج الولاء"}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  عدد النقاط
                </label>
                <input
                  type="number"
                  min="1"
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              </div>
              {modal.type === "add" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    السبب (اختياري)
                  </label>
                  <input
                    type="text"
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="مثال: تعويض عن تأخير الشحن"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setModal(null)}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                إلغاء
              </button>
              <button
                onClick={submitPoints}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {modal.type === "add" ? "إضافة" : "استبدال"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLoyaltyTab;