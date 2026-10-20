import { Loader2 } from "lucide-react";
import { useStorefrontThemesData } from "./hooks/useStorefrontThemesData";
import { StorefrontThemesHeader } from "./components/storefront-themes/StorefrontThemesHeader";
import { StorefrontThemesToolbar } from "./components/storefront-themes/StorefrontThemesToolbar";
import { StorefrontThemesSubcategoryBar } from "./components/storefront-themes/StorefrontThemesSubcategoryBar";
import { StorefrontThemesGrid } from "./components/storefront-themes/StorefrontThemesGrid";
import { StorefrontThemesFooter } from "./components/storefront-themes/StorefrontThemesFooter";

export default function StorefrontThemes() {
  const {
    themes,
    filteredThemes,
    highlightedThemeId,
    highlightedTheme,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    wallet,
    loading,
    processingThemeId,
    displayCategoryGroups,
    selectedPrimaryCategoryId,
    selectedPrimaryCategory,
    selectedSecondaryCategoryId,
    addingCategory,
    setAddingCategory,
    newCategoryName,
    setNewCategoryName,
    handlePrimaryCategorySelect,
    handleSecondaryCategorySelect,
    handleAddCategory,
    handleRemoveCategory,
    handlePurchase,
    handleApply,
    handlePreview,
    handleCopyLink,
    clearAllFilters,
    navigate,
    searchParams,
    setSearchParams,
    t,
  } = useStorefrontThemesData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex items-center gap-3 text-indigo-500 font-black uppercase tracking-widest text-[10px]">
          <Loader2 className="size-4 animate-spin" />
          {t("storefrontThemes.loading")}
        </div>
      </div>
    );
  }

  const handleClearFocus = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("theme");
    setSearchParams(next, { replace: true });
  };

  return (
    <div
      className="min-h-screen -m-4 md:-m-6 bg-slate-50 dark:bg-slate-950/50 flex flex-col"
      dir="rtl"
    >
      <StorefrontThemesHeader
        wallet={wallet}
        onNavigateWallet={() => navigate("/billing/wallet")}
        onNavigateAgents={() => navigate("/marketplace/agents")}
        onNavigateCustomize={() => navigate("/settings/storefront/editor")}
        t={t}
      />

      <StorefrontThemesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        displayCategoryGroups={displayCategoryGroups}
        selectedPrimaryCategoryId={selectedPrimaryCategoryId}
        onPrimaryCategorySelect={handlePrimaryCategorySelect}
        onRemoveCategory={handleRemoveCategory}
        addingCategory={addingCategory}
        onStartAddCategory={() => setAddingCategory(true)}
        onCancelAddCategory={() => {
          setAddingCategory(false);
          setNewCategoryName("");
        }}
        newCategoryName={newCategoryName}
        onNewCategoryNameChange={setNewCategoryName}
        onConfirmAddCategory={handleAddCategory}
        t={t}
      />

      <StorefrontThemesSubcategoryBar
        selectedPrimaryCategory={selectedPrimaryCategory}
        selectedSecondaryCategoryId={selectedSecondaryCategoryId}
        onPrimaryCategorySelect={handlePrimaryCategorySelect}
        onSecondaryCategorySelect={handleSecondaryCategorySelect}
        t={t}
      />

      <StorefrontThemesGrid
        filteredThemes={filteredThemes}
        highlightedThemeId={highlightedThemeId}
        highlightedTheme={highlightedTheme}
        processingThemeId={processingThemeId}
        onPurchase={handlePurchase}
        onApply={handleApply}
        onPreview={handlePreview}
        onCopyLink={handleCopyLink}
        onCustomize={(id) => navigate(`/settings/storefront/editor?theme=${id}`)}
        onClearFocus={handleClearFocus}
        onResetFilters={clearAllFilters}
        t={t}
      />

      <StorefrontThemesFooter
        filteredCount={filteredThemes.length}
        totalCount={themes.length}
      />
    </div>
  );
}
