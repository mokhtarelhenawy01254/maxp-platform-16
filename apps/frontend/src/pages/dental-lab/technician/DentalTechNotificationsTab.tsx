import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ListChecks, Receipt, AlertTriangle, ArrowRight } from "lucide-react";
import { MyCase, MyWage, fmtDate, fmtMoney } from "../shared";

interface DentalTechNotificationsTabProps {
  cases: MyCase[];
  overdueCases: MyCase[];
  wage: MyWage | null;
  onSelectCaseOnBench?: (caseNumber: string) => void;
}

export const DentalTechNotificationsTab: React.FC<DentalTechNotificationsTabProps> = ({
  cases,
  overdueCases,
  wage,
  onSelectCaseOnBench,
}) => {
  const safeCases = Array.isArray(cases) ? cases : [];
  const safeOverdue = Array.isArray(overdueCases) ? overdueCases : [];
  const safePayouts = Array.isArray(wage?.payouts) ? wage.payouts : [];

  const getOverdueDays = (c: MyCase) => {
    if (!c.dueDate) return 0;
    const diff = Date.now() - new Date(c.dueDate).getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
            تنبيهات وإشعارات العمل المباشرة
          </h3>
          <p className="text-xs text-gray-500">
            متابعة الحالات المتأخرة، الحالات المسندة حديثاً، وسندات الصرف المقيدة لحسابك
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. Overdue Cases Alerts */}
        {safeOverdue.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>حالات متأخرة عن موعد التسليم المقرر ({safeOverdue.length})</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {safeOverdue.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-900 dark:text-rose-200">#{c.caseNumber}</span>
                      <span className="font-semibold text-rose-700">{c.workTypeName}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                      الطبيب: {c.doctorName || "—"} | متأخرة منذ {getOverdueDays(c)} يوم
                    </p>
                  </div>
                  <Link
                    to={`/dental-lab/cases/${c.id}`}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shrink-0 shadow-xs"
                  >
                    عرض الحالة
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <span>🎉 ممتاز! لا توجد أي حالات متأخرة عن موعدها المحدد حالياً.</span>
          </div>
        )}

        {/* 2. New Assignments */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <ListChecks className="w-4 h-4 text-blue-600" />
            <span>الحالات قيد التنفيذ بمحطتك ({safeCases.length})</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {safeCases.slice(0, 6).map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-3 text-xs shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">#{c.caseNumber}</span>
                    <span className="text-gray-700 dark:text-gray-300">{c.workTypeName}</span>
                  </div>
                  <p className="text-gray-500 mt-0.5">
                    المرحلة: <b>{c.activeStageName || c.status}</b> | استحقاق: {fmtDate(c.dueDate)}
                  </p>
                </div>
                {onSelectCaseOnBench ? (
                  <button
                    onClick={() => onSelectCaseOnBench(c.caseNumber || "")}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold shrink-0"
                  >
                    فتح بالطاولة
                  </button>
                ) : (
                  <Link
                    to={`/dental-lab/cases/${c.id}`}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold shrink-0"
                  >
                    التفاصيل
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 3. Recent Payout Vouchers */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-amber-600" />
            <span>آخر سندات الصرف المقيدة ({safePayouts.length})</span>
          </h4>
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
            {safePayouts.length === 0 ? (
              <p className="p-4 text-xs text-gray-400 text-center">لا توجد سندات صرف بعد</p>
            ) : (
              safePayouts.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="p-3 border-b last:border-0 border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      سند صرف: <span className="text-amber-600">{fmtMoney(p.amount)} ج.م</span>
                    </p>
                    <p className="text-gray-500 text-[11px]">{p.notes || "صرف مستحقات إنتاج معمل الأسنان"}</p>
                  </div>
                  <span className="text-gray-400 text-[11px]">{fmtDate(p.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DentalTechNotificationsTab;
