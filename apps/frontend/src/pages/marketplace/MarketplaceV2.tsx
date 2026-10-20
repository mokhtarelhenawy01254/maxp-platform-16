import React from "react";
import { SearchBar, SectionSkeleton } from "@/components/marketplace";
import { useMarketplaceV2Data } from "./hooks/useMarketplaceV2Data";
import { MarketplaceHubsBar } from "./components/marketplace-v2/MarketplaceHubsBar";
import { MarketplaceControlRow } from "./components/marketplace-v2/MarketplaceControlRow";
import { MarketplaceActiveFilterSummary } from "./components/marketplace-v2/MarketplaceActiveFilterSummary";
import { MarketplaceAppsGrid } from "./components/marketplace-v2/MarketplaceAppsGrid";
import { MarketplaceUninstallDialog } from "./components/marketplace-v2/MarketplaceUninstallDialog";

export default function MarketplaceV2() {
  const {
    t,
    apps,
    categories,
    loading,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priceFilter,
    displayCount,
    setDisplayCount,
    selectedSystemHub,
    setSelectedSystemHub,
    viewMode,
    handleSetViewMode,
    recommendedHub,
    activeHubDef,
    hubFiltered,
    filteredApps,
    displayedApps,
    hasMoreApps,
    availableCategories,
    categoryDisplay,
    sentinelRef,
    confirmUninstallApp,
    setConfirmUninstallApp,
    uninstallingApp,
    handleUninstall,
    handleCategorySelect,
    resetFilters,
  } = useMarketplaceV2Data();

  return (
    <div className="min-h-screen bg-background">
      {loading ? (
        <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 pt-6 pb-16">
          <div className="mt-8 space-y-6">
            <SectionSkeleton count={4} />
            <SectionSkeleton count={4} />
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-8 pb-16">
          {/* Top Header & Omni Filter Bar */}
          <div className="pt-4 pb-2">
            <MarketplaceHubsBar
              apps={apps}
              selectedSystemHub={selectedSystemHub}
              onSelectHub={(hubId) => {
                setSelectedSystemHub(hubId);
                setSelectedCategory("");
                setDisplayCount(20);
              }}
              recommendedHubId={recommendedHub?.id}
            />

            <MarketplaceControlRow
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={(f) => {
                setStatusFilter(f);
                setDisplayCount(20);
              }}
              appsCount={apps.length}
              installedAppsCount={apps.filter((a) => a.isInstalled).length}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              categories={categories}
              availableCategories={availableCategories}
              categoryDisplay={categoryDisplay}
              filteredAppsCount={filteredApps.length}
              hubFilteredCount={hubFiltered.length}
              activeHubNameAr={activeHubDef?.nameAr}
              selectedSystemHub={selectedSystemHub}
              viewMode={viewMode}
              onViewModeChange={handleSetViewMode}
            />

            <MarketplaceActiveFilterSummary
              filteredAppsCount={filteredApps.length}
              selectedSystemHub={selectedSystemHub}
              activeHubNameAr={activeHubDef?.nameAr}
              selectedCategory={selectedCategory}
              categories={categories}
              statusFilter={statusFilter}
              priceFilter={priceFilter}
              searchQuery={searchQuery}
              onClearHub={() => setSelectedSystemHub("ALL")}
              onClearCategory={() => setSelectedCategory("")}
              onClearStatus={() => setStatusFilter("ALL")}
              onClearSearch={() => setSearchQuery("")}
              onResetFilters={resetFilters}
            />
          </div>

          {/* Sticky Mobile SearchBar */}
          <div className="sticky top-14 z-30 bg-background pb-2 sm:hidden">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t("marketplace.searchPlaceholder", "ابحث عن التطبيقات، المميزات، أو الفئات...")}
            />
          </div>

          {/* Apps Presentation Matrix */}
          <MarketplaceAppsGrid
            displayedApps={displayedApps}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            viewMode={viewMode}
            hasMoreApps={hasMoreApps}
            sentinelRef={sentinelRef}
            onResetFilters={resetFilters}
          />
        </div>
      )}

      <MarketplaceUninstallDialog
        confirmUninstallApp={confirmUninstallApp}
        onClose={() => setConfirmUninstallApp(null)}
        onConfirm={handleUninstall}
        uninstallingApp={uninstallingApp}
      />
    </div>
  );
}
