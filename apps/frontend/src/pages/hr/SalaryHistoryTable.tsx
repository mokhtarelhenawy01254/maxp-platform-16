import React from "react";
import { History, Loader2 } from "lucide-react";

interface SalaryHistoryTableProps {
  salaryHistory: any[];
  historyLoading: boolean;
}

export const SalaryHistoryTable: React.FC<SalaryHistoryTableProps> = ({
  salaryHistory,
  historyLoading,
}) => {
  return (
    <section className="p-3.5 sm:p-4 rounded-md border border-border/70 bg-card space-y-3">
      <div className="flex items-center gap-2 pb-2.5 border-b border-border/50 text-xs font-bold text-foreground">
        <History className="h-4 w-4 text-primary" />
        <span>سجل التعديلات السابقة للرواتب</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-start">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground">
              <th className="py-2 px-2.5 text-start font-semibold">الموظف</th>
              <th className="py-2 px-2.5 text-start font-semibold">الراتب السابق</th>
              <th className="py-2 px-2.5 text-start font-semibold">الراتب الجديد</th>
              <th className="py-2 px-2.5 text-start font-semibold">تاريخ السريان</th>
              <th className="py-2 px-2.5 text-start font-semibold">سبب التعديل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {historyLoading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري تحميل سجل التعديلات...</span>
                  </div>
                </td>
              </tr>
            ) : salaryHistory.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  لا توجد تعديلات رواتب سابقة مسجلة
                </td>
              </tr>
            ) : (
              salaryHistory.map((h: any) => (
                <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-2.5">
                    <div className="font-semibold text-foreground">
                      {h.employee
                        ? `${h.employee.firstName || ""} ${h.employee.lastName || ""}`
                        : h.userId || "-"}
                    </div>
                    {h.employee?.employeeNumber && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {h.employee.employeeNumber}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2.5 font-mono text-muted-foreground tabular-nums">
                    {Number(h.previousSalary || 0).toLocaleString()} ج.م
                  </td>
                  <td className="py-2 px-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                    {Number(h.newSalary || 0).toLocaleString()} ج.م
                  </td>
                  <td className="py-2 px-2.5 font-mono text-muted-foreground tabular-nums">
                    {h.effectiveDate
                      ? new Date(h.effectiveDate).toLocaleDateString("ar-EG")
                      : "-"}
                  </td>
                  <td className="py-2 px-2.5 text-muted-foreground max-w-xs truncate">
                    {h.reason || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
