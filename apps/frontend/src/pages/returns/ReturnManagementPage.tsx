import React from "react";
import { Package, RefreshCw, Clock, CalendarDays } from "lucide-react";
import { useReturnManagementData } from "./hooks/useReturnManagementData";
import { ReturnRequestsTable } from "./components/ReturnRequestsTable";
import ReturnDetailsModal from "./ReturnDetailsModal";

const ReturnManagementPage: React.FC = () => {
  const {
    t,
    requests,
    loading,
    selectedRequest,
    setSelectedRequest,
    displayConfig,
    responsiblePartyLabel,
    orderStatusFilter,
    setOrderStatusFilter,
    searchTerm,
    setSearchTerm,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    orderStatuses,
    page,
    setPage,
    totalPages,
    total,
    reviewTab,
    handleReviewTabChange,
    fetchData,
    copyTracking,
  } = useReturnManagementData();

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      {/* Unified Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border/80 bg-muted/40 text-foreground">
            <Package className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {t("returns.k_140")}
              </h1>
              <span className="font-mono text-xs tabular-nums px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground bg-muted/30">
                {total}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {reviewTab === "pending"
                ? "طلبات الإرجاع التي لم تراجع بعد"
                : "طلبات الإرجاع التي تمت مراجعتها"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/80 bg-background/80 hover:bg-muted text-foreground transition active:scale-[0.98]"
            title={t("returns.k_20")}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Single-Surface Telemetry Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 dark:border-border/60 bg-card/60 backdrop-blur-xs divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/60 overflow-hidden shadow-2xs">
        <div className="p-3.5 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>إجمالي المرتجعات</span>
            <Package className="size-3.5 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
            {total}
          </p>
          <p className="text-[11px] text-muted-foreground">
            كافة طلبات المرتجعات المسجلة
          </p>
        </div>

        <div className="p-3.5 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-500" />
              بانتظار المراجعة
            </span>
            <Clock className="size-3.5 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
            {reviewTab === "pending" ? total : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            تحتاج اتخاذ قرار مالي أو إداري
          </p>
        </div>

        <div className="p-3.5 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              تمت المراجعة
            </span>
            <Package className="size-3.5 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
            {reviewTab === "reviewed" ? total : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            تم فحصها واعتماد التسوية
          </p>
        </div>

        <div className="p-3.5 sm:p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>الصفحة الحالية</span>
            <CalendarDays className="size-3.5 text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
            {page} / {totalPages}
          </p>
          <p className="text-[11px] text-muted-foreground">
            20 طلب في الصفحة
          </p>
        </div>
      </div>

      {/* Main Single Chassis: Integrated Ribbon + Table + Pagination */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card/40 backdrop-blur-xs overflow-hidden shadow-2xs">
        {/* Integrated Ribbon */}
        <div className="border-b border-border/70 p-3 sm:p-3.5 bg-muted/20 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            {/* Review Segmented Control */}
            <div className="inline-flex items-center gap-1 p-1 bg-background/80 border border-border/80 rounded-lg">
              <button
                type="button"
                onClick={() => handleReviewTabChange("pending")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition active:scale-[0.98] ${
                  reviewTab === "pending"
                    ? "bg-muted text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span>بانتظار المراجعة</span>
              </button>
              <button
                type="button"
                onClick={() => handleReviewTabChange("reviewed")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition active:scale-[0.98] ${
                  reviewTab === "reviewed"
                    ? "bg-muted text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>تمت المراجعة</span>
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {orderStatuses.length > 0 && (
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="h-8 px-2 text-xs border border-border/80 rounded-lg bg-background/80 text-foreground"
                >
                  <option value="">{t("returns.k_13")}</option>
                  {orderStatuses.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 w-28 px-2 text-xs border border-border/80 rounded-lg bg-background/80 text-foreground font-mono"
                  title={t("returns.k_150")}
                />
                <span>-</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 w-28 px-2 text-xs border border-border/80 rounded-lg bg-background/80 text-foreground font-mono"
                  title={t("returns.k_151")}
                />
              </div>

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("returns.k_19")}
                className="h-8 px-3 text-xs border border-border/80 rounded-lg bg-background/80 text-foreground placeholder-muted-foreground max-w-xs flex-1"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <ReturnRequestsTable
          requests={requests}
          loading={loading}
          displayConfig={displayConfig}
          responsiblePartyLabel={responsiblePartyLabel}
          copyTracking={copyTracking}
          onSelectRequest={setSelectedRequest}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          total={total}
          t={t}
        />
      </div>

      {/* Modal Integration */}
      {selectedRequest && (
        <ReturnDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
};

export default ReturnManagementPage;
