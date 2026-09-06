import React, { useState } from "react";
import {
  Product,
  getStockStatus,
  getStockStatusColor,
  getStockStatusText,
} from "./ProductsTypes";
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PhotoIcon,
  EyeSlashIcon,
  PaperAirplaneIcon,
  SparklesIcon,
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

interface ProductTableRowProps {
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

const ProductTableRow: React.FC<ProductTableRowProps> = ({
  product,
  selected,
  canSelect,
  onSelect,
  formatPrice,
  formatDate,
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
  const isVariableProduct = product.productType === "variable";
  const isWorkflowBusy = workflowLoadingId === product.id;
  const workflowLabel = getWorkflowStatusLabel(product.workflow.status);
  const canEditStock =
    product.merchantContext?.canEditStock !== false &&
    product.inventorySnapshot?.canEditStock !== false;
  const stockLocationLabel =
    product.inventorySnapshot?.stockLocationLabel ||
    product.merchantContext?.stockLocationLabel;
  const hasImage = !!(product.mainImage || (product.images && product.images.length > 0));
  const [imageError, setImageError] = useState(false);

  const quantityOffersTooltip = React.useMemo(() => {
    if (!product.hasQuantityOffers) return "";
    if (product.quantityOffers && product.quantityOffers.length > 0) {
      const summary = product.quantityOffers
        .slice(0, 3)
        .map((o) => o.buyText || `${o.quantity} قطع بسعر ${o.unitPrice}`)
        .join(" | ");
      return `عروض الكميات: ${summary}${product.quantityOffers.length > 3 ? "..." : ""} (انقر للتعديل)`;
    }
    return `يحتوي هذا المنتج على عروض كميات أو خصومات حجمية نشطة (انقر للتعديل)`;
  }, [product]);

  const openStorefront = () => {
    prepareStorefrontContext();
    window.open(getStorefrontUrl(product), "_blank", "noopener,noreferrer");
  };

  const actionBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-700";
  const renderWorkflowActions = () => {
    if (canSubmitReviewWorkflow && canSubmitReview(product.workflow)) {
      return (
        <button
          onClick={() => onWorkflowAction(product, "submit_review")}
          disabled={isWorkflowBusy}
          className={`${actionBtn} text-amber-600 hover:text-amber-900 disabled:cursor-wait disabled:opacity-50`}
          aria-label="إرسال للمراجعة"
          title="إرسال للمراجعة"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      );
    }

    if (canManageWorkflow && (canApprove(product.workflow) || canReject(product.workflow))) {
      return (
        <>
          <button
            onClick={() => onWorkflowAction(product, "approve")}
            disabled={isWorkflowBusy}
            className={`${actionBtn} text-green-600 hover:text-green-900 disabled:cursor-wait disabled:opacity-50`}
            aria-label="اعتماد"
            title="اعتماد"
          >
            <CheckCircleIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onWorkflowAction(product, "reject")}
            disabled={isWorkflowBusy}
            className={`${actionBtn} text-rose-600 hover:text-rose-900 disabled:cursor-wait disabled:opacity-50`}
            aria-label="رفض"
            title="رفض"
          >
            <XCircleIcon className="h-4 w-4" />
          </button>
        </>
      );
    }

    if (canManageWorkflow && canPublish(product.workflow)) {
      return (
        <button
          onClick={() => onWorkflowAction(product, "publish")}
          disabled={isWorkflowBusy}
          className={`${actionBtn} text-green-600 hover:text-green-900 disabled:cursor-wait disabled:opacity-50`}
          aria-label="نشر"
          title="نشر"
        >
          <CheckCircleIcon className="h-4 w-4" />
        </button>
      );
    }

    if (canManageWorkflow && canUnpublish(product.workflow)) {
      return (
        <button
          onClick={() => onWorkflowAction(product, "unpublish")}
          disabled={isWorkflowBusy}
          className={`${actionBtn} text-orange-600 hover:text-orange-900 disabled:cursor-wait disabled:opacity-50`}
          aria-label="إلغاء النشر"
          title="إلغاء النشر"
        >
          <XCircleIcon className="h-4 w-4" />
        </button>
      );
    }

    return null;
  };

  return (
    <tr
      className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/80 transition-colors ${selected ? "bg-indigo-50/80 dark:bg-indigo-900/20" : ""}`}
    >
      {canSelect && (
        <td className="px-4 py-4">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(product.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <a
            href={getStorefrontUrl(product)}
            onClick={prepareStorefrontContext}
            className="flex-shrink-0 h-20 w-20 relative hover:opacity-80 transition-opacity"
          >
            {hasImage && !imageError ? (
              <img
                src={getImageUrl(product.mainImage || product.images[0]) || ""}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className="h-20 w-20 rounded-lg object-cover shadow-sm border border-gray-100 dark:border-gray-600"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <PhotoIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </a>
          <div className="mr-4 flex flex-col gap-1">
            <a
              href={getStorefrontUrl(product)}
              onClick={prepareStorefrontContext}
              className="text-sm font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block"
            >
              {product.name}
            </a>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400">{product.category}</span>
              {product.hasQuantityOffers && (
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `/products/${product.id}/edit?tab=quantity-offers`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  title={quantityOffersTooltip}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-xs"
                >
                  <SparklesIcon className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span>عروض كميات</span>
                  {product.quantityOffersCount ? (
                    <span className="font-mono text-[10px]">
                      ({product.quantityOffersCount})
                    </span>
                  ) : null}
                </button>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              isVariableProduct
                ? "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
            }`}
          >
            {isVariableProduct ? "متغيرات" : "بسيط"}
          </span>
          {isVariableProduct && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {product.variantsCount} متغير
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {isEditing ? (
          <input
            type="text"
            value={editSku}
            onChange={(e) => onEditSkuChange(e.target.value)}
            className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm"
            placeholder="SKU"
            dir="ltr"
          />
        ) : (
          <span className="text-sm text-gray-700 dark:text-gray-300" dir="ltr">
            {product.sku || <span className="text-gray-400">—</span>}
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {isEditing ? (
          <input
            type="number"
            value={editPrice}
            onChange={(e) => onEditPriceChange(e.target.value)}
            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm"
          />
        ) : (
          <>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{formatPrice(product.price)}</div>
            {product.comparePrice && (
              <div className="text-xs text-gray-400 line-through">{formatPrice(product.comparePrice)}</div>
            )}
          </>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {isEditing && canEditStock ? (
          <input
            type="number"
            value={editStock}
            onChange={(e) => onEditStockChange(e.target.value)}
            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm"
          />
        ) : (
          <>
            <div className="text-sm text-gray-900 dark:text-white">{product.stock} قطعة</div>
            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStockStatusColor(stockStatus)}`}>
              {getStockStatusText(stockStatus)}
            </span>
            {!canEditStock && stockLocationLabel && (
              <div className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-300">
                {stockLocationLabel}
              </div>
            )}
          </>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getWorkflowStatusColor(
              product.workflow.status,
            )}`}
          >
            {workflowLabel}
          </span>
          {product.isHidden && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
              <EyeSlashIcon className="h-3 w-3 ml-1" />
              مخفي
            </span>
          )}
          {product.workflow.rejectionReason && (
            <span className="max-w-[180px] truncate text-xs text-rose-600 dark:text-rose-300">
              سبب الرفض: {product.workflow.rejectionReason}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {formatDate(product.updatedAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center space-x-2 space-x-reverse">
          {isEditing ? (
            <>
              <button onClick={() => onSaveQuickEdit(product.id)} className={`${actionBtn} text-green-600 hover:text-green-900`} aria-label="حفظ" title="حفظ">
                <CheckCircleIcon className="h-4 w-4" />
              </button>
              <button onClick={onCancelQuickEdit} className={`${actionBtn} text-red-600 hover:text-red-900`} aria-label="إلغاء" title="إلغاء">
                <XCircleIcon className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openStorefront}
                className={`${actionBtn} text-indigo-600 hover:text-indigo-900`}
                aria-label={product.isActive ? "عرض في المتجر" : "معاينة قبل النشر"}
                title={product.isActive ? "عرض في المتجر" : "معاينة قبل النشر"}
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              <button onClick={() => window.open(`/products/${product.id}/edit`, "_blank", "noopener,noreferrer")} className={`${actionBtn} text-green-600 hover:text-green-900`} aria-label="تعديل" title="تعديل">
                <PencilIcon className="h-4 w-4" />
              </button>
              <button onClick={() => onStartQuickEdit(product)} className={`${actionBtn} text-blue-600 hover:text-blue-900`} aria-label="تعديل سريع" title="تعديل سريع">
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDuplicate(product)}
                disabled={!!duplicatingProductId}
                className={`transition-colors ${duplicatingProductId === product.id ? "text-purple-300 cursor-wait" : "text-purple-600 hover:text-purple-900"} disabled:opacity-50 ${actionBtn}`}
                aria-label={duplicatingProductId === product.id ? "جاري النسخ..." : "نسخ"}
                title={duplicatingProductId === product.id ? "جاري النسخ..." : "نسخ"}
              >
                {duplicatingProductId === product.id ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <DocumentDuplicateIcon className="h-4 w-4" />
                )}
              </button>
              {renderWorkflowActions()}
              {canDelete && (
                <button onClick={() => onDelete(product.id)} className={`${actionBtn} text-red-600 hover:text-red-900`} aria-label="حذف" title="حذف">
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

export default React.memo(ProductTableRow);
