import React from "react";
import { useTranslation } from "react-i18next";
import { useAppHistoryData } from "./hooks/useAppHistoryData";
import { AppHistoryHeader } from "./components/history/AppHistoryHeader";
import { AppHistoryKpiCards } from "./components/history/AppHistoryKpiCards";
import { AppHistoryFilterBar } from "./components/history/AppHistoryFilterBar";
import { AppHistoryTable } from "./components/history/AppHistoryTable";
import { AppHistoryPagination } from "./components/history/AppHistoryPagination";

export const AppHistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language !== "en";

  const {
    logs,
    stats,
    loading,
    isRefreshing,
    search,
    actionFilter,
    page,
    totalPages,
    totalCount,
    setPage,
    fetchLogs,
    handleSearchChange,
    handleActionFilter,
  } = useAppHistoryData();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <AppHistoryHeader
          totalCount={totalCount}
          isRefreshing={isRefreshing}
          onRefresh={() => fetchLogs(true)}
          title={t("marketplace.historyTitle", "سجل حركات وتثبيت التطبيقات")}
          recordsText={t("marketplace.records", "عملية مسجلة")}
          subtitle={t(
            "marketplace.historySubtitle",
            "متابعة دقيقة لكل من قام بتثبيت أو تفعيل أو إلغاء تثبيت أي أداة في متجرك وحسابك.",
          )}
        />

        <AppHistoryKpiCards stats={stats} />

        <AppHistoryFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          actionFilter={actionFilter}
          onActionFilter={handleActionFilter}
          stats={stats}
        />

        <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden shadow-sm">
          <AppHistoryTable logs={logs} loading={loading} isRtl={isRtl} />

          <AppHistoryPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
};

export default AppHistoryPage;
