import React from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Download,
  Upload,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeInviteModal } from "@/components/hr/EmployeeInviteModal";
import {
  useEmployeesController,
  EmployeeFilters,
  EmployeeTable,
  EmployeeAssetsDialog,
  AddEmployeeDialog,
  EmployeeCredentialsDialog,
} from "./employees/index";

export const Employees: React.FC = () => {
  const { t } = useTranslation();
  const {
    loading,
    employees,
    departments,
    pagination,
    setPagination,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    departmentFilter,
    setDepartmentFilter,
    contractFilter,
    setContractFilter,
    userStatusFilter,
    setUserStatusFilter,
    showAddDialog,
    setShowAddDialog,
    showInviteDialog,
    setShowInviteDialog,
    submitting,
    errors,
    assetsDialog,
    setAssetsDialog,
    credentialsModal,
    setCredentialsModal,
    formData,
    setFormData,
    lookupLoading,
    lookupResult,
    fetchEmployees,
    openAssetsDialog,
    handleAddEmployee,
    handleDeleteEmployee,
    handleReactivateEmployee,
    handleResetPassword,
    handleToggleStatus,
    handleTerminateEmployee,
    resetForm,
  } = useEmployeesController();

  return (
    <div
      className="space-y-6 w-full pb-8"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {t("employees.pageTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t("employees.pageSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowInviteDialog(true)}
            className="gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Link2 className="h-4 w-4" />
            دعوة موظف برابط
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            className="gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            {t("employees.addEmployee")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs font-semibold"
          >
            <Upload className="h-4 w-4" />
            {t("employees.import")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="h-4 w-4" />
            {t("employees.export")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <EmployeeFilters
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        departmentFilter={departmentFilter}
        setDepartmentFilter={setDepartmentFilter}
        contractFilter={contractFilter}
        setContractFilter={setContractFilter}
        userStatusFilter={userStatusFilter}
        setUserStatusFilter={setUserStatusFilter}
        departments={departments}
      />

      {/* Employees Table */}
      <EmployeeTable
        loading={loading}
        employees={employees}
        pagination={pagination}
        setPagination={setPagination}
        onOpenAddDialog={() => {
          resetForm();
          setShowAddDialog(true);
        }}
        onOpenAssets={openAssetsDialog}
        onDelete={handleDeleteEmployee}
        onResetPassword={handleResetPassword}
        onToggleStatus={handleToggleStatus}
        onTerminate={handleTerminateEmployee}
      />

      {/* Assets Dialog */}
      <EmployeeAssetsDialog
        assetsDialog={assetsDialog}
        onOpenChange={(open) =>
          setAssetsDialog((prev) => ({
            ...prev,
            open,
            error: "",
            assets: [],
          }))
        }
      />

      {/* Employee Credentials Dialog */}
      <EmployeeCredentialsDialog
        state={credentialsModal}
        onOpenChange={(open) =>
          setCredentialsModal((prev) => ({ ...prev, open }))
        }
      />

      {/* Add Employee Dialog */}
      <AddEmployeeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        formData={formData}
        setFormData={setFormData}
        departments={departments}
        lookupLoading={lookupLoading}
        lookupResult={lookupResult}
        errors={errors}
        submitting={submitting}
        onSubmit={handleAddEmployee}
        onCancel={() => setShowAddDialog(false)}
        onReactivate={handleReactivateEmployee}
      />

      {/* Employee Self-Onboarding Invite Modal */}
      <EmployeeInviteModal
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        departments={departments}
        onInvitationCreated={fetchEmployees}
      />
    </div>
  );
};

export default Employees;
