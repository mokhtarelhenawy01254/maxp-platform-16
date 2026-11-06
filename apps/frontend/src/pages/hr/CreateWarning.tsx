import React from "react";
import {
  useCreateWarningController,
  CreateWarningHeader,
  CreateWarningForm,
  CreateWarningSidebar,
  CreateWarningPreviewDialog,
} from "./create-warning/index";

const CreateWarning: React.FC = () => {
  const {
    employees,
    loading,
    selectedEmployee,
    showPreview,
    setShowPreview,
    register,
    handleSubmit,
    control,
    watch,
    errors,
    onSubmit,
    goBack,
  } = useCreateWarningController();

  return (
    <div
      className="space-y-6 w-full pb-8 max-w-5xl mx-auto"
      dir="rtl"
    >
      <CreateWarningHeader onBack={goBack} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <CreateWarningForm
          employees={employees}
          loading={loading}
          register={register}
          control={control}
          errors={errors}
          onSubmit={handleSubmit(onSubmit)}
          onOpenPreview={() => setShowPreview(true)}
          onCancel={goBack}
        />

        <CreateWarningSidebar selectedEmployee={selectedEmployee} />
      </div>

      <CreateWarningPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        selectedEmployee={selectedEmployee}
        watch={watch}
      />
    </div>
  );
};

export default CreateWarning;
