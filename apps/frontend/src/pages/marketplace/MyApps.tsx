import { useMyAppsData } from "./hooks/useMyAppsData";
import { MyAppsSkeleton } from "./components/my-apps/MyAppsSkeleton";
import { MyAppsHeader } from "./components/my-apps/MyAppsHeader";
import { MyAppsSpecialtyBanner } from "./components/my-apps/MyAppsSpecialtyBanner";
import { MyAppsTelemetryStrip } from "./components/my-apps/MyAppsTelemetryStrip";
import { MyAppsHubSwitcher } from "./components/my-apps/MyAppsHubSwitcher";
import { MyAppsFiltersBar } from "./components/my-apps/MyAppsFiltersBar";
import { MyAppsCategoryPills } from "./components/my-apps/MyAppsCategoryPills";
import { MyAppsEmptyState } from "./components/my-apps/MyAppsEmptyState";
import { MyAppsGrid } from "./components/my-apps/MyAppsGrid";
import { MyAppsTable } from "./components/my-apps/MyAppsTable";
import { MyAppDrawer } from "./components/my-apps/MyAppDrawer";
import { MyAppsUninstallModals } from "./components/my-apps/MyAppsUninstallModals";

export { APP_ROUTE_MAP, getAppDestination } from "./types/myAppsTypes";

export function MyApps() {
  const {
    user,
    recommendedHub,
    apps,
    loading,
    isRefreshing,
    fetchApps,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    selectedHub,
    setSelectedHub,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    uninstallingId,
    confirmUninstall,
    setConfirmUninstall,
    handleUninstall,
    selectedAppForDrawer,
    setSelectedAppForDrawer,
    selectedIds,
    toggleSelectApp,
    clearSelection,
    isAllVisibleSelected,
    toggleSelectAllVisible,
    confirmBulkUninstall,
    setConfirmBulkUninstall,
    isBulkDeleting,
    handleBulkUninstall,
    handleExportSelected,
    hubCounts,
    availableCategories,
    stats,
    filteredApps,
    resetFilters,
  } = useMyAppsData();

  if (loading) {
    return <MyAppsSkeleton />;
  }

  return (
    <div className="min-h-full bg-background" dir="rtl">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* 1. Header Section */}
        <MyAppsHeader
          totalCount={apps.length}
          isRefreshing={isRefreshing}
          onRefresh={() => fetchApps(true)}
        />

        {/* 2. Recommended Specialty Hub Callout */}
        {recommendedHub && (
          <MyAppsSpecialtyBanner
            recommendedHub={recommendedHub}
            specialtyNameAr={user?.company?.businessSpecialty?.nameAr}
            selectedHub={selectedHub}
            onToggleHub={(hubId) => {
              setSelectedHub(selectedHub === hubId ? "ALL" : hubId);
              setCategoryFilter("ALL");
            }}
          />
        )}

        {/* 3. Quick Stats KPI Bar */}
        <MyAppsTelemetryStrip
          stats={stats}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* 4. System Hubs Switcher */}
        <MyAppsHubSwitcher
          selectedHub={selectedHub}
          recommendedHub={recommendedHub}
          hubCounts={hubCounts}
          onSelectHub={(hubId) => {
            setSelectedHub(hubId);
            setCategoryFilter("ALL");
          }}
        />

        {/* 5. Search, Status Controls, Sort & View Mode */}
        <MyAppsFiltersBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          apps={apps}
          filteredCount={filteredApps.length}
          stats={stats}
          isAllVisibleSelected={isAllVisibleSelected}
          onToggleSelectAllVisible={toggleSelectAllVisible}
        />

        {/* 6. Subcategory Filter Pills */}
        <MyAppsCategoryPills
          availableCategories={availableCategories}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          selectedHub={selectedHub}
          apps={apps}
          hubCounts={hubCounts}
        />

        {/* 7. Main Content: Empty States or Grid/List */}
        {apps.length === 0 || filteredApps.length === 0 ? (
          <MyAppsEmptyState
            totalAppsCount={apps.length}
            selectedHub={selectedHub}
            hubCounts={hubCounts}
            onResetFilters={resetFilters}
          />
        ) : viewMode === "grid" ? (
          <MyAppsGrid
            apps={filteredApps}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectApp}
            onOpenDrawer={setSelectedAppForDrawer}
            onConfirmUninstall={setConfirmUninstall}
            uninstallingId={uninstallingId}
          />
        ) : (
          <MyAppsTable
            apps={filteredApps}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectApp}
            onOpenDrawer={setSelectedAppForDrawer}
            onConfirmUninstall={setConfirmUninstall}
            uninstallingId={uninstallingId}
          />
        )}
      </div>

      {/* App Details & Usage Drawer */}
      <MyAppDrawer
        selectedApp={selectedAppForDrawer}
        onClose={() => setSelectedAppForDrawer(null)}
        onConfirmUninstall={(app) => {
          setSelectedAppForDrawer(null);
          setConfirmUninstall(app);
        }}
      />

      {/* Modals & Floating Bulk Actions Bar */}
      <MyAppsUninstallModals
        confirmUninstall={confirmUninstall}
        onCancelUninstall={() => setConfirmUninstall(null)}
        onConfirmUninstall={handleUninstall}
        selectedIds={selectedIds}
        onExportSelected={handleExportSelected}
        onClearSelection={clearSelection}
        confirmBulkUninstall={confirmBulkUninstall}
        onSetConfirmBulkUninstall={setConfirmBulkUninstall}
        isBulkDeleting={isBulkDeleting}
        onConfirmBulkUninstall={handleBulkUninstall}
        apps={apps}
      />
    </div>
  );
}

export default MyApps;
