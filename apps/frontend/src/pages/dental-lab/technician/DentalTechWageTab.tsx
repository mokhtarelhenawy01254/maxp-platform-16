import React, { useState } from "react";
import { Wallet, Receipt, CheckCircle2 } from "lucide-react";
import { MyWage, fmtMoney, fmtDate } from "../shared";

interface DentalTechWageTabProps {
  wage: MyWage | null;
}

export const DentalTechWageTab: React.FC<DentalTechWageTabProps> = ({ wage }) => {
  const [ledgerSubTab, setLedgerSubTab] = useState<"STAGES" | "VOUCHERS">("STAGES");

  const recentStages = Array.isArray(wage?.recentStages) ? wage.recentStages : [];
  const payouts = Array.isArray(wage?.payouts) ? wage.payouts : [];

  return (
    <div className="space-y-4">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
          <span className="text-xs text-gray-500 block">إجمالي أجر المراحل المنجزة</span>
          <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {fmtMoney(wage?.totalEarned ?? 0)} <span className="text-xs text-gray-500">ج.م</span>
          </p>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
          <span className="text-xs text-gray-500 block">إجمالي ما تم صرفه لك (سندات)</span>
          <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {fmtMoney(wage?.totalPaid ?? 0)} <span className="text-xs text-gray-500">ج.م</span>
          </p>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
          <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold block">صافي الرصيد المستحق</span>
          <p className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">
            {fmtMoney(wage?.balance ?? 0)} <span className="text-xs">ج.م</span>
          </p>
        </div>
      </div>

      {/* Subtab Selector */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setLedgerSubTab("STAGES")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            ledgerSubTab === "STAGES"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
          }`}
        >
          سجل مراحل العمل المنجزة ({recentStages.length})
        </button>
        <button
          onClick={() => setLedgerSubTab("VOUCHERS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            ledgerSubTab === "VOUCHERS"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
          }`}
        >
          سندات الصرف والمدفوعات ({payouts.length})
        </button>
      </div>

      {/* SubTab Content */}
      {ledgerSubTab === "STAGES" ? (
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-3">تاريخ الإنجاز</th>
                  <th className="py-3 px-3">رقم الحالة</th>
                  <th className="py-3 px-3">المرحلة المنفذة</th>
                  <th className="py-3 px-3">نوع الشغل</th>
                  <th className="py-3 px-3">الطبيب</th>
                  <th className="py-3 px-3 text-left">الأجر المحسوب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentStages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">
                      لا توجد مراحل مسجلة باسمك بعد
                    </td>
                  </tr>
                ) : (
                  recentStages.map((st) => (
                    <tr key={st.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-2.5 px-3 text-gray-500">{fmtDate(st.completedAt)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">#{st.caseNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{st.stageName}</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{st.workTypeName || "—"}</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{st.doctorName || "—"}</td>
                      <td className="py-2.5 px-3 text-left font-bold text-emerald-600 dark:text-emerald-400">
                        +{fmtMoney(st.wageAmount)} ج.م
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-3">تاريخ الصرف</th>
                  <th className="py-3 px-3">المبلغ المصروف</th>
                  <th className="py-3 px-3">طريقة الصرف</th>
                  <th className="py-3 px-3">البيان والملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-400">
                      لا توجد سندات صرف مسجلة حتى الآن
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="py-2.5 px-3 text-gray-500">{fmtDate(p.createdAt)}</td>
                      <td className="py-2.5 px-3 font-bold text-amber-600 dark:text-amber-400">
                        -{fmtMoney(p.amount)} ج.م
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 font-medium">
                        {p.method === "CASH" ? "نقدي" : p.method === "BANK" ? "تحويل بنكي" : "محفظة إلكترونية"}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{p.notes || "سند صرف مستحقات"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DentalTechWageTab;
