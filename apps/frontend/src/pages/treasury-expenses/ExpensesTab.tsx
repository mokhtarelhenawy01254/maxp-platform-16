import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Calendar,
  Building2,
  TrendingDown,
  Layers,
  Laptop,
  AlertCircle,
  RefreshCw,
  Download,
  ExternalLink,
  Tag,
  Paperclip,
  CheckCircle2,
  Clock,
  X,
  AlertTriangle,
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
  exportToCsv,
} from "./shared";
import ExpenseModal from "./ExpenseModal";
import CategoryModal from "./CategoryModal";
import { toast } from "sonner";

interface ExpensesTabProps {
  accounts: TreasuryAccount[];
  categories: ExpenseCategory[];
  onAccountsUpdated: () => void;
  onCategoriesUpdated?: () => void;
}

type DatePreset = "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM";

export default function ExpensesTab({
  accounts,
  categories,
  onAccountsUpdated,
  onCategoriesUpdated,
}: ExpensesTabProps) {
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals & Editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CompanyExpense | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<CompanyExpense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [treasuryAccountId, setTreasuryAccountId] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("THIS_MONTH");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Date Preset handler
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);
    const now = new Date();
    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      const today = now.toISOString().split("T")[0];
      setStartDate(today);
      setEndDate(today);
    } else if (preset === "THIS_WEEK") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      setStartDate(weekStart.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "THIS_MONTH") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(monthStart.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, statsRes] = await Promise.all([
        fetchExpenses({
          search: search || undefined,
          categoryId: categoryId || undefined,
          treasuryAccountId: treasuryAccountId || undefined,
          type: typeFilter || undefined,
          status: statusFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit: 25,
        }),
        fetchExpenseStats(),
      ]);

      setExpenses(expRes.expenses);
      setTotalPages(expRes.totalPages);
      setTotalCount(expRes.totalCount);
      setStats(statsRes);
    } catch (err) {
      console.error("Failed to load expenses:", err);
      toast.error("فشل تحميل سجل النفقات");
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, treasuryAccountId, typeFilter, statusFilter, startDate, endDate, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await deleteExpense(deleteTarget.id);
      toast.success(`تم حذف النفقة [${deleteTarget.expenseNumber}] وإعادة رصيدها للخزينة بنجاح`);
      setDeleteTarget(null);
      await loadData();
      onAccountsUpdated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "فشل حذف النفقة");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    if (expenses.length === 0) {
      toast.error("لا توجد نفقات للتصدير");
      return;
    }

    const rows = expenses.map((e) => ({
      expenseNumber: e.expenseNumber,
      title: e.title,
      amount: e.amount,
      category: e.category?.name || "عام",
      type: e.type === "CAPEX" ? "رأسمالي (CAPEX)" : "تشغيلي (OPEX)",
      account: e.treasuryAccount?.name || "",
      beneficiary: e.beneficiary || "",
      invoiceNumber: e.invoiceNumber || "",
      status: e.status === "PAID" ? "مدفوع ومخصوم" : "معلق / مستحق",
      paymentDate: e.paymentDate ? new Date(e.paymentDate).toLocaleDateString("ar-EG") : "",
      notes: e.notes || "",
    }));

    const headers = [
      { key: "expenseNumber", label: "رقم النفقة" },
      { key: "title", label: "البيان" },
      { key: "amount", label: "المبلغ (ج.م)" },
      { key: "category", label: "التصنيف" },
      { key: "type", label: "النوع" },
      { key: "account", label: "الخزينة المصروف منها" },
      { key: "beneficiary", label: "المستفيد" },
      { key: "invoiceNumber", label: "رقم الفاتورة" },
      { key: "status", label: "الحالة" },
      { key: "paymentDate", label: "تاريخ الصرف" },
      { key: "notes", label: "الملاحظات" },
    ];

    exportToCsv(`expenses_${new Date().toISOString().split("T")[0]}`, rows, headers);
    toast.success("تم تصدير ملف النفقات بنجاح");
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
              <span
                className={`px-1 py-0.2 rounded font-mono ${
                  stats.monthOverMonthDelta > 0
                    ? "text-red-600 bg-red-50 dark:bg-red-950/40"
                    : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                }`}
              >
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
          <p className="text-[11px] text-zinc-500 mt-1">أصول ثابتة تزيد من القيمة الرأسمالية</p>
        </div>

        {/* Burn Rate & Runway */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-medium">معدل الصرف وفترة الصمود</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              Runway
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
            {stats?.runwayMonths || 0} <span className="text-xs font-normal text-zinc-500">شهر صمود</span>
          </div>
          <p className={`text-[11px] mt-1 ${stats && stats.liquidCash < 0 ? "text-red-500 font-medium" : "text-zinc-500"}`}>
            السيولة المتاحة: {formatMoney(stats?.liquidCash || 0)} {stats && stats.liquidCash < 0 ? "(عجز سيولة)" : ""}
          </p>
        </div>
      </div>

      {/* Control Bar: Filters, Date Presets & Action Buttons */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        {/* Row 1: Primary Inputs & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="بحث بالاسم أو المستفيد أو رقم الفاتورة..."
                className="w-full pl-3 pr-9 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              />
            </div>

            {/* Date Preset Segmented Control */}
            <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-800/50 text-xs">
              {(["THIS_MONTH", "THIS_WEEK", "TODAY", "ALL", "CUSTOM"] as DatePreset[]).map((p) => {
                const labels: Record<DatePreset, string> = {
                  THIS_MONTH: "هذا الشهر",
                  THIS_WEEK: "هذا الأسبوع",
                  TODAY: "اليوم",
                  ALL: "الكل",
                  CUSTOM: "مخصص",
                };
                return (
                  <button
                    key={p}
                    onClick={() => handlePresetChange(p)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      datePreset === p ? "bg-white dark:bg-zinc-700 font-semibold shadow-xs text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                    }`}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              title="تصدير إلى ملف CSV / Excel"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </button>

            <button
              onClick={() => setIsCategoryModalOpen(true)}
              title="إدارة وإضافة تصنيفات النفقات"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <Tag className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">التصنيفات</span>
            </button>

            <button
              onClick={loadData}
              title="تحديث البيانات"
              className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-zinc-900 dark:text-zinc-100" : ""}`} />
            </button>

            <button
              onClick={() => {
                setEditingExpense(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-xl shadow-sm transition-all active:scale-[0.97]"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل نفقة جديدة</span>
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns & Custom Date Range */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          {/* Category Filter */}
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none"
          >
            <option value="">جميع التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Treasury Account Filter */}
          <select
            value={treasuryAccountId}
            onChange={(e) => {
              setTreasuryAccountId(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none"
          >
            <option value="">كافة الخزائن والحسابات</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none"
          >
            <option value="">كافة الحالات</option>
            <option value="PAID">مدفوع ومخصوم (PAID)</option>
            <option value="PENDING">معلق / مستحق (PENDING)</option>
          </select>

          {/* Type Filter */}
          <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-800/50 text-xs">
            <button
              onClick={() => {
                setTypeFilter("");
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded-lg transition-all ${!typeFilter ? "bg-white dark:bg-zinc-700 font-semibold shadow-xs" : "text-zinc-500"}`}
            >
              الكل
            </button>
            <button
              onClick={() => {
                setTypeFilter("OPEX");
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded-lg transition-all ${typeFilter === "OPEX" ? "bg-white dark:bg-zinc-700 font-semibold shadow-xs" : "text-zinc-500"}`}
            >
              OPEX
            </button>
            <button
              onClick={() => {
                setTypeFilter("CAPEX");
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded-lg transition-all ${typeFilter === "CAPEX" ? "bg-white dark:bg-zinc-700 font-semibold shadow-xs" : "text-zinc-500"}`}
            >
              CAPEX
            </button>
          </div>

          {/* Custom Date Inputs if CUSTOM is selected */}
          {datePreset === "CUSTOM" && (
            <div className="flex items-center gap-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/40 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <span className="text-zinc-400 px-1">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-0.5 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg text-xs"
              />
              <span className="text-zinc-400 px-1">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-0.5 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg text-xs"
              />
            </div>
          )}
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
                <th className="py-3 px-4">المستفيد / الفاتورة</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">تاريخ الصرف</th>
                <th className="py-3 px-4 text-left">المبلغ</th>
                <th className="py-3 px-3 w-20 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {loading && expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    جاري تحميل سجل النفقات...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        لا توجد نفقات مطابقة للفلاتر المحددة
                      </p>
                      <button
                        onClick={() => {
                          setEditingExpense(null);
                          setIsModalOpen(true);
                        }}
                        className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        سجل نفقة جديدة الآن
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
                      {exp.notes && (
                        <span className="text-[11px] text-zinc-400 font-normal truncate block max-w-xs">{exp.notes}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: exp.category?.color || "#94a3b8" }}
                        />
                        <span className="text-zinc-800 dark:text-zinc-200">{exp.category?.name || "عام"}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            exp.type === "CAPEX"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {exp.type === "CAPEX" ? "CAPEX" : "OPEX"}
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
                      <div>{exp.beneficiary || "—"}</div>
                      {exp.invoiceNumber && (
                        <div className="text-[10px] text-zinc-400 font-mono">فاتورة: #{exp.invoiceNumber}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          exp.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {exp.status === "PAID" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>مخصوم</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>معلق</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500 dark:text-zinc-400 text-[11px]">
                      {exp.paymentDate ? new Date(exp.paymentDate).toLocaleDateString("ar-EG") : "—"}
                    </td>
                    <td className="py-3 px-4 text-left font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm tabular-nums">
                      {formatMoney(exp.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {exp.receiptUrl && (
                          <button
                            onClick={() => setPreviewReceiptUrl(exp.receiptUrl!)}
                            title="معاينة إيصال / فاتورة النفقة"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingExpense(exp);
                            setIsModalOpen(true);
                          }}
                          title="تعديل النفقة"
                          className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(exp)}
                          title="حذف النفقة واسترداد الرصيد للخزينة"
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      {/* Expense Modal (Create & Edit) */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        onSuccess={() => {
          loadData();
          onAccountsUpdated();
        }}
        accounts={accounts}
        categories={categories}
        expense={editingExpense}
        onCategoryCreated={() => {
          onCategoriesUpdated?.();
          loadData();
        }}
      />

      {/* Category Manager Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={() => {
          onCategoriesUpdated?.();
          loadData();
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 border border-red-200 dark:border-red-900/60 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">تأكيد حذف النفقة</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  هل أنت متأكد من حذف النفقة <span className="font-mono font-bold">[{deleteTarget.expenseNumber}]</span> بمبلغ{" "}
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{formatMoney(deleteTarget.amount)}</span>؟
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  سيتم استرداد المبلغ وإيداعه تلقائياً في الخزينة المصروف منها.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm active:scale-[0.98] disabled:opacity-50"
              >
                {deleting ? "جاري الحذف..." : "تأكيد الحذف والاسترداد"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {previewReceiptUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPreviewReceiptUrl(null)}
          dir="rtl"
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-500" />
                معاينة إيصال / فاتورة النفقة
              </h4>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl">
              <img
                src={previewReceiptUrl}
                alt="Receipt Preview"
                className="max-h-[60vh] object-contain rounded-lg"
              />
            </div>

            <div className="flex justify-end pt-2">
              <a
                href={previewReceiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:underline"
              >
                <span>فتح في نافذة منفصلة</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
