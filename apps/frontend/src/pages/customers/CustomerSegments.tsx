import React from "react";
import {
  useCustomerSegmentsController,
  CustomerSegmentsHeader,
  CustomerSegmentsNav,
  CustomerSegmentsOverviewTab,
  CustomerSegmentsQualityTab,
  CustomerSegmentsLoyaltyTab,
  CustomerSegmentsCategoriesTab,
  CustomerSegmentsTagsTab,
} from "./components/customer-segments";

export * from "./components/customer-segments/types";

export const CustomerSegments: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    loading,
    qualityData,
    loyaltyRecords,
    loyaltyTiers,
    categories,
    tags,
    catLoading,
    catError,
    tagsLoading,
    searchQuery,
    setSearchQuery,
    filterQuality,
    setFilterQuality,
    filterLoyalty,
    setFilterLoyalty,
    filterRating,
    setFilterRating,
    selectedCustomerId,
    setSelectedCustomerId,
    filteredCustomers,
    selectedCustomer,
    stats,
    showCatForm,
    setShowCatForm,
    editingCat,
    catName,
    setCatName,
    catColor,
    setCatColor,
    catAutoFollowUp,
    setCatAutoFollowUp,
    catTriggerFlowId,
    setCatTriggerFlowId,
    catSaving,
    flows,
    resetCatForm,
    openEditCat,
    handleSaveCategory,
    handleDeleteCategory,
    renamingTag,
    setRenamingTag,
    newTagName,
    setNewTagName,
    tagActionLoading,
    handleRenameTag,
    handleDeleteTag,
    fetchAll,
  } = useCustomerSegmentsController();

  if (loading && activeTab !== "categories" && activeTab !== "tags") {
    return (
      <div className="space-y-6">
        <CustomerSegmentsHeader onRefresh={() => void fetchAll()} />
        <CustomerSegmentsNav activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <CustomerSegmentsHeader onRefresh={() => void fetchAll()} />

      {/* Tabs Nav */}
      <CustomerSegmentsNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* TAB: Overview */}
      {activeTab === "overview" && (
        <CustomerSegmentsOverviewTab
          stats={stats}
          qualityData={qualityData}
          loyaltyTiers={loyaltyTiers}
          filteredCustomers={filteredCustomers}
          selectedCustomer={selectedCustomer}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={setSelectedCustomerId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterQuality={filterQuality}
          onFilterQualityChange={setFilterQuality}
          filterLoyalty={filterLoyalty}
          onFilterLoyaltyChange={setFilterLoyalty}
          filterRating={filterRating}
          onFilterRatingChange={setFilterRating}
          onTabChange={setActiveTab}
        />
      )}

      {/* TAB: Quality */}
      {activeTab === "quality" && (
        <CustomerSegmentsQualityTab
          stats={stats}
          qualityData={qualityData}
          filterQuality={filterQuality}
        />
      )}

      {/* TAB: Loyalty */}
      {activeTab === "loyalty" && (
        <CustomerSegmentsLoyaltyTab
          stats={stats}
          loyaltyTiers={loyaltyTiers}
          loyaltyRecords={loyaltyRecords}
        />
      )}

      {/* TAB: Categories */}
      {activeTab === "categories" && (
        <CustomerSegmentsCategoriesTab
          categories={categories}
          catLoading={catLoading}
          catError={catError}
          showCatForm={showCatForm}
          onOpenCreate={() => {
            resetCatForm();
            setShowCatForm(true);
          }}
          onCloseForm={resetCatForm}
          editingCat={editingCat}
          catName={catName}
          onCatNameChange={setCatName}
          catColor={catColor}
          onCatColorChange={setCatColor}
          catAutoFollowUp={catAutoFollowUp}
          onCatAutoFollowUpChange={setCatAutoFollowUp}
          catTriggerFlowId={catTriggerFlowId}
          onCatTriggerFlowIdChange={setCatTriggerFlowId}
          catSaving={catSaving}
          flows={flows}
          onSaveCategory={() => void handleSaveCategory()}
          onEditCategory={openEditCat}
          onDeleteCategory={(id) => void handleDeleteCategory(id)}
        />
      )}

      {/* TAB: Tags */}
      {activeTab === "tags" && (
        <CustomerSegmentsTagsTab
          tags={tags}
          tagsLoading={tagsLoading}
          renamingTag={renamingTag}
          newTagName={newTagName}
          onNewTagNameChange={setNewTagName}
          tagActionLoading={tagActionLoading}
          onStartRename={(tag) => {
            setRenamingTag(tag.name);
            setNewTagName(tag.name);
          }}
          onCancelRename={() => {
            setRenamingTag(null);
            setNewTagName("");
          }}
          onConfirmRename={(oldName) => void handleRenameTag(oldName)}
          onDeleteTag={(tagName) => void handleDeleteTag(tagName)}
        />
      )}
    </div>
  );
};

export default CustomerSegments;
