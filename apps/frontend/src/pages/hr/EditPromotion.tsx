import React from "react";
import { Button } from "../../components/ui/button";
import {
  useEditPromotionController,
  EditPromotionHeader,
  EditPromotionEmployeeSidebar,
  EditPromotionDetailsForm,
} from "./edit-promotion/index";

const EditPromotion: React.FC = () => {
  const {
    loading,
    saving,
    employees,
    selectedEmployee,
    promotion,
    register,
    handleSubmit,
    control,
    errors,
    increaseStats,
    onSubmit,
    goBack,
  } = useEditPromotionController();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[350px] w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-700">الترقية غير موجودة</h2>
        <Button onClick={goBack} className="mt-4">
          العودة للقائمة
        </Button>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 w-full pb-8 max-w-6xl 2xl:max-w-7xl mx-auto"
      dir="rtl"
    >
      <EditPromotionHeader status={promotion.status} onBack={goBack} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <EditPromotionEmployeeSidebar
          control={control}
          employees={employees}
          selectedEmployee={selectedEmployee}
          increaseStats={increaseStats}
        />

        <EditPromotionDetailsForm
          register={register}
          control={control}
          errors={errors}
          saving={saving}
          onSubmit={handleSubmit(onSubmit)}
          onCancel={goBack}
        />
      </div>
    </div>
  );
};

export default EditPromotion;
