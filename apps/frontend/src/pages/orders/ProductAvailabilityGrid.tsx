import React from "react";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { useProductAvailabilityData } from "./availability/useProductAvailabilityData";
import { AvailabilityHeader } from "./availability/AvailabilityHeader";
import { AvailabilityStatsStrip } from "./availability/AvailabilityStatsStrip";
import { AvailabilityFilterBar } from "./availability/AvailabilityFilterBar";
import { AvailabilityTable } from "./availability/AvailabilityTable";
import { exportAvailabilityCsv } from "./availability/exportAvailabilityCsv";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

const ProductAvailabilityGrid: React.FC = () => {
  const {
    rows,
    loading,
    totalItems,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    preOrderFilter,
    setPreOrderFilter,
    trackFilter,
    setTrackFilter,
    stockFilter,
    setStockFilter,
    sortBy,
    sortDir,
    page,
    setPage,
    pageSize,
    setPageSize,
    savingKey,
    categories,
    filtered,
    paginated,
    totalPages,
    safePage,
    startIndex,
    stats,
    loadAll,
    toggleField,
    savePreOrderDate,
    changeSort,
    changePage,
  } = useProductAvailabilityData();

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* 1. Page Header */}
      <AvailabilityHeader
        onExportCsv={() => exportAvailabilityCsv(filtered)}
        onRefresh={loadAll}
        loading={loading}
      />

      {/* 2. KPI Telemetry Strip */}
      <AvailabilityStatsStrip
        totalItems={totalItems}
        preOrderOn={stats.preOrderOn}
        trackOn={stats.trackOn}
        outOfStock={stats.outOfStock}
        loading={loading}
      />

      {/* 3. Single-Surface Chassis: Filter & Table */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <AvailabilityFilterBar
          search={search}
          setSearch={setSearch}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          preOrderFilter={preOrderFilter}
          setPreOrderFilter={setPreOrderFilter}
          trackFilter={trackFilter}
          setTrackFilter={setTrackFilter}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          categories={categories}
          onResetPage={() => setPage(1)}
        />

        {/* Table & Pagination */}
        <ErrorBoundary>
          <AvailabilityTable
            loading={loading}
            paginated={paginated}
            filteredLength={filtered.length}
            startIndex={startIndex}
            pageSize={pageSize}
            setPageSize={setPageSize}
            page={page}
            safePage={safePage}
            totalPages={totalPages}
            changePage={changePage}
            sortBy={sortBy}
            sortDir={sortDir}
            changeSort={changeSort}
            savingKey={savingKey}
            toggleField={toggleField}
            savePreOrderDate={savePreOrderDate}
          />
        </ErrorBoundary>
      </div>

      {/* Subtle Hint */}
      <p className="mt-3 text-xs text-muted-foreground text-center font-mono">
        <CheckCircleIcon className="inline h-3.5 w-3.5 ml-1 text-primary" />
        <span>جدول تفاعلي: عدّل مفاتيح التتبع والطلب المسبق مباشرة من الجدول ويتم الحفظ تلقائياً</span>
      </p>
    </div>
  );
};

export default ProductAvailabilityGrid;