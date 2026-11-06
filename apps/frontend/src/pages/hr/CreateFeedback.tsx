import React from "react";
import {
  useCreateFeedbackController,
  CreateFeedbackHeader,
  CreateFeedbackFormCard,
  CreateFeedbackSidebar,
} from "./create-feedback/index";

const CreateFeedback: React.FC = () => {
  const {
    navigate,
    isEdit,
    isPersonal,
    employees,
    loading,
    fetchingData,
    hoverRating,
    setHoverRating,
    register,
    handleSubmit,
    control,
    setValue,
    errors,
    currentRating,
    currentType,
    selectedEmployee,
    onSubmit,
  } = useCreateFeedbackController();

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div
      className="max-w-4xl mx-auto space-y-6 pb-8"
      dir="rtl"
    >
      <CreateFeedbackHeader
        isEdit={isEdit}
        isPersonal={isPersonal}
        onBack={() => navigate(isPersonal ? "/my-feedback" : "/hr/feedback")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <CreateFeedbackFormCard
          isEdit={isEdit}
          isPersonal={isPersonal}
          employees={employees}
          loading={loading}
          hoverRating={hoverRating}
          onHoverRatingChange={setHoverRating}
          currentRating={currentRating}
          currentType={currentType}
          register={register}
          handleSubmit={handleSubmit}
          control={control}
          setValue={setValue}
          errors={errors}
          onSubmit={onSubmit}
        />

        <CreateFeedbackSidebar selectedEmployee={selectedEmployee} />
      </div>
    </div>
  );
};

export default CreateFeedback;
