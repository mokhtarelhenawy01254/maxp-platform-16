import React from "react";
import { Clock, History, Download, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  usePermissionsController,
  PermissionStatsCards,
  PermissionFilters,
  PermissionTable,
  AddPermissionDialog,
  PermissionDetailsDialog,
  PermissionRejectDialog,
  PermissionDeleteDialog,
} from "./permissions/index";

export const Permissions: React.FC = () => {
  const { t } = useTranslation();
  const {
    isMyPermissions,
    loading,
    requests,
    employees,
    stats,
    pagination,
    setPagination,
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
    showDeleteDialog,
    setShowDeleteDialog,
    selectedRequest,
    setSelectedRequest,
    rejectionReason,
    setRejectionReason,
    submitting,
    formData,
    setFormData,
    resetForm,
    handleCreate,
    handleApprove,
    handleReject,
    handleDelete,
    confirmDelete,
  } = usePermissionsController();

  const pendingCount = stats?.pendingCount || 0;

  return (
    <div
      className="space-y-6 w-full pb-8"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate sm:overflow-visible">
              {t("employee.permissions.title")}
            </h1>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs sm:text-sm">
              <History className="h-3.5 w-3.5 shrink-0" />
              <span>
                {t("employee.permissions.totalRecords", {
                  count: pagination.total,
                })}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-initial text-xs sm:text-sm h-9 px-3 sm:px-4"
          >
            <Download className="h-3.5 w-3.5 ml-1.5" />
            {t("employee.permissions.export")}
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            className="flex-1 sm:flex-initial text-xs sm:text-sm h-9 px-3 sm:px-4"
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5" />
            {t("employee.permissions.newPermission")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <PermissionStatsCards stats={stats} />

      {/* Main Content: Filters and Table */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
        <CardContent className="p-0">
          <PermissionFilters
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            pendingCount={pendingCount}
          />
          <PermissionTable
            loading={loading}
            requests={requests}
            isMyPermissions={isMyPermissions}
            pagination={pagination}
            setPagination={setPagination}
            onApprove={handleApprove}
            onRejectClick={(request) => {
              setSelectedRequest(request);
              setShowRejectDialog(true);
            }}
            onDetailsClick={(request) => {
              setSelectedRequest(request);
              setShowDetailsDialog(true);
            }}
            onDeleteClick={handleDelete}
            onOpenAddDialog={() => {
              resetForm();
              setShowAddDialog(true);
            }}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddPermissionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        formData={formData}
        setFormData={setFormData}
        employees={employees}
        isMyPermissions={isMyPermissions}
        submitting={submitting}
        onSubmit={handleCreate}
        onCancel={() => setShowAddDialog(false)}
      />

      <PermissionDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        selectedRequest={selectedRequest}
        isMyPermissions={isMyPermissions}
        onApprove={handleApprove}
        onRejectClick={(request) => {
          setSelectedRequest(request);
          setShowRejectDialog(true);
        }}
      />

      <PermissionRejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        onConfirmReject={handleReject}
      />

      <PermissionDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        submitting={submitting}
        onConfirmDelete={confirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setSelectedRequest(null);
        }}
      />
    </div>
  );
};

export default Permissions;
