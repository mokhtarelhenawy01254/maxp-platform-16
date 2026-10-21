import React from "react";
import {
  useCustomerListsController,
  CustomerListsHeader,
  CustomerListsKPIs,
  CustomerListsToolbar,
  CustomerListsGrid,
  CustomerListCreateModal,
  CustomerListDeleteDialog,
  CustomerListMembersDrawer,
} from "./components/customer-lists";

export * from "./components/customer-lists/types";
export * from "./components/customer-lists/criteriaUtils";

export const CustomerLists: React.FC = () => {
  const {
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    stats,
    filteredLists,
    dialogOpen,
    setDialogOpen,
    editingList,
    formName,
    setFormName,
    formDescription,
    setFormDescription,
    formCriteriaType,
    formCriteria,
    previewCount,
    previewLoading,
    saving,
    availableTags,
    deleteTarget,
    setDeleteTarget,
    deleting,
    detailList,
    setDetailList,
    members,
    membersLoading,
    membersPage,
    membersTotal,
    memberSearch,
    refreshingId,
    searchInputRef,
    loadLists,
    openCreate,
    openEdit,
    changeCriteriaType,
    selectPreset,
    updateCriteriaField,
    handleSave,
    confirmDelete,
    handleRefreshCount,
    handleDuplicate,
    openDetail,
    handleMemberPage,
    handleMemberSearchChange,
    handleWhatsAppSend,
    exportCsv,
  } = useCustomerListsController();

  return (
    <div className="min-h-full space-y-4 px-1 py-2 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:px-6 sm:py-4 lg:px-8">
      {/* Hero Header */}
      <CustomerListsHeader
        onRefresh={() => void loadLists()}
        onCreate={openCreate}
      />

      {/* KPI Stats Strip */}
      <CustomerListsKPIs stats={stats} />

      {/* Search & Filter Toolbar */}
      <CustomerListsToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        searchInputRef={searchInputRef}
      />

      {/* Grid of Lists */}
      <CustomerListsGrid
        loading={loading}
        lists={filteredLists}
        searchTerm={searchTerm}
        filterType={filterType}
        refreshingId={refreshingId}
        onCreate={openCreate}
        onOpenDetail={(list) => void openDetail(list)}
        onWhatsAppSend={handleWhatsAppSend}
        onEdit={openEdit}
        onDuplicate={(list) => void handleDuplicate(list)}
        onRefreshCount={(list) => void handleRefreshCount(list)}
        onDeleteRequest={setDeleteTarget}
      />

      {/* Create / Edit Dialog */}
      <CustomerListCreateModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingList={editingList}
        formName={formName}
        onNameChange={setFormName}
        formDescription={formDescription}
        onDescriptionChange={setFormDescription}
        formCriteriaType={formCriteriaType}
        formCriteria={formCriteria}
        onCriteriaTypeChange={changeCriteriaType}
        onPresetSelect={selectPreset}
        onCriteriaFieldChange={updateCriteriaField}
        previewCount={previewCount}
        previewLoading={previewLoading}
        availableTags={availableTags}
        saving={saving}
        onSave={() => void handleSave()}
      />

      {/* Delete Confirmation Alert Dialog */}
      <CustomerListDeleteDialog
        target={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />

      {/* Member Details Drawer */}
      <CustomerListMembersDrawer
        detailList={detailList}
        onClose={() => setDetailList(null)}
        members={members}
        membersLoading={membersLoading}
        membersPage={membersPage}
        membersTotal={membersTotal}
        memberSearch={memberSearch}
        onMemberSearchChange={handleMemberSearchChange}
        onMemberPageChange={(page) => void handleMemberPage(page)}
        onExportCsv={exportCsv}
        onWhatsAppSend={handleWhatsAppSend}
      />
    </div>
  );
};

export default CustomerLists;
