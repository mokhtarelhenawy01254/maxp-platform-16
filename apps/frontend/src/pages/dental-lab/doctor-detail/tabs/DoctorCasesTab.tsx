import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Eye, Layers, Loader2, Search } from "lucide-react";
import {
  CASE_STATUS_MAP,
  fmtDate,
  fmtMoney,
  MODAL_INPUT_CLS,
  PRIORITY_CONFIG,
} from "../../shared";
import type { DoctorCasesTabProps } from "../types/doctorDetailTypes";

export function DoctorCasesTab({
  cases,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenQuickOrder,
}: DoctorCasesTabProps) {
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) {
        if (statusFilter === "OVERDUE") {
          const isOverdue =
            c.dueDate &&
            new Date(c.dueDate) < new Date() &&
            c.status !== "DELIVERED" &&
            c.status !== "CLOSED";
          if (!isOverdue) return false;
        } else {
          return false;
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const num = (c.caseNumber || "").toLowerCase();
        const pName = (c.patientName || "").toLowerCase();
        const wName = (c.workTypeName || "").toLowerCase();
        if (!num.includes(q) && !pName.includes(q) && !wName.includes(q)) return false;
      }
      return true;
    });
  }, [cases, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Search and Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border dark:border-gray-700">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input
            className={`${MODAL_INPUT_CLS} pr-9 text-sm`}
            placeholder="ابحث باسم المريض، رقم الحالة، نوع الشغل..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: "ALL", label: "الكل" },
            { id: "IN_PROGRESS", label: "قيد التشغيل" },
            { id: "READY", label: "جاهزة للتسليم" },
            { id: "DELIVERED", label: "تم التسليم" },
            { id: "OVERDUE", label: "المتأخرة" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => onStatusFilterChange(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all min-h-[36px] ${
                statusFilter === f.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          <Layers className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 font-medium">لا توجد حالات مسجلة لهذا الطبيب بالمعايير الحالية</p>
          <button
            onClick={onOpenQuickOrder}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            تسجيل أول حالة الآن
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-b dark:border-gray-700 text-right">
                  <th className="py-3 px-3.5">رقم الحالة</th>
                  <th className="py-3 px-3.5">المريض</th>
                  <th className="py-3 px-3.5">نوع الشغل</th>
                  <th className="py-3 px-3.5">اللون / الأسنان</th>
                  <th className="py-3 px-3.5">الحالة</th>
                  <th className="py-3 px-3.5">الأولوية</th>
                  <th className="py-3 px-3.5">الاستحقاق</th>
                  <th className="py-3 px-3.5">السعر</th>
                  <th className="py-3 px-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredCases.map((c) => {
                  const st = CASE_STATUS_MAP[c.status as keyof typeof CASE_STATUS_MAP] || {
                    label: c.status,
                    color: "bg-gray-100 text-gray-700",
                  };
                  const pr = PRIORITY_CONFIG[c.priority as keyof typeof PRIORITY_CONFIG] || {
                    label: c.priority,
                    color: "bg-gray-100 text-gray-700",
                  };
                  const isOverdue =
                    c.dueDate &&
                    new Date(c.dueDate) < new Date() &&
                    c.status !== "DELIVERED" &&
                    c.status !== "CLOSED";

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-3 px-3.5 font-bold font-mono">
                        <Link
                          to={`/dental-lab/cases/${c.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>{c.caseNumber}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-3.5">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{c.patientName}</p>
                        {c.patientPhone && (
                          <p className="text-xs text-gray-400 font-mono" dir="ltr">
                            {c.patientPhone}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-medium">{c.workTypeName || "—"}</td>
                      <td className="py-3 px-3.5 text-xs text-gray-500 font-mono">
                        {c.shade ? <span className="font-semibold">{c.shade}</span> : "—"}
                        {c.teeth && <span className="mr-1 text-gray-400">({c.teeth})</span>}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${pr.color}`}>
                          {pr.label}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-xs font-mono tabular-nums">
                        <span className={isOverdue ? "text-red-600 font-bold" : "text-gray-600 dark:text-gray-300"}>
                          {fmtDate(c.dueDate)}
                        </span>
                        {isOverdue && <span className="mr-1 text-[10px] text-red-500 block font-sans">متأخر</span>}
                      </td>
                      <td className="py-3 px-3.5 font-semibold font-mono tabular-nums">
                        {fmtMoney(c.priceSnapshot ?? 0)} ج.م
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <Link
                          to={`/dental-lab/cases/${c.id}`}
                          className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="فتح تفاصيل الحالة"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorCasesTab;
