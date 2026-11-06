import React from "react";
import { useTranslation } from "react-i18next";
import { Award, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import {
  useCreateEditRewardController,
  RewardEmployeeAndTypeSection,
  RewardValueAndPeriodSection,
} from "./create-edit";

const CreateEditReward: React.FC = () => {
  const { t } = useTranslation();
  const {
    isEdit,
    navigate,
    loading,
    saving,
    error,
    employees,
    rewardTypes,
    selectedRewardType,
    formData,
    validationErrors,
    seedDefaults,
    handleChange,
    handleSubmit,
  } = useCreateEditRewardController();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="size-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/70">
        <button
          onClick={() => navigate("/hr/rewards")}
          aria-label="العودة للمكافآت"
          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
          <Award className="size-4" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
            {isEdit
              ? t("rewards.form.editReward")
              : t("rewards.form.addReward")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
            {isEdit
              ? "تعديل بيانات المكافأة"
              : "إنشاء مكافأة يدوية جديدة للموظف"}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
              حدث خطأ
            </h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <RewardEmployeeAndTypeSection
          isEdit={isEdit}
          loading={loading}
          employees={employees}
          rewardTypes={rewardTypes}
          selectedRewardType={selectedRewardType}
          formData={formData}
          validationErrors={validationErrors}
          onChange={handleChange}
          onSeedDefaults={seedDefaults}
        />

        <RewardValueAndPeriodSection
          isEdit={isEdit}
          saving={saving}
          formData={formData}
          validationErrors={validationErrors}
          onChange={handleChange}
          onCancel={() => navigate("/hr/rewards")}
        />
      </form>
    </div>
  );
};

export default CreateEditReward;
