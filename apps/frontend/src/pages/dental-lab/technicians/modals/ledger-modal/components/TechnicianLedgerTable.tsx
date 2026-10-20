import { Loader2, Receipt, Trash2 } from "lucide-react";
import { fmtDate, fmtMoney, type DentalTechnicianPayout } from "../../../../shared";

interface TechnicianLedgerTableProps {
  loading: boolean;
  payouts: DentalTechnicianPayout[];
  deletingId: string | null;
  onDelete: (id: string) => void;
}

export function TechnicianLedgerTable({
  loading,
  payouts,
  deletingId,
  onDelete,
}: TechnicianLedgerTableProps) {
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
                      onClick={() => onDelete(p.id)}
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
  );
}
