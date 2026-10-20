import React from "react";
import {
  Loader2,
  Lock,
  MessageCircle,
  Printer,
  ShieldAlert,
  Unlock,
} from "lucide-react";
import {
  fmtMoney,
  type DentalMonthlySettlement,
} from "../../../../shared";

interface SettlementTableProps {
  settlements: DentalMonthlySettlement[];
  loading: boolean;
  period: string;
  saving: boolean;
  onCloseSingle: (docId: string, doctorName: string) => void;
  onOpenReopen: (settlement: DentalMonthlySettlement) => void;
  onOpenVoucher: (settlement: DentalMonthlySettlement) => void;
  onShareWhatsApp: (settlement: DentalMonthlySettlement) => void;
}

export const SettlementTable: React.FC<SettlementTableProps> = ({
  settlements,
  loading,
  period,
  saving,
  onCloseSingle,
  onOpenReopen,
  onOpenVoucher,
  onShareWhatsApp,
}) => {
  return (
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
                <th className="py-2.5 px-3 whitespace-nowrap">
                  الرصيد الختامي المرحل (=)
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">الحالة</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800 bg-white dark:bg-gray-900">
              {settlements.map((s) => (
                <tr
                  key={s.doctorId}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                      {s.doctorName}
                    </div>
                    {s.clinicName && (
                      <div className="text-[11px] text-gray-400">
                        {s.clinicName}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-gray-700 dark:text-gray-300 font-mono">
                    <span className="tabular-nums">{fmtMoney(s.openingBalance)}</span> ج.م
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                      +<span className="tabular-nums">{fmtMoney(s.totalBilled)}</span> ج.م
                    </span>
                    <span className="block text-[10px] text-gray-400">
                      (<span className="tabular-nums">{s.invoicesCount}</span> فواتير /{" "}
                      <span className="tabular-nums">{s.casesCount}</span> حالات)
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-green-600 dark:text-green-400 font-mono">
                    -<span className="tabular-nums">{fmtMoney(s.totalPaid)}</span> ج.م
                  </td>
                  <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-mono">
                    {s.totalAdjustments > 0 ? (
                      <span>
                        -<span className="tabular-nums">{fmtMoney(s.totalAdjustments)}</span> ج.م
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-black text-sm text-red-600 dark:text-red-400 font-mono">
                      <span className="tabular-nums">{fmtMoney(s.closingBalance)}</span> ج.م
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
                          <span className="block text-[9px] text-gray-400">
                            {s.closedByName}
                          </span>
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
                          type="button"
                          onClick={() => onOpenReopen(s)}
                          className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg"
                          title="إعادة فتح الشهر للتدقيق"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onCloseSingle(s.doctorId, s.doctorName || "")
                          }
                          disabled={saving}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                          title="تقفيل واعتماد الحساب وتجميده"
                        >
                          <Lock className="w-3 h-3" />
                          <span>تقفيل</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenVoucher(s)}
                        className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg border dark:border-gray-700"
                        title="عرض وطباعة سند التقفيل"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {s.phone && (
                        <button
                          type="button"
                          onClick={() => onShareWhatsApp(s)}
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
  );
};

export default SettlementTable;
