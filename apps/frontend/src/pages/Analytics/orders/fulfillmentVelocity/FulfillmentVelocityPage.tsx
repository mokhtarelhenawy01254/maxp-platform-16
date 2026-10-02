import React from "react";
import { Calendar, RefreshCw, Users } from "lucide-react";
import { useFulfillmentVelocityData } from "./hooks/useFulfillmentVelocityData";
import { VelocityKpisStrip } from "./components/VelocityKpisStrip";
import { VintageDistributionCards } from "./components/VintageDistributionCards";
import { CreationCohortTable } from "./components/CreationCohortTable";
import { CohortOrdersDrawer } from "./components/CohortOrdersDrawer";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

interface FulfillmentVelocityPageProps {
  embedded?: boolean;
}

export const FulfillmentVelocityPage: React.FC<FulfillmentVelocityPageProps> = ({ embedded = false }) => {
  const {
    data,
    loading,
    error,
    targetDate,
    setTargetDate,
    refetch,
    drawerOpen,
    setDrawerOpen,
    drawerTitle,
    drawerOrders,
    drawerLoading,
    drawerPagination,
    loadCohortOrders,
  } = useFulfillmentVelocityData();

  const handleSelectBucket = (bucketKey: string, bucketLabel: string) => {
    void loadCohortOrders({
      vintageBucket: bucketKey,
      title: `طلبات شريحة: ${bucketLabel}`,
    });
  };

  const handleSelectCohortDate = (date: string) => {
    void loadCohortOrders({
      creationDate: date,
      title: `طلبات وارد تاريخ: ${date}`,
    });
  };

  const handleDrawerPageChange = (newPage: number) => {
    void loadCohortOrders({
      title: drawerTitle,
      page: newPage,
    });
  };

  const quickDates = [
    { label: "اليوم", val: daysAgo(0) },
    { label: "أمس", val: daysAgo(1) },
    { label: "أول أمس", val: daysAgo(2) },
    { label: "قبل 3 أيام", val: daysAgo(3) },
  ];

  return (
    <div className={`space-y-5 ${embedded ? "p-0" : "p-4 sm:p-6 max-w-7xl mx-auto"}`}>
      {/* Top Header & Date Control Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              سرعة الإنجاز وتوزيع أعمار الطلبات المشحونة
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            رصد الأوردرات التي تم العمل عليها وشحنها في يوم محدد، وتوزيعها بحسب تاريخ ورود كل طلب (Order Vintage)
          </p>
        </div>

        {/* Date Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick date pills */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {quickDates.map((q) => (
              <button
                key={q.val}
                type="button"
                onClick={() => setTargetDate(q.val)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                  targetDate === q.val
                    ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Date input */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent font-medium text-slate-700 outline-none dark:text-slate-200"
            />
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          <p className="text-sm font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 text-xs font-bold underline hover:no-underline"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : data ? (
        <div className="space-y-5">
          {/* 1. KPIs Summary Strip */}
          <VelocityKpisStrip kpis={data.kpis} />

          {/* 2. Vintage Distribution Buckets */}
          <VintageDistributionCards
            buckets={data.vintageBuckets}
            onSelectBucket={handleSelectBucket}
          />

          {/* 3. Detailed Creation Cohort Table */}
          <CreationCohortTable
            cohorts={data.cohorts}
            onSelectCohortDate={handleSelectCohortDate}
          />

          {/* 4. Team Breakdown Card (if team members exist) */}
          {data.teamBreakdown.length > 0 && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    إنتاجية الفريق في شحن هذه الدفعة (Team Vintage Split)
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  تفصيل من قام بشحن الطلبات الجديدة مقابل الطلبات القديمة المتراكمة
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {data.teamBreakdown.map((m) => (
                  <div
                    key={m.name}
                    className="flex flex-col justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {m.name}
                    </span>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="text-blue-600 font-semibold dark:text-blue-400">
                        {m.totalShipped} شحن
                      </span>
                      <span>
                        {m.freshOrders} جديد · {m.agedOrders} قديم
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Drill-down Drawer */}
      <CohortOrdersDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        orders={drawerOrders}
        loading={drawerLoading}
        pagination={drawerPagination}
        onPageChange={handleDrawerPageChange}
      />
    </div>
  );
};

export default FulfillmentVelocityPage;
