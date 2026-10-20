import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  Loader2,
  Lock,
  MessageCircle,
  Printer,
  RefreshCw,
  ShieldAlert,
  Unlock,
  X as XMarkIcon,
} from "lucide-react";
import type {
  DentalLabDoctor,
  DentalMonthlySettlement,
  MonthlySettlementSummary,
} from "../../shared";
import {
  closeMonthlySettlement,
  fetchMonthlySettlements,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  reopenMonthlySettlement,
} from "../../shared";
import { DentalInvoiceSettlementVoucherModal } from "./DentalInvoiceSettlementVoucherModal";

export interface DentalInvoiceMonthlySettlementModalProps {
  initialDoctorId?: string;
  doctors: DentalLabDoctor[];
  onClose: () => void;
  onUpdated: () => void;
}

export function DentalInvoiceMonthlySettlementModal({
  initialDoctorId,
  doctors,
  onClose,
  onUpdated,
}: DentalInvoiceMonthlySettlementModalProps) {
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${m}`;
  }, []);

  const [period, setPeriod] = useState<string>(currentMonthStr);
  const [filterDoctorId, setFilterDoctorId] = useState<string>(initialDoctorId || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settlements, setSettlements] = useState<DentalMonthlySettlement[]>([]);
  const [summary, setSummary] = useState<MonthlySettlementSummary | null>(null);

  // Sub-modal for reopen reason
  const [reopenTarget, setReopenTarget] = useState<DentalMonthlySettlement | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);

  // Voucher print view
  const [voucherSettlement, setVoucherSettlement] = useState<DentalMonthlySettlement | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMonthlySettlements({
        period,
        doctorId: filterDoctorId || undefined,
      });
      setSettlements(res.settlements || []);
      setSummary(res.summary || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل تحميل تسويات ومستحقات الشهر";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [period, filterDoctorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCloseSingle = async (docId: string, doctorName: string) => {
    if (
      !confirm(
        `هل أنت متأكد من رغبتك في تقفيل واعتماد حساب د. ${doctorName} لشهر ${period}؟ سيتم تجميد الأرصدة وترحيل الرصيد الختامي للشهر القادم.`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      await closeMonthlySettlement({
        period,
        doctorId: docId,
      });
      toast.success(`تم تقفيل واعتماد حساب د. ${doctorName} بنجاح`);
      loadData();
      onUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل تقفيل الحساب";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseAll = async () => {
    const unclosedCount = settlements.filter((s) => !s.isClosed).length;
    if (unclosedCount === 0) {
      toast.info("جميع حسابات الأطباء لهذا الشهر مغلقة ومعتمدة بالفعل");
      return;
    }
    if (
      !confirm(
        `هل أنت متأكد من إغلاق واعتماد كافة الحسابات (${unclosedCount} طبيب) لشهر ${period} دفعة واحدة؟`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      await closeMonthlySettlement({
        period,
      });
      toast.success(`تم إغلاق واعتماد كافة حسابات شهر ${period} بنجاح`);
      loadData();
      onUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل إغلاق حسابات الشهر";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReopen = async () => {
    if (!reopenTarget) return;
    if (!reopenReason.trim()) {
      toast.error("يرجى كتابة سبب إعادة فتح الشهر للتدقيق المحاسبي");
      return;
    }
    setReopening(true);
    try {
      await reopenMonthlySettlement(reopenTarget.id, { reason: reopenReason.trim() });
      toast.success(`تم إعادة فتح حساب شهر ${period} للتعديل بنجاح`);
      setReopenTarget(null);
      setReopenReason("");
      loadData();
      onUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل إعادة فتح الشهر";
      toast.error(msg);
    } finally {
      setReopening(false);
    }
  };

  const handleShareWhatsApp = (s: DentalMonthlySettlement) => {
    const phone = s.phone || "";
    if (!phone) {
      toast.error("لا يوجد رقم هاتف مسجل لهذا الطبيب");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `2${cleanPhone}` : cleanPhone;
    const text = [
      `مرحباً د. ${s.doctorName || "الكريم"}`,
      `تحية طيبة من إدارة معامل MaxP للأسنان.`,
      `إليك ملخص تقفيل المستحقات والحساب لشهر: *${s.periodKey}*`,
      `───────────────`,
      `[+] رصيد أول المدة المرحل: *${fmtMoney(s.openingBalance)} ج.م*`,
      `[+] أعمال وفواتير الشهر (+): *${fmtMoney(s.totalBilled)} ج.م* (${s.invoicesCount} فاتورة / ${s.casesCount} حالة)`,
      `[-] إجمالي المسدد خلال الشهر (-): *${fmtMoney(s.totalPaid)} ج.م*`,
      s.totalAdjustments > 0 ? `[-] خصومات وإشعارات دائنة (-): *${fmtMoney(s.totalAdjustments)} ج.م*` : null,
      `───────────────`,
      `*صافي الرصيد الختامي المستحق*: *${fmtMoney(s.closingBalance)} ج.م*`,
      `───────────────`,
      s.isClosed ? `تم اعتماد الحساب وتجميده بتاريخ: ${fmtDate(s.closedAt)}` : `تنبيه: هذه تسوية مبدئية غير معتمدة نهائياً`,
      `شكراً لتعاملكم ونسعد بخدمتكم دائماً.`,
    ].filter(Boolean).join("\n");

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-w-5xl my-4 sm:my-6 max-h-[92vh] flex flex-col p-3 sm:p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b dark:border-gray-800 mb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-xl">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>تقفيل المستحقات الشهرية وتجميد الأرصدة</span>
                <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900 font-mono">
                  {period}
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                تسوية فواتير ومسددات الشهر لكل طبيب، ترحيل رصيد أول المدة، وتجميد الحسابات للتدقيق المحاسبي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl mb-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-600 dark:text-gray-300">شهر التقفيل:</span>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
              <span className="font-semibold text-gray-600 dark:text-gray-300">الطبيب:</span>
              <select
                value={filterDoctorId}
                onChange={(e) => setFilterDoctorId(e.target.value)}
                className="flex-1 border dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">-- جميع الأطباء النشطين --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.clinicName ? `(${d.clinicName})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => loadData()}
              className="p-1.5 text-gray-500 hover:text-gray-700 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCloseAll}
              disabled={saving || loading || settlements.length === 0}
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-sm flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              <span>إغلاق واعتماد كافة الحسابات دفعة واحدة</span>
            </button>
          </div>
        </div>

        {/* Summary Metric Strip */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 text-xs tabular-nums">
            <div className="p-2.5 bg-blue-50/60 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl">
              <span className="text-gray-500 dark:text-gray-400 block text-[11px]">إجمالي فواتير الشهر</span>
              <p className="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-300 mt-0.5 font-mono">
                {fmtMoney(summary.totalBilled)} ج.م
              </p>
            </div>
            <div className="p-2.5 bg-green-50/60 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40 rounded-xl">
              <span className="text-green-700 dark:text-green-400 block text-[11px]">إجمالي المسدد</span>
              <p className="text-sm sm:text-base font-bold text-green-700 dark:text-green-400 mt-0.5 font-mono">
                {fmtMoney(summary.totalPaid)} ج.م
              </p>
            </div>
            <div className="p-2.5 bg-amber-50/60 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-xl">
              <span className="text-amber-700 dark:text-amber-400 block text-[11px]">إجمالي التسويات</span>
              <p className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-400 mt-0.5 font-mono">
                {fmtMoney(summary.totalAdjustments)} ج.م
              </p>
            </div>
            <div className="p-2.5 bg-red-50/60 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl">
              <span className="text-red-700 dark:text-red-400 block text-[11px]">صافي المديونية المرحلة</span>
              <p className="text-sm sm:text-base font-bold text-red-600 mt-0.5 font-mono">
                {fmtMoney(summary.totalClosingBalance)} ج.م
              </p>
            </div>
            <div className="p-2.5 bg-purple-50/60 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/40 rounded-xl col-span-2 sm:col-span-1">
              <span className="text-purple-700 dark:text-purple-400 block text-[11px]">نسبة الاعتماد للشهر</span>
              <p className="text-sm sm:text-base font-bold text-purple-700 dark:text-purple-300 mt-0.5 font-mono">
                {summary.closedCount} / {summary.totalDoctors} طبيب
              </p>
            </div>
          </div>
        )}

        {/* Table list */}
        <div className="flex-1 overflow-y-auto border dark:border-gray-800 rounded-xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs">جاري حساب المستحقات وترحيل الأرصدة...</p>
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              لم يتم العثور على أطباء أو بيانات لشهر {period}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right divide-y dark:divide-gray-800 tabular-nums">
                <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">الطبيب / العيادة</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">رصيد أول المدة</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">فواتير الشهر (+)</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">المسدد بالشهر (-)</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">التسويات (-)</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">الرصيد الختامي المرحل (=)</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">الحالة</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {settlements.map((s) => (
                    <tr key={s.doctorId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-gray-900 dark:text-gray-100">{s.doctorName}</div>
                        {s.clinicName && <div className="text-[11px] text-gray-400">{s.clinicName}</div>}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-700 dark:text-gray-300 font-mono">
                        {fmtMoney(s.openingBalance)} ج.م
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                          +{fmtMoney(s.totalBilled)} ج.م
                        </span>
                        <span className="block text-[10px] text-gray-400">
                          ({s.invoicesCount} فواتير / {s.casesCount} حالات)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-green-600 dark:text-green-400 font-mono">
                        -{fmtMoney(s.totalPaid)} ج.م
                      </td>
                      <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-mono">
                        {s.totalAdjustments > 0 ? `-${fmtMoney(s.totalAdjustments)} ج.م` : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-black text-sm text-red-600 dark:text-red-400 font-mono">
                          {fmtMoney(s.closingBalance)} ج.م
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {s.status === "CLOSED" ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                              <Lock className="w-3 h-3" />
                              <span>معتمد ومغلق</span>
                            </span>
                            {s.closedByName && (
                              <span className="block text-[9px] text-gray-400">{s.closedByName}</span>
                            )}
                          </div>
                        ) : s.status === "REOPENED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            <ShieldAlert className="w-3 h-3" />
                            <span>معاد فتحه</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            <span>مسودة أولية</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {s.status === "CLOSED" ? (
                            <button
                              onClick={() => {
                                setReopenTarget(s);
                                setReopenReason("");
                              }}
                              className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg"
                              title="إعادة فتح الشهر للتدقيق"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCloseSingle(s.doctorId, s.doctorName || "")}
                              disabled={saving}
                              className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                              title="تقفيل واعتماد الحساب وتجميده"
                            >
                              <Lock className="w-3 h-3" />
                              <span>تقفيل</span>
                            </button>
                          )}

                          <button
                            onClick={() => setVoucherSettlement(s)}
                            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg border dark:border-gray-700"
                            title="عرض وطباعة سند التقفيل"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {s.phone && (
                            <button
                              onClick={() => handleShareWhatsApp(s)}
                              className="p-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 rounded-lg"
                              title="مراسلة الطبيب بتفاصيل التقفيل عبر واتساب"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reopen Audit Modal */}
        {reopenTarget && (
          <div
            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-3"
            onClick={() => setReopenTarget(null)}
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-xl p-5 max-w-md w-full shadow-2xl border dark:border-gray-700 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-amber-600">
                <ShieldAlert className="w-5 h-5" />
                <h4 className="font-bold text-sm">إعادة فتح شهر {period} للتعديل المحاسبي</h4>
              </div>
              <p className="text-xs text-gray-500">
                أنت على وشك إلغاء تجميد حساب د. <strong>{reopenTarget.doctorName}</strong> لشهر {period}.
                يلزم تسجيل سبب إعادة الفتح لأغراض التدقيق المالي.
              </p>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  سبب إعادة الفتح *
                </label>
                <textarea
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="مثال: إضافة دفعة متأخرة أو تصحيح خصم بناءً على مراجعة الطبيب..."
                  className={MODAL_INPUT_CLS}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setReopenTarget(null)}
                  className="px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReopen}
                  disabled={reopening || !reopenReason.trim()}
                  className="px-4 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {reopening && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>تأكيد إعادة الفتح</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Voucher Preview & Print */}
        {voucherSettlement && (
          <DentalInvoiceSettlementVoucherModal
            settlement={voucherSettlement}
            onClose={() => setVoucherSettlement(null)}
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t dark:border-gray-800 mt-2">
          <span className="text-[11px] text-gray-400">
            * يتم ترحيل الرصيد الختامي آلياً كرصيد أول مدة لشهر القادم.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default DentalInvoiceMonthlySettlementModal;
