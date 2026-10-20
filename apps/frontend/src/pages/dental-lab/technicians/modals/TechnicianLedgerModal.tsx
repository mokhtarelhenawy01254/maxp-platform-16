import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Printer,
  Receipt,
  Trash2,
  X as XMarkIcon,
} from "lucide-react";
import {
  deleteTechnicianPayout,
  fetchTechnicianPayouts,
  fmtDate,
  fmtMoney,
  MODAL_CONTENT_CLS,
  type DentalTechnicianPayout,
  type TechnicianPayoutSummary,
} from "../../shared";
import type { LedgerModalProps } from "../types/technicianTypes";

export function TechnicianLedgerModal({
  tech,
  onClose,
  onAddPayout,
  onDataChanged,
}: LedgerModalProps) {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<DentalTechnicianPayout[]>([]);
  const [summary, setSummary] = useState<TechnicianPayoutSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchTechnicianPayouts(tech.id);
      setPayouts(res.payouts || []);
      setSummary(res.summary);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "حدث خطأ في تحميل كشف حساب الفني"
      );
    } finally {
      setLoading(false);
    }
  }, [tech.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (payoutId: string) => {
    if (
      !window.confirm(
        "هل أنت متأكد من حذف هذا السند المالي؟ سيتم تحديث رصيد الفني تلقائياً."
      )
    )
      return;
    setDeletingId(payoutId);
    try {
      await deleteTechnicianPayout(payoutId);
      toast.success("تم حذف السند بنجاح");
      await loadData();
      onDataChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ أثناء حذف السند");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case "PAYOUT":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            صرف مستحقات
          </span>
        );
      case "ADVANCE":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            سلفة نقدية
          </span>
        );
      case "BONUS":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            مكافأة أداء
          </span>
        );
      case "DEDUCTION":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
            خصم تالف/إعادة
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
            {type}
          </span>
        );
    }
  };

  const methodLabel: Record<string, string> = {
    CASH: "نقدي",
    BANK_TRANSFER: "تحويل بنكي",
    WALLET: "محفظة إلكترونية",
    CHECK: "شيك بنكي",
    OTHER: "أخرى",
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 print:p-0 print:bg-white print:static"
      onClick={onClose}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:max-w-none print:shadow-none print:border-none print:p-0`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-700 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-bold">كشف حساب وسجل مستحقات الفني</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {tech.name} — {tech.phone || "بدون هاتف"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة كشف الحساب
            </button>
            <button
              onClick={onAddPayout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              صرف جديد / سلفة
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Header */}
        <div className="hidden print:block mb-6 border-b pb-4 text-right" dir="rtl">
          <h2 className="text-2xl font-bold">سند كشف حساب فني معمل الأسنان</h2>
          <div className="grid grid-cols-2 gap-4 mt-3 text-sm text-gray-600">
            <div>
              <p>
                <span className="font-bold">اسم الفني:</span> {tech.name}
              </p>
              <p>
                <span className="font-bold">التخصص:</span> {tech.role}
              </p>
              <p>
                <span className="font-bold">الهاتف:</span> {tech.phone || "—"}
              </p>
            </div>
            <div className="text-left font-mono" dir="ltr">
              <p>
                <span className="font-bold">تاريخ الطباعة:</span>{" "}
                {new Date().toLocaleDateString("ar-EG")}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                أجر الإنتاج المكتسب
              </span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {fmtMoney(summary?.totalEarned ?? 0)} ج.م
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5 font-mono tabular-nums">
                {summary?.completedStages ?? 0} مرحلة ({summary?.completedUnits ?? 0} وحدة)
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                إجمالي ما صُرف للفني
              </span>
              <span className="text-base font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
                {fmtMoney(summary?.totalPaid ?? 0)} ج.م
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5 font-mono tabular-nums">
                سلف: {fmtMoney(summary?.totalAdvances ?? 0)} ج.م
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                المكافآت والحوافز
              </span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                +{fmtMoney(summary?.totalBonuses ?? 0)} ج.م
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                الخصومات والتوالف
              </span>
              <span className="text-base font-bold text-red-600 dark:text-red-400 font-mono tabular-nums">
                -{fmtMoney(summary?.totalDeductions ?? 0)} ج.م
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border-2 border-emerald-500/40 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block">
                صافي المستحق القائم
              </span>
              <span
                className={`text-lg font-bold block font-mono tabular-nums ${
                  Number(summary?.netDue ?? 0) > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {fmtMoney(summary?.netDue ?? 0)} ج.م
              </span>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-y-auto flex-1 p-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2.5">
            سجل الحركات وسندات الصرف
          </h4>
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              لا توجد سندات صرف أو حركات مسجلة لهذا الفني حتى الآن
            </div>
          ) : (
            <div className="overflow-x-auto border dark:border-gray-700 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 text-gray-500">
                    <th className="py-2.5 px-3 text-right">التاريخ</th>
                    <th className="py-2.5 px-3 text-right">نوع الحركة</th>
                    <th className="py-2.5 px-3 text-right">المبلغ</th>
                    <th className="py-2.5 px-3 text-right">طريقة الدفع</th>
                    <th className="py-2.5 px-3 text-right">المرجع</th>
                    <th className="py-2.5 px-3 text-right">البيان والملاحظات</th>
                    <th className="py-2.5 px-3 text-right">المدخل</th>
                    <th className="py-2.5 px-3 text-right print:hidden">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {payouts.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                        {fmtDate(p.paidAt)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {typeBadge(p.type)}
                      </td>
                      <td
                        className={`py-2.5 px-3 font-bold font-mono tabular-nums whitespace-nowrap ${
                          p.type === "DEDUCTION"
                            ? "text-red-600"
                            : p.type === "BONUS"
                            ? "text-blue-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {p.type === "DEDUCTION" ? "-" : "+"}
                        {fmtMoney(p.amount)} ج.م
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {methodLabel[p.paymentMethod] || p.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-gray-500 font-mono tabular-nums">
                        {p.reference || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                        {p.notes || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                        {p.createdByName || "الإدارة"}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap print:hidden">
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors disabled:opacity-40"
                          title="حذف السند"
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Printable Signature Footer */}
          <div className="hidden print:grid grid-cols-2 gap-8 mt-12 pt-8 border-t text-sm">
            <div className="text-right">
              <p className="font-bold">توقيع الفني المستلم:</p>
              <div className="mt-8 border-b border-dashed border-gray-400 w-48"></div>
            </div>
            <div className="text-left" dir="ltr">
              <p className="font-bold">توقيع الإدارة / الحسابات:</p>
              <div className="mt-8 border-b border-dashed border-gray-400 w-48 ml-auto"></div>
            </div>
          </div>
        </div>

        <div className="p-3 border-t dark:border-gray-700 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default TechnicianLedgerModal;
