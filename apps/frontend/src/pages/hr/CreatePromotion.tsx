import React from "react";
import {
  useCreatePromotionController,
  CreatePromotionHeader,
  CreatePromotionSidebar,
  CreatePromotionDetailsForm,
} from "./create-promotion/index";

const CreatePromotion: React.FC = () => {
  const {
    navigate,
    loading,
    employees,
    selectedEmployee,
    increaseStats,
    register,
    handleSubmit,
    control,
    errors,
    onSubmit,
  } = useCreatePromotionController();

  return (
    <div
      className="space-y-6 w-full pb-8 max-w-6xl 2xl:max-w-7xl mx-auto"
      dir="rtl"
    >
      <CreatePromotionHeader onBack={() => navigate("/hr/promotions")} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <CreatePromotionSidebar
          control={control}
          errors={errors}
          employees={employees}
          selectedEmployee={selectedEmployee}
          increaseStats={increaseStats}
        />

        <CreatePromotionDetailsForm
          register={register}
          handleSubmit={handleSubmit}
          errors={errors}
          loading={loading}
          onSubmit={onSubmit}
          onCancel={() => navigate("/hr/promotions")}
        />
      </div>
    </div>
  );
};

export default CreatePromotion;
