import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  EyeIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import ThemeToggle from "../../../../components/ui/theme-toggle";
import {
  canApprove,
  canPublish,
  canReject,
  canSubmitReview,
  canUnpublish,
  ProductWorkflow,
} from "../../utils/workflow";
import { WorkflowAction } from "./types";

interface ProductNewHeaderProps {
  isEditMode: boolean;
  workflow: ProductWorkflow;
  workflowLabel: string;
  workflowColorClass: string;
  loading: boolean;
  effectiveProductId?: string;
  canSubmitProductReview: boolean;
  canManageProductWorkflow: boolean;
  handleSaveChanges: () => void;
  handlePreview: () => void;
  setShowConvertModal: (show: boolean) => void;
  runWorkflowAction: (action: WorkflowAction) => void;
  navigate: (path: string) => void;
  t: (key: string) => string;
}

export const ProductNewHeader: React.FC<ProductNewHeaderProps> = ({
  isEditMode,
  workflow,
  workflowLabel,
  workflowColorClass,
  loading,
  effectiveProductId,
  canSubmitProductReview,
  canManageProductWorkflow,
  handleSaveChanges,
  handlePreview,
  setShowConvertModal,
  runWorkflowAction,
  navigate,
  t,
}) => {
  return (
    <div className="bg-card/95 backdrop-blur-xs border-b border-border/70 sticky top-0 z-30 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 shadow-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-4 max-w-6xl 2xl:max-w-7xl mx-auto">
        {/* Title & Status */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/products"
              className="p-1.5 sm:p-2 rounded-full hover:bg-muted transition-colors shrink-0"
              title="العودة"
            >
              <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground rtl:rotate-180" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-foreground truncate">
                  {isEditMode ? t("products.editTitle") : t("products.addNew")}
                </h1>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${workflowColorClass}`}
                >
                  {workflowLabel}
                </span>
              </div>
              {workflow.rejectionReason && (
                <p className="text-xs text-destructive mt-0.5">
                  سبب الرفض: {workflow.rejectionReason}
                </p>
              )}
            </div>
          </div>

          {/* Mobile quick save & theme toggle */}
          <div className="flex items-center gap-1.5 sm:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? "..." : effectiveProductId ? "حفظ" : "إنشاء"}
            </button>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex w-full items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 sm:w-auto sm:flex-wrap sm:gap-2 sm:overflow-visible sm:py-0 text-xs sm:text-sm">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="shrink-0 whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 border border-border/70 shadow-xs font-medium rounded-lg text-foreground bg-background hover:bg-muted transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={loading}
            className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2 font-medium text-primary hover:bg-primary/20 transition-colors ${
              loading ? "cursor-not-allowed opacity-75" : ""
            }`}
          >
            <EyeIcon className="h-4 w-4" />
            <span>معاينة</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConvertModal(true)}
            disabled={!effectiveProductId}
            title={
              effectiveProductId
                ? undefined
                : "احفظ المنتج أولاً قبل تحويله إلى عرض تقديمي"
            }
            className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-lg border border-purple-200 dark:border-purple-900/40 bg-card px-3 py-1.5 sm:px-4 sm:py-2 font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors ${
              effectiveProductId ? "" : "cursor-not-allowed opacity-50"
            }`}
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>عرض تقديمي</span>
          </button>

          <button
            type="button"
            onClick={() => runWorkflowAction("save_draft")}
            disabled={loading}
            className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-lg border border-border/70 bg-card px-3 py-1.5 sm:px-4 sm:py-2 font-medium text-foreground hover:bg-muted transition-colors ${
              loading ? "cursor-not-allowed opacity-75" : ""
            }`}
          >
            مسودة
          </button>

          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={loading}
            className={`hidden sm:inline-flex shrink-0 whitespace-nowrap items-center px-5 py-2 border border-transparent shadow-xs font-bold rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 transition-colors ${
              loading ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {loading && (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent mr-2 rtl:ml-2" />
            )}
            <span>
              {effectiveProductId ? t("common.saveChanges") : t("products.save")}
            </span>
          </button>

          {canSubmitProductReview && canSubmitReview(workflow) && (
            <button
              type="button"
              onClick={() => runWorkflowAction("submit_review")}
              disabled={loading}
              className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-500/10 px-3 py-1.5 sm:px-4 sm:py-2 font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors ${
                loading ? "cursor-not-allowed opacity-75" : ""
              }`}
            >
              إرسال للمراجعة
            </button>
          )}

          {canManageProductWorkflow && canApprove(workflow) && (
            <button
              type="button"
              onClick={() => runWorkflowAction("approve")}
              disabled={loading}
              className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-500/10 px-3 py-1.5 sm:px-4 sm:py-2 font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors ${
                loading ? "cursor-not-allowed opacity-75" : ""
              }`}
            >
              اعتماد
            </button>
          )}

          {canManageProductWorkflow && canReject(workflow) && (
            <button
              type="button"
              onClick={() => runWorkflowAction("reject")}
              disabled={loading}
              className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-500/10 px-3 py-1.5 sm:px-4 sm:py-2 font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition-colors ${
                loading ? "cursor-not-allowed opacity-75" : ""
              }`}
            >
              رفض
            </button>
          )}

          {canManageProductWorkflow && canPublish(workflow) && (
            <button
              type="button"
              onClick={() => runWorkflowAction("publish")}
              disabled={loading}
              className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-600 px-3 py-1.5 sm:px-4 sm:py-2 font-medium text-white hover:bg-emerald-700 transition-colors ${
                loading ? "cursor-not-allowed opacity-75" : ""
              }`}
            >
              نشر
            </button>
          )}

          {canManageProductWorkflow && canUnpublish(workflow) && (
            <button
              type="button"
              onClick={() => runWorkflowAction("unpublish")}
              disabled={loading}
              className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-lg border border-orange-200 dark:border-orange-900/40 bg-orange-500/10 px-3 py-1.5 sm:px-4 sm:py-2 font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-500/20 transition-colors ${
                loading ? "cursor-not-allowed opacity-75" : ""
              }`}
            >
              إلغاء النشر
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductNewHeader;
