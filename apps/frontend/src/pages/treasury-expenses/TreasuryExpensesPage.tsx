import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Receipt, Landmark, Loader2, ArrowUpRight, ShieldCheck } from "lucide-react";
import {
  TreasuryAccount,
  ExpenseCategory,
  fetchAccounts,
  fetchCategories,
  formatMoney,
} from "./shared";
import ExpensesTab from "./ExpensesTab";
import TreasuryCapitalTab from "./TreasuryCapitalTab";
import TabErrorBoundary from "../admin/OrderWorkflow/TabErrorBoundary";

export default function TreasuryExpensesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") === "treasury" ? "treasury" : "expenses";

  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [totalLiquidity, setTotalLiquidity] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadInitialData = useCallback(async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        fetchAccounts(),
        fetchCategories(),
      ]);
      const rawAccounts = accRes.accounts || [];
      const seenAccountKeys = new Set<string>();
      const uniqueAccounts: TreasuryAccount[] = [];
      for (const a of rawAccounts) {
        const key = `${a.name.trim().toLowerCase()}_${a.type}`;
        if (!seenAccountKeys.has(key)) {
          seenAccountKeys.add(key);
          uniqueAccounts.push(a);
        }
      }

      const rawCategories = catRes || [];
      const seenCatKeys = new Set<string>();
      const uniqueCategories: ExpenseCategory[] = [];
      for (const c of rawCategories) {
        const key = c.name.trim().toLowerCase();
        if (!seenCatKeys.has(key)) {
          seenCatKeys.add(key);
          uniqueCategories.push(c);
        }
      }

      setAccounts(uniqueAccounts);
      setTotalLiquidity(uniqueAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0));
      setCategories(uniqueCategories);
    } catch (err) {
      console.error("Failed to load treasury initial data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleTabChange = (tab: "expenses" | "treasury") => {
    setSearchParams({ tab });
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50/60 dark:bg-zinc-950 p-3 sm:p-5 lg:p-6 space-y-4" dir="rtl">
      {/* Unified Top Chassis Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Title & Total Liquidity Badge */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              إدارة النفقات والخزينة ورأس المال
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono">
              FinOps 2026
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            ربط محاسبي محكم بين المصروفات التشغيلية، الأصول، ورصيد الخزائن الفعلي
          </p>
        </div>

        {/* Global Quick Telemetry & Segmented Tab Switcher */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Liquidity Chip */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              totalLiquidity < 0
                ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60"
                : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                totalLiquidity < 0 ? "bg-red-500" : "bg-emerald-500"
              } animate-pulse`}
            />
            <span
              className={`text-xs font-medium ${
                totalLiquidity < 0
                  ? "text-red-800 dark:text-red-300"
                  : "text-emerald-800 dark:text-emerald-300"
              }`}
            >
              {totalLiquidity < 0 ? "عجز السيولة الإجمالي:" : "إجمالي السيولة:"}
            </span>
            <span
              className={`text-xs font-bold font-mono tabular-nums ${
                totalLiquidity < 0
                  ? "text-red-700 dark:text-red-300"
                  : "text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {formatMoney(totalLiquidity)}
            </span>
          </div>

          {/* Segmented Control */}
          <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
            <button
              onClick={() => handleTabChange("expenses")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentTab === "expenses"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-red-500" />
              <span>النفقات والمصروفات</span>
            </button>

            <button
              onClick={() => handleTabChange("treasury")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentTab === "treasury"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Landmark className="w-3.5 h-3.5 text-emerald-600" />
              <span>الخزنة ورأس المال</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-zinc-400 animate-spin" />
          <p className="text-xs font-medium text-zinc-500">جاري تهيئة الخزينة ودفاتر النفقات...</p>
        </div>
      ) : (
        <>
          {currentTab === "expenses" && (
            <TabErrorBoundary tabLabel="النفقات والمصروفات">
              <ExpensesTab
                accounts={accounts}
                categories={categories}
                onAccountsUpdated={loadInitialData}
                onCategoriesUpdated={loadInitialData}
              />
            </TabErrorBoundary>
          )}

          {currentTab === "treasury" && (
            <TabErrorBoundary tabLabel="الخزنة ورأس المال">
              <TreasuryCapitalTab
                accounts={accounts}
                categories={categories}
                onAccountsUpdated={loadInitialData}
                onCategoriesUpdated={loadInitialData}
              />
            </TabErrorBoundary>
          )}
        </>
      )}
    </div>
  );
}
