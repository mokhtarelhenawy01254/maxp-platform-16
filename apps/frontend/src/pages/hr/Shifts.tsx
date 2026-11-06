import React from "react";
import { useNavigate } from "react-router-dom";
import ShiftsSkeleton from "../../components/hr/ShiftsSkeleton";
import ShiftsTableView from "../../components/hr/ShiftsTableView";
import AssignShiftDialog from "../../components/hr/AssignShiftDialog";
import {
  useShiftsController,
  ShiftsHeader,
  ShiftsStatsGrid,
  ShiftsBulkActionBar,
  ShiftsFilterControls,
  ShiftsGridView,
  ShiftFormDialog,
  ShiftDeleteAlertDialog,
  ShiftsEmptyState,
} from "./shifts/index";

export const Shifts: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    viewMode,
    setViewMode,
    dialogOpen,
    setDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    assignDialogOpen,
    setAssignDialogOpen,
    shiftToAssign,
    setShiftToAssign,
    selectedShifts,
    setSelectedShifts,
    shiftToDelete,
    setShiftToDelete,
    editingShift,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    formData,
    setFormData,
    formErrors,
    searchInputRef,
    fetchShifts,
    openCreateDialog,
    openEditDialog,
    resetForm,
    handleCreate,
    handleUpdate,
    handleToggleStatus,
    handleDuplicate,
    handleDelete,
    toggleSelectShift,
    toggleSelectAll,
    filteredAndSortedShifts,
    stats,
  } = useShiftsController();

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      {/* Header */}
      <ShiftsHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateNew={openCreateDialog}
      />

      {/* Stats Cards */}
      <ShiftsStatsGrid stats={stats} />

      {/* Bulk Actions Bar */}
      <ShiftsBulkActionBar
        selectedCount={selectedShifts.length}
        onDeleteSelected={() => {
          setShiftToDelete("bulk");
          setDeleteDialogOpen(true);
        }}
        onClearSelection={() => setSelectedShifts([])}
      />

      {/* Filters and Search */}
      <ShiftsFilterControls
        searchInputRef={searchInputRef}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {/* Main Content Area */}
      {loading ? (
        <ShiftsSkeleton viewMode={viewMode} />
      ) : filteredAndSortedShifts.length === 0 ? (
        <ShiftsEmptyState
          searchTerm={searchTerm}
          onClearSearch={() => setSearchTerm("")}
          onCreateNew={openCreateDialog}
        />
      ) : viewMode === "table" ? (
        <ShiftsTableView
          shifts={filteredAndSortedShifts}
          selectedShifts={selectedShifts}
          onToggleSelect={toggleSelectShift}
          onToggleSelectAll={() =>
            toggleSelectAll(filteredAndSortedShifts.map((s) => s.id))
          }
          onEdit={openEditDialog}
          onDelete={(id) => {
            setShiftToDelete(id);
            setDeleteDialogOpen(true);
          }}
          onDuplicate={handleDuplicate}
          onToggleStatus={handleToggleStatus}
        />
      ) : (
        <ShiftsGridView
          shifts={filteredAndSortedShifts}
          selectedShifts={selectedShifts}
          onToggleSelect={toggleSelectShift}
          onToggleStatus={handleToggleStatus}
          onEdit={openEditDialog}
          onDuplicate={handleDuplicate}
          onAssign={(shift) => {
            setShiftToAssign({ id: shift.id, name: shift.name });
            setAssignDialogOpen(true);
          }}
          onDelete={(id) => {
            setShiftToDelete(id);
            setDeleteDialogOpen(true);
          }}
          onNavigateDetails={(id) => navigate(`/hr/shifts/${id}`)}
        />
      )}

      {/* Create / Edit Dialog */}
      <ShiftFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setDialogOpen(open);
        }}
        isEditing={Boolean(editingShift)}
        formData={formData}
        formErrors={formErrors}
        onFormDataChange={setFormData}
        onSubmit={editingShift ? handleUpdate : handleCreate}
        onCancel={() => {
          setDialogOpen(false);
          resetForm();
        }}
      />

      {/* Delete Confirmation Alert Dialog */}
      <ShiftDeleteAlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        isBulk={shiftToDelete === "bulk"}
        bulkCount={selectedShifts.length}
        onConfirmDelete={handleDelete}
      />

      {/* Assign Shift Dialog */}
      {shiftToAssign && (
        <AssignShiftDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          shiftId={shiftToAssign.id}
          shiftName={shiftToAssign.name}
          onSuccess={fetchShifts}
        />
      )}
    </div>
  );
};

export default Shifts;
