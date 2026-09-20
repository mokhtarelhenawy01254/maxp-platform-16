import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  Building2,
  Tag,
  TrendingDown,
  Layers,
  Laptop,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  CompanyExpense,
  TreasuryAccount,
  ExpenseCategory,
  ExpenseStats,
  fetchExpenses,
  fetchExpenseStats,
  deleteExpense,
  formatMoney,
} from "./shared";
import ExpenseModal from "./ExpenseModal";

interface ExpensesTabProps {
  accounts: TreasuryAccount[];
  categories: ExpenseCategory[];
  onAccountsUpdated: () => void;
}

export default function ExpensesTab({ accounts, categories, onAccountsUpdated }: ExpensesTabProps) {
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [treasuryAccountId, setTreasuryAccountId] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, statsRes] = await Promise.all([
        fetchExpenses({
          search: search || undefined,
          categoryId: categoryId || undefined,
          treasuryAccountId: treasuryAccountId || undefined,
          type: typeFilter || undefined,
          page,
          limit: 20,
        }),
        fetchExpenseStats(),
      ]);

      setExpenses(expRes.expenses);
      setTotalPages(expRes.totalPages);
      setTotalCount(expRes.totalCount);
      setStats(statsRes);
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, treasuryAccountId, typeFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string, number: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف النفقة [${number}]؟ سيتم استرداد المبلغ وإيداعه تلقائياً في الخزينة المصروف منها.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteExpense(id);
      await loadData();
      onAccountsUpdated();
    } catch (err: any) {
      alert(err?.response?.data?.message || "فشل حذف النفقة");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Telemetry Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Month Expenses */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-medium">نفقات الشهر الحالي</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatMoney(stats?.currentMonthTotal || 0)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <span>الشهر السابق: {formatMoney(stats?.lastMonthTotal || 0)}</span>
            {stats && stats.monthOverMonthDelta !== 0 && (
              <span className={`px-1 py-0.2 rounded font-mono ${stats.monthOverMonthDelta > 0 ? 'text-red-600 bg-red-50 dark:bg-red-950/40' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'}`}>
                {stats.monthOverMonthDelta > 0 ? `+${stats.monthOverMonthDelta}%` : `${stats.monthOverMonthDelta}%`}
              </span>
            )}
          </div>
        </div>

        {/* OPEX */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-medium">نفقات تشغيلية (OPEX)</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatMoney(stats?.opexTotal || 0)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">مرتبات، إيجار، كهرباء، إنترنت، بوفيه</p>
        </div>

        {/* CAPEX */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-medium">أصول ومعدات (CAPEX)</span>
            <Laptop className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 tabular-nums">
            {formatMoney(stats?.capexTotal || 0)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">أصول ثابتة تزيد من قيمة الشركة</p>
        </div>

        {/* Burn Rate & Runway */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-medium">معدل الصرف وفترة الصمود</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">Runway</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
            {stats?.runwayMonths || 0} <span className="text-xs font-normal text-zinc-500">شهر صمود</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            السيولة: {formatMoney(stats?.liquidCash || 0)}
          </p>
        </div>
      </div>

      {/* Control Bar: Filters & Action Button */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="بحث بالاسم أو المستفيد..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-1 focus:ring-zinc-900 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none"
          >
            <option value="">جميع التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Treasury Account Filter */}
          <select
            value={treasuryAccountId}
            onChange={(e) => { setTreasuryAccountId(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none"
          >
            <option value="">كافة الخزائن والحسابات</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* Type Filter */}
          <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-800/50 text-xs">
            <button
              onClick={() => { setTypeFilter(""); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg transition-all ${!typeFilter ? "bg-white dark:bg-zinc-700 font-semibold shadow-xs" : "text-zinc-500"}`}
            >
              الكل
            </button>
            <button
              onClick={() => { setTypeFilter("OPEX"); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg transition-all ${typeFilter === "OPEX" ? "bg-white dark:bg-zinc-700 font-semibold shadow-xs" : "text-zinc-500"}`}
            >
              تشغيلي (OPEX)
            </button>
            <button
              onClick={() => { setTypeFilter("CAPEX"); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg transition-all ${typeFilter === "CAPEX" ? "bg-white dark:bg-zinc-700 font-semibold shadow-xs" : "text-zinc-500"}`}
            >
              أصول (CAPEX)
            </button>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={loadData}
            title="تحديث البيانات"
            className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-zinc-900 dark:text-zinc-100' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-xl shadow-sm transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل نفقة جديدة</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 font-medium">
                <th className="py-3 px-4">رقم النفقة</th>
                <th className="py-3 px-4">البيان / النفقة</th>
                <th className="py-3 px-4">التصنيف والنوع</th>
                <th className="py-3 px-4">الخزينة المصروف منها</th>
                <th className="py-3 px-4">الجهة / المستفيد</th>
                <th className="py-3 px-4">تاريخ الصرف</th>
                <th className="py-3 px-4 text-left">المبلغ</th>
                <th className="py-3 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {loading && expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    جاري تحميل سجل النفقات...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">لا توجد نفقات مسجلة حتى الآن</p>
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        سجل أول نفقة للشركة الآن
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-zinc-600 dark:text-zinc-400">
                      {exp.expenseNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <span>{exp.title}</span>
                        {exp.isRecurring && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                            دوري
                          </span>
                        )}
                      </div>
                      {exp.invoiceNumber && (
                        <span className="text-[10px] text-zinc-400 font-mono block">فاتورة: #{exp.invoiceNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: exp.category?.color || "#94a3b8" }}
                        />
                        <span className="text-zinc-800 dark:text-zinc-200">
                          {exp.category?.name || "عام"}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          exp.type === "CAPEX"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}>
                          {exp.type === "CAPEX" ? "أصل CAPEX" : "OPEX"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{exp.treasuryAccount?.name || "خزينة"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                      {exp.beneficiary || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500 dark:text-zinc-400 text-[11px]">
                      {exp.paymentDate ? new Date(exp.paymentDate).toLocaleDateString("ar-EG") : "—"}
                    </td>
                    <td className="py-3 px-4 text-left font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm tabular-nums">
                      {formatMoney(exp.amount)}
                    </td>
                    <td className="py-3 px-3 text-left">
                      <button
                        onClick={() => handleDelete(exp.id, exp.expenseNumber)}
                        disabled={deletingId === exp.id}
                        title="حذف النفقة واسترداد الرصيد للخزينة"
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span>إجمالي النفقات: {totalCount}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 disabled:opacity-40"
              >
                السابق
              </button>
              <span className="px-2 font-mono">
                صفحة {page} من {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadData();
          onAccountsUpdated();
        }}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}
