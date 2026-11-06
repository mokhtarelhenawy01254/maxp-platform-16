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
      className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("employees.pageTitle")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("employees.pageSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all active:scale-95"
          >
            <Link2 className="h-4 w-4 ml-1.5" />
            دعوة موظف برابط
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Plus className="h-4 w-4 ml-1.5" />
            {t("employees.addEmployee")}
          </Button>
          <Button
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Upload className="h-4 w-4 ml-2" />
            {t("employees.import")}
          </Button>
          <Button
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Download className="h-4 w-4 ml-2" />
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
