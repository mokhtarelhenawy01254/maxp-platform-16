import React from "react";
import {
  useCreateTrainingController,
  CreateTrainingHeader,
  CreateTrainingSidebar,
  CreateTrainingScheduleCard,
  CreateTrainingInvestmentCard,
} from "./create-training/index";

const CreateTraining: React.FC = () => {
  const {
    isEdit,
    employees,
    loading,
    register,
    handleSubmit,
    control,
    errors,
    onSubmit,
    handleDelete,
    goBack,
  } = useCreateTrainingController();

  return (
    <div
      className="space-y-6 w-full pb-8"
      dir="rtl"
    >
      <CreateTrainingHeader onBack={goBack} />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <CreateTrainingSidebar
            employees={employees}
            control={control}
            register={register}
            errors={errors}
          />

          <div className="lg:col-span-2 space-y-8">
            <CreateTrainingScheduleCard
              control={control}
              register={register}
              errors={errors}
            />

            <CreateTrainingInvestmentCard
              register={register}
              isEdit={isEdit}
              loading={loading}
              onCancel={goBack}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateTraining;
