import React from "react";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useLeavesController,
  LeaveStatsCards,
  LeaveFilters,
  LeaveRequestsTable,
  AddLeaveDialog,
  LeaveDetailsDialog,
  LeaveRejectDialog,
  LeaveReopenDialog,
  LeaveEditDialog,
  LeaveChangeDecisionDialog,
} from "./leaves/index";

const Leaves: React.FC = () => {
  const {
    t,
    isMyLeaves,
    loading,
    requests,
    employees,
    pagination,
    setPagination,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    activeTab,
    setActiveTab,
    showAddDialog,
    setShowAddDialog,
    showDetailsDialog,
    setShowDetailsDialog,
    showRejectDialog,
    setShowRejectDialog,
    showReopenDialog,
    setShowReopenDialog,
    showEditDialog,
    setShowEditDialog,
    showChangeDecisionDialog,
    setShowChangeDecisionDialog,
    selectedRequest,
    setSelectedRequest,
    rejectionReason,
    setRejectionReason,
    newDecision,
    setNewDecision,
    fieldErrors,
    formData,
    setFormData,
    editFormData,
    setEditFormData,
    totalDaysCount,
    pendingCount,
    handleApprove,
    handleReject,
    handleReopenRequest,
    handleEditRequest,
    handleSaveEdit,
    handleChangeDecision,
    handleCancel,
    handleDelete,
    handleAddRequest,
  } = useLeavesController();

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {isMyLeaves ? t("employee.leaves.myLeaves") : t("employee.leaves.manageLeaves")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-mono tabular-nums">
            {t("employee.leaves.totalRequests", { count: pagination.total })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            {t("employee.leaves.newLeaveRequest")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="h-4 w-4" />
            {t("employee.leaves.export")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <LeaveStatsCards
        t={t}
        requests={requests}
        pendingCount={pendingCount}
      />

      {/* Filters */}
      <LeaveFilters
        t={t}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* Requests Table */}
      <LeaveRequestsTable
        t={t}
        loading={loading}
        requests={requests}
        isMyLeaves={isMyLeaves}
        pagination={pagination}
        setPagination={setPagination}
        onApprove={handleApprove}
        onOpenReject={(req) => {
          setSelectedRequest(req);
          setShowRejectDialog(true);
        }}
        onCancel={handleCancel}
        onOpenChangeDecision={(req) => {
          setSelectedRequest(req);
          setShowChangeDecisionDialog(true);
        }}
        onOpenEdit={(req) => {
          handleEditRequest(req);
        }}
        onDelete={handleDelete}
        onOpenDetails={(req) => {
          setSelectedRequest(req);
          setShowDetailsDialog(true);
        }}
      />

      {/* Add Leave Dialog */}
      <AddLeaveDialog
        t={t}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        isMyLeaves={isMyLeaves}
        employees={employees}
        formData={formData}
        setFormData={setFormData}
        fieldErrors={fieldErrors}
        totalDaysCount={totalDaysCount}
        onSubmit={handleAddRequest}
      />

      {/* Details Dialog */}
      <LeaveDetailsDialog
        t={t}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        selectedRequest={selectedRequest}
      />

      {/* Reject Dialog */}
      <LeaveRejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        rejectionReason={rejectionReason}
        onRejectionReasonChange={setRejectionReason}
        onConfirmReject={handleReject}
        t={t}
      />

      {/* Reopen Dialog */}
      <LeaveReopenDialog
        open={showReopenDialog}
        onOpenChange={setShowReopenDialog}
        selectedRequest={selectedRequest}
        onConfirmReopen={handleReopenRequest}
        t={t}
      />

      {/* Edit Dialog */}
      <LeaveEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        selectedRequest={selectedRequest}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        onSaveEdit={handleSaveEdit}
        t={t}
      />

      {/* Change Decision Dialog */}
      <LeaveChangeDecisionDialog
        open={showChangeDecisionDialog}
        onOpenChange={setShowChangeDecisionDialog}
        selectedRequest={selectedRequest}
        newDecision={newDecision}
        setNewDecision={setNewDecision}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        onChangeDecision={handleChangeDecision}
        t={t}
      />
    </div>
  );
};

export default Leaves;
