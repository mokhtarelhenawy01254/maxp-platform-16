import React from "react";
import { useNavigate } from "react-router-dom";
import {
  useBenefitsController,
  BenefitsHeader,
  BenefitsFilters,
  BenefitsGrid,
  BenefitCreateDialog,
  BenefitDetailsDialog,
} from "./benefits/index";

export const Benefits: React.FC = () => {
  const navigate = useNavigate();
  const {
    benefits,
    loading,
    dialogOpen,
    setDialogOpen,
    detailsOpen,
    setDetailsOpen,
    submitting,
    editingId,
    selectedBenefit,
    setSelectedBenefit,
    employees,
    enrollLoading,
    formData,
    setFormData,
    enrollmentFormData,
    setEnrollmentFormData,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    page,
    setPage,
    pagination,
    handleEnroll,
    handleSubmit,
    handleDelete,
    openCreateDialog,
    openEditDialog,
  } = useBenefitsController();

  if (loading && benefits.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50/30 dark:bg-gray-900/30">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground animate-pulse">
            جاري تحميل المزايا...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      {/* Header */}
      <BenefitsHeader onAddNew={openCreateDialog} />

      {/* Filters */}
      <BenefitsFilters
        search={search}
        setSearch={setSearch}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
      />

      {/* Benefits Grid */}
      <BenefitsGrid
        benefits={benefits}
        loading={loading}
        pagination={pagination}
        page={page}
        setPage={setPage}
        onSelectBenefit={(id) => navigate(`/hr/benefits/${id}`)}
        onEditBenefit={openEditDialog}
        onDeleteBenefit={handleDelete}
        onAddNew={openCreateDialog}
      />

      {/* Create / Edit Dialog */}
      <BenefitCreateDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            navigate("/hr/benefits");
          }
        }}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => {
          setDialogOpen(false);
          navigate("/hr/benefits");
        }}
      />

      {/* Details Dialog */}
      <BenefitDetailsDialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedBenefit(null);
            navigate("/hr/benefits");
          }
        }}
        selectedBenefit={selectedBenefit}
        employees={employees}
        enrollmentFormData={enrollmentFormData}
        setEnrollmentFormData={setEnrollmentFormData}
        enrollLoading={enrollLoading}
        onEnroll={handleEnroll}
      />
    </div>
  );
};

export default Benefits;
