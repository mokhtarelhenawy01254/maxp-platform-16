import React from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { TurboRecordsTopKpis } from "./turbo/TurboRecordsTopKpis";
import {
  TurboRecordsStatusPills,
  type StatusFilterOption,
} from "./turbo/TurboRecordsStatusPills";
import { TurboRecordsTable } from "./turbo/TurboRecordsTable";
import { useTurboRecordsData } from "./turbo/useTurboRecordsData";

export const TurboRecords: React.FC = () => {
  const { t } = useTranslation();
  const {
    orders,
    loading,
    refreshingStatuses,
    creatingShipments,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    filterType,
    totalPages,
    totalOrders,
    selectedOrders,
    updateUrlParams,
    handleSearchClick,
    handleFilterChange,
    toggleOrderSelection,
    toggleAllSelection,
    handleBulkCreateShipments,
    handleRefreshStatuses,
    getStatusCount,
  } = useTurboRecordsData();

  const filterOptions: StatusFilterOption[] = [
    {
      key: "all",
      label: t("orders.k_67"),
      color:
        "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
    },
    {
      key: "active",
      label: t("orders.k_66"),
      color:
        "border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 font-bold",
    },
    {
      key: "merchant_preparing",
      label: t("orders.k_68"),
      color:
        "border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200 font-bold",
    },
    {
      key: "preparing",
      label: t("orders.k_69"),
      color:
        "border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 font-semibold",
    },
    {
      key: "processing",
      label: t("orders.k_47"),
      color:
        "border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200",
    },
    {
      key: "out_for_delivery",
      label: t("orders.k_28"),
      color:
        "border-cyan-300 dark:border-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200",
    },
    {
      key: "delayed",
      label: t("orders.k_9"),
      color:
        "border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200",
    },
    {
      key: "delivered",
      label: t("orders.deliveredOrders"),
      color:
        "border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200",
    },
    {
      key: "remitted",
      label: t("orders.k_70"),
      color:
        "border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200",
    },
    {
      key: "returned_to_company",
      label: t("orders.k_18"),
      color:
        "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200",
    },
    {
      key: "returned_received",
      label: t("orders.k_72"),
      color:
        "border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200",
    },
    {
      key: "returned_to_customer",
      label: t("orders.k_73"),
      color:
        "border-fuchsia-300 dark:border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-200",
    },
    {
      key: "returned_resent",
      label: t("orders.k_20"),
      color:
        "border-sky-300 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200",
    },
    {
      key: "returned_missing",
      label: t("orders.k_21"),
      color:
        "border-rose-300 dark:border-rose-600 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200",
    },
    {
      key: "returned_destroyed",
      label: t("orders.k_22"),
      color:
        "border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900/30 text-stone-800 dark:text-stone-200",
    },
    {
      key: "cancelled",
      label: t("orders.k_15"),
      color:
        "border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300",
    },
    {
      key: "archived",
      label: t("orders.k_71"),
      color:
        "border-stone-400 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-300",
    },
  ];

  return (
    <div className="p-4 sm:p-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TruckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            {t("orders.turboRecordsTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("orders.k_41")}
          </p>
        </div>

        <div className="flex gap-2 mt-4 md:mt-0">
          <button
            onClick={handleRefreshStatuses}
            disabled={refreshingStatuses}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 cursor-pointer"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${refreshingStatuses ? "animate-spin" : ""}`}
            />
            {t("orders.turboRecordsUpdateStatus")}
          </button>

          <button
            onClick={handleBulkCreateShipments}
            disabled={creatingShipments || selectedOrders.length === 0}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-xs sm:text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            <TruckIcon className="h-4 w-4" />
            {t("orders.turboRecordsSendToTurbo")}
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <TurboRecordsTopKpis
        filterType={filterType}
        totalOrders={totalOrders}
        getStatusCount={getStatusCount}
        onFilterChange={handleFilterChange}
      />

      {/* Structured Status Category Pills */}
      <TurboRecordsStatusPills
        filterOptions={filterOptions}
        filterType={filterType}
        getStatusCount={getStatusCount}
        onFilterChange={handleFilterChange}
      />

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            {t("orders.k_32")}
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold font-mono">
            {filterOptions.find((f) => f.key === filterType)?.label ||
              filterType}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("orders.turboRecordsSearchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
              className="w-full pl-3 pr-9 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSearchClick}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium text-xs whitespace-nowrap"
          >
            {t("orders.search")}
          </button>
        </div>
      </div>

      {/* Main Table */}
      <TurboRecordsTable
        orders={orders}
        loading={loading}
        selectedOrders={selectedOrders}
        totalOrders={totalOrders}
        page={page}
        totalPages={totalPages}
        onToggleAll={toggleAllSelection}
        onToggleOrder={toggleOrderSelection}
        onPageChange={(newPage) => {
          setPage(newPage);
          updateUrlParams({ page: String(newPage) });
        }}
      />
    </div>
  );
};

export default TurboRecords;
