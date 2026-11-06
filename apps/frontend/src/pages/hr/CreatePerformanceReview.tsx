import React from "react";
import {
  useCreatePerformanceReviewController,
  CreatePerformanceReviewHeader,
  CreatePerformanceReviewPartiesCard,
  CreatePerformanceReviewDetailsCard,
} from "./create-performance-review/index";

const CreatePerformanceReview: React.FC = () => {
  const {
    navigate,
    isEditing,
    employees,
    loading,
    submitting,
    loadingReview,
    formData,
    setFormData,
    handleSubmit,
  } = useCreatePerformanceReviewController();

  if (loading || loadingReview) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      <CreatePerformanceReviewHeader
        isEditing={isEditing}
        onBack={() => navigate("/hr/performance-reviews")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <CreatePerformanceReviewPartiesCard
          employees={employees}
          formData={formData}
          onChange={setFormData}
        />

        <CreatePerformanceReviewDetailsCard
          isEditing={isEditing}
          submitting={submitting}
          formData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/hr/performance-reviews")}
        />
      </div>
    </div>
  );
};

export default CreatePerformanceReview;
