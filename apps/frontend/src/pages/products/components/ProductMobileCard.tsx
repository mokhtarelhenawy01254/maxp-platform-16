import React from "react";
import { Link } from "react-router-dom";
import {
  Product,
  getStockStatus,
  getStockStatusColor,
  getStockStatusText,
} from "./ProductsTypes";
import {
  PhotoIcon,
  EyeIcon,
  PencilIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import {
  canApprove,
  canPublish,
  canReject,
  canSubmitReview,
  canUnpublish,
  getWorkflowStatusColor,
  getWorkflowStatusLabel,
} from "../utils/workflow";
import { getImageUrl } from "../../../utils/imageUrl";

type WorkflowAction =
  | "save_draft"
  | "submit_review"
  | "approve"
  | "reject"
  | "publish"
  | "unpublish";

interface ProductMobileCardProps {
  product: Product;
  selected: boolean;
  canSelect: boolean;
  onSelect: (id: string) => void;
  formatPrice: (price: number) => string;
  formatDate: (date: Date) => string;
  getStorefrontUrl: (product: Pick<Product, "id" | "slug" | "workflow"> | string) => string;
  prepareStorefrontContext: () => void;
  isEditing: boolean;
  editPrice: string;
  editStock: string;
  editSku: string;
  onEditPriceChange: (value: string) => void;
  onEditStockChange: (value: string) => void;
  onEditSkuChange: (value: string) => void;
  onSaveQuickEdit: (id: string) => void;
  onCancelQuickEdit: () => void;
  onStartQuickEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  duplicatingProductId: string | null;
  workflowLoadingId: string | null;
  onWorkflowAction: (product: Product, action: WorkflowAction) => void;
  canManageWorkflow: boolean;
  canSubmitReviewWorkflow: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
}

export const ProductMobileCard: React.FC<ProductMobileCardProps> = ({
  product,
  selected,
  canSelect,
  onSelect,
  formatPrice,
  getStorefrontUrl,
  prepareStorefrontContext,
  isEditing,
  editPrice,
  editStock,
  editSku,
  onEditPriceChange,
  onEditStockChange,
  onEditSkuChange,
  onSaveQuickEdit,
  onCancelQuickEdit,
  onStartQuickEdit,
  onDuplicate,
  duplicatingProductId,
  workflowLoadingId,
  onWorkflowAction,
  canManageWorkflow,
  canSubmitReviewWorkflow,
  canDelete,
  onDelete,
}) => {
  const stockStatus = getStockStatus(product);
  const stockColor = getStockStatusColor(stockStatus);
  const stockText = getStockStatusText(stockStatus);
  const isWorkflowBusy = workflowLoadingId === product.id;
  const isVariableProduct = product.productType === "variable";
  const workflowLabel = getWorkflowStatusLabel(product.workflow.status, product.workflow);

  const mainImage = product.mainImage || (product.images && product.images[0]);
  const imageUrl = getImageUrl(mainImage, "thumbnail");
  const editUrl = `/products/${product.id}/edit`;

  const renderWorkflowActions = () => {
    const btnSize = "inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-50";

    if (canSubmitReviewWorkflow && canSubmitReview(product.workflow)) {
      return (
        <button
          type="button"
          onClick={() => onWorkflowAction(product, "submit_review")}
          disabled={isWorkflowBusy}
          className={`${btnSize} text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40`}
          title="إرسال للمراجعة"
          aria-label="إرسال للمراجعة"
        >
          <PaperAirplaneIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      );
    }

    if (canManageWorkflow && (canApprove(product.workflow) || canReject(product.workflow))) {
      return (
        <>
          <button
            type="button"
            onClick={() => onWorkflowAction(product, "approve")}
            disabled={isWorkflowBusy}
            className={`${btnSize} text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40`}
            title="اعتماد"
            aria-label="اعتماد"
          >
            <CheckCircleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <button
            type="button"
            onClick={() => onWorkflowAction(product, "reject")}
            disabled={isWorkflowBusy}
            className={`${btnSize} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40`}
            title="رفض"
            aria-label="رفض"
          >
            <XCircleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </>
      );
    }

    if (canManageWorkflow && canPublish(product.workflow)) {
      return (
        <button
          type="button"
          onClick={() => onWorkflowAction(product, "publish")}
          disabled={isWorkflowBusy}
          className={`${btnSize} text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40`}
          title="نشر"
          aria-label="نشر"
        >
          <CheckCircleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      );
    }

    if (canManageWorkflow && canUnpublish(product.workflow)) {
      return (
        <button
          type="button"
          onClick={() => onWorkflowAction(product, "unpublish")}
          disabled={isWorkflowBusy}
          className={`${btnSize} text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40`}
          title="إلغاء النشر"
          aria-label="إلغاء النشر"
        >
          <XCircleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      );
    }

    return null;
  };

  return (
    <div
      className={`rounded-2xl border p-3.5 transition-all shadow-xs ${
        selected
          ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 ring-1 ring-indigo-500/30"
          : "border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      <div className="flex items-start gap-3">
        {canSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(product.id)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
          />
        )}

        {/* Product Image - Clickable to full edit */}
        <Link
          to={editUrl}
          className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700/50 border border-gray-200/70 dark:border-gray-600/70 hover:opacity-85 transition-opacity"
          title="انقر لتعديل تفاصيل المنتج"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-gray-500">
              <PhotoIcon className="h-6 w-6 opacity-40" />
            </div>
          )}
        </Link>

        {/* Info - Clickable Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1.5">
            <Link
              to={editUrl}
              className="truncate text-xs sm:text-sm font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="انقر لتعديل تفاصيل المنتج"
            >
              {product.name}
            </Link>
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${stockColor}`}>
              {stockText}
            </span>
          </div>

          {/* Badges & SKU */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono" dir="ltr">
              {product.sku || "بدون SKU"}
            </span>
            {isVariableProduct && (
              <span className="rounded px-1.5 py-0.2 text-[9px] font-semibold bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                {product.variantsCount} متغير
              </span>
            )}
            {product.hasQuantityOffers && (
              <Link
                to={`/products/${product.id}/edit?tab=quantity-offers`}
                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                title="عروض الكميات متاحة - انقر للتعديل"
              >
                <span>⚡</span>
                <span>عروض كميات</span>
                {product.quantityOffersCount ? ` (${product.quantityOffersCount})` : ""}
              </Link>
            )}
            {product.isHidden && (
              <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                <EyeSlashIcon className="h-2.5 w-2.5 ml-0.5" />
                مخفي
              </span>
            )}
            {product.workflow?.status && (product.workflow.status !== "published" || product.workflow?.unpublishedAt) && (
              <span className={`rounded px-1.5 py-0.2 text-[9px] font-semibold ${getWorkflowStatusColor(product.workflow.status, product.workflow)}`}>
                {workflowLabel}
              </span>
            )}
          </div>

          {/* Price & Stock */}
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100 dark:border-gray-700/50">
            <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">
              {formatPrice(product.price)}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              المخزون: <strong className={`font-mono ${product.stock <= 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>{product.stock}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Edit Mode */}
      {isEditing ? (
        <div className="mt-3 border-t border-gray-100 dark:border-gray-700/80 pt-3 space-y-2.5 bg-gray-50/80 dark:bg-gray-750/50 -mx-3.5 -mb-3.5 p-3.5 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">تعديل سريع</span>
            <Link
              to={editUrl}
              className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              <span>تعديل كامل للتفاصيل</span>
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">السعر</label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => onEditPriceChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">المخزون</label>
              <input
                type="number"
                value={editStock}
                onChange={(e) => onEditStockChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">SKU</label>
              <input
                type="text"
                value={editSku}
                onChange={(e) => onEditSkuChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancelQuickEdit}
              className="min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => onSaveQuickEdit(product.id)}
              className="min-h-[36px] rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95"
            >
              حفظ
            </button>
          </div>
        </div>
      ) : (
        /* Action Bar */
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-700/60 pt-2.5 gap-1.5">
          {/* Main Edit & Storefront Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <Link
              to={editUrl}
              className="inline-flex items-center gap-1 min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
              title="تعديل كافة تفاصيل المنتج"
            >
              <PencilSquareIcon className="h-3.5 w-3.5" />
              <span>تعديل</span>
            </Link>

            <a
              href={getStorefrontUrl(product)}
              target="_blank"
              rel="noreferrer"
              onClick={() => prepareStorefrontContext()}
              className="inline-flex items-center gap-1 min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold shadow-xs transition-colors"
              title="عرض في المتجر"
            >
              <EyeIcon className="h-3.5 w-3.5" />
              <span>عرض</span>
            </a>
          </div>

          {/* Quick Icons: Quick Edit, Duplicate, Workflow, Delete */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onStartQuickEdit(product)}
              className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              title="تعديل سريع (سعر ومخزون)"
              aria-label="تعديل سريع"
            >
              <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            <button
              type="button"
              onClick={() => onDuplicate(product)}
              disabled={duplicatingProductId === product.id}
              className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors disabled:opacity-40"
              title="نسخ المنتج"
              aria-label="نسخ المنتج"
            >
              <DocumentDuplicateIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            {renderWorkflowActions()}

            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(product.id)}
                className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 transition-colors"
                title="حذف المنتج"
                aria-label="حذف المنتج"
              >
                <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductMobileCard;
