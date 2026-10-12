import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  const stockStatus = getStockStatus(product);
  const isVariableProduct = product.productType === "variable";
  const isWorkflowBusy = workflowLoadingId === product.id;
  const workflowLabel = getWorkflowStatusLabel(product.workflow.status, product.workflow, isEn);
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
        .map((o) =>
          o.buyText ||
          (isEn
            ? `${o.quantity} pcs for ${o.unitPrice}`
            : `${o.quantity} قطع بسعر ${o.unitPrice}`)
        )
        .join(" | ");
      return isEn
        ? `Quantity Offers: ${summary}${product.quantityOffers.length > 3 ? "..." : ""} (click to edit)`
        : `عروض الكميات: ${summary}${product.quantityOffers.length > 3 ? "..." : ""} (انقر للتعديل)`;
    }
    return isEn
      ? "This product has active quantity offers or volume discounts (click to edit)"
      : `يحتوي هذا المنتج على عروض كميات أو خصومات حجمية نشطة (انقر للتعديل)`;
  }, [product, isEn]);

  const openStorefront = () => {
    prepareStorefrontContext();
    window.open(getStorefrontUrl(product), "_blank", "noopener,noreferrer");
  };

  const actionBtn =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all duration-150 active:scale-[0.94]";
  const renderWorkflowActions = () => {
    if (canSubmitReviewWorkflow && canSubmitReview(product.workflow)) {
      return (
        <button
          onClick={() => onWorkflowAction(product, "submit_review")}
          disabled={isWorkflowBusy}
          className={`${actionBtn} text-amber-600 hover:text-amber-700 disabled:cursor-wait disabled:opacity-50`}
          aria-label={isEn ? "Submit for review" : "إرسال للمراجعة"}
          title={isEn ? "Submit for review" : "إرسال للمراجعة"}
        >
          <PaperAirplaneIcon className="h-3.5 w-3.5" />
        </button>
      );
    }

    if (canManageWorkflow && (canApprove(product.workflow) || canReject(product.workflow))) {
      return (
        <>
          <button
            onClick={() => onWorkflowAction(product, "approve")}
            disabled={isWorkflowBusy}
            className={`${actionBtn} text-emerald-600 hover:text-emerald-700 disabled:cursor-wait disabled:opacity-50`}
            aria-label={isEn ? "Approve" : "اعتماد"}
            title={isEn ? "Approve" : "اعتماد"}
          >
            <CheckCircleIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onWorkflowAction(product, "reject")}
            disabled={isWorkflowBusy}
            className={`${actionBtn} text-rose-600 hover:text-rose-700 disabled:cursor-wait disabled:opacity-50`}
            aria-label={isEn ? "Reject" : "رفض"}
            title={isEn ? "Reject" : "رفض"}
          >
            <XCircleIcon className="h-3.5 w-3.5" />
          </button>
        </>
      );
    }

    if (canManageWorkflow && canPublish(product.workflow)) {
      return (
        <button
          onClick={() => onWorkflowAction(product, "publish")}
          disabled={isWorkflowBusy}
          className={`${actionBtn} text-emerald-600 hover:text-emerald-700 disabled:cursor-wait disabled:opacity-50`}
          aria-label={isEn ? "Publish" : "نشر"}
          title={isEn ? "Publish" : "نشر"}
        >
          <CheckCircleIcon className="h-3.5 w-3.5" />
        </button>
      );
    }

    if (canManageWorkflow && canUnpublish(product.workflow)) {
      return (
        <button
          onClick={() => onWorkflowAction(product, "unpublish")}
          disabled={isWorkflowBusy}
          className={`${actionBtn} text-amber-600 hover:text-amber-700 disabled:cursor-wait disabled:opacity-50`}
          aria-label={isEn ? "Unpublish" : "إلغاء النشر"}
          title={isEn ? "Unpublish" : "إلغاء النشر"}
        >
          <XCircleIcon className="h-3.5 w-3.5" />
        </button>
      );
    }

    return null;
  };

  return (
    <tr
      className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors ${selected ? "bg-zinc-100/70 dark:bg-zinc-800/60" : ""}`}
    >
      {canSelect && (
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(product.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-100 border-zinc-300 dark:border-zinc-700 rounded dark:bg-zinc-800"
          />
        </td>
      )}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <a
            href={getStorefrontUrl(product)}
            onClick={prepareStorefrontContext}
            className="flex-shrink-0 h-14 w-14 relative hover:opacity-90 transition-opacity"
          >
            {hasImage && !imageError ? (
              <img
                src={getImageUrl(product.mainImage || product.images[0], "thumbnail") || ""}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className="h-14 w-14 rounded-lg object-cover shadow-2xs border border-zinc-200/80 dark:border-zinc-700"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/80 dark:border-zinc-700">
                <PhotoIcon className="h-6 w-6 text-zinc-400" />
              </div>
            )}
          </a>
          <div className="flex flex-col gap-0.5 min-w-0">
            <a
              href={getStorefrontUrl(product)}
              onClick={prepareStorefrontContext}
              className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors truncate max-w-xs block"
            >
              {product.name}
            </a>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">{product.category}</span>
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
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors shadow-2xs"
                >
                  <SparklesIcon className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{isEn ? "Volume" : "عروض كميات"}</span>
                  {product.quantityOffersCount ? (
                    <span className="font-mono text-[9px] tabular-nums">
                      ({product.quantityOffersCount})
                    </span>
                  ) : null}
                </button>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <span
            className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${
              isVariableProduct
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700"
                : "bg-zinc-50 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800"
            }`}
          >
            {isVariableProduct ? (isEn ? "Variable" : "متغيرات") : (isEn ? "Simple" : "بسيط")}
          </span>
          {isVariableProduct && (
            <span className="text-[10px] font-mono tabular-nums text-zinc-400 dark:text-zinc-500">
              {product.variantsCount} {isEn ? (product.variantsCount === 1 ? "variant" : "variants") : "متغير"}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {isEditing ? (
          <input
            type="text"
            value={editSku}
            onChange={(e) => onEditSkuChange(e.target.value)}
            className="w-28 px-2 py-1 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded text-xs font-mono"
            placeholder="SKU"
            dir="ltr"
          />
        ) : (
          <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400" dir="ltr">
            {product.sku || <span className="text-zinc-400">-</span>}
          </span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {isEditing ? (
          <input
            type="number"
            value={editPrice}
            onChange={(e) => onEditPriceChange(e.target.value)}
            className="w-24 px-2 py-1 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded text-xs font-mono tabular-nums"
          />
        ) : (
          <>
            <div className="text-xs sm:text-sm font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">{formatPrice(product.price)}</div>
            {product.comparePrice && (
              <div className="text-[11px] font-mono tabular-nums text-zinc-400 line-through">{formatPrice(product.comparePrice)}</div>
            )}
          </>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {isEditing && canEditStock ? (
          <input
            type="number"
            value={editStock}
            onChange={(e) => onEditStockChange(e.target.value)}
            className="w-20 px-2 py-1 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded text-xs font-mono tabular-nums"
          />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="text-xs font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">{product.stock} {isEn ? "pcs" : "قطعة"}</div>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md w-fit ${getStockStatusColor(stockStatus)}`}>
              {getStockStatusText(stockStatus, isEn)}
            </span>
            {!canEditStock && stockLocationLabel && (
              <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 font-mono">
                {stockLocationLabel}
              </div>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-md w-fit ${getWorkflowStatusColor(
              product.workflow.status,
              product.workflow,
            )}`}
          >
            {workflowLabel}
          </span>
          {product.isHidden && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 w-fit">
              <EyeSlashIcon className="h-3 w-3" />
              {isEn ? "Hidden" : "مخفي"}
            </span>
          )}
          {product.workflow.rejectionReason && (
            <span className="max-w-[180px] truncate text-[10px] text-rose-600 dark:text-rose-400 font-mono">
              {isEn ? "Reason: " : "السبب: "}{product.workflow.rejectionReason}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono tabular-nums text-zinc-400 dark:text-zinc-500">
        {formatDate(product.updatedAt)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={() => onSaveQuickEdit(product.id)}
                className={`${actionBtn} text-emerald-600 hover:text-emerald-700`}
                aria-label={isEn ? "Save" : "حفظ"}
                title={isEn ? "Save" : "حفظ"}
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
              <button
                onClick={onCancelQuickEdit}
                className={`${actionBtn} text-rose-600 hover:text-rose-700`}
                aria-label={isEn ? "Cancel" : "إلغاء"}
                title={isEn ? "Cancel" : "إلغاء"}
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={openStorefront}
                className={`${actionBtn}`}
                aria-label={product.isActive ? (isEn ? "View in store" : "عرض في المتجر") : (isEn ? "Preview before publishing" : "معاينة قبل النشر")}
                title={product.isActive ? (isEn ? "View in store" : "عرض في المتجر") : (isEn ? "Preview before publishing" : "معاينة قبل النشر")}
              >
                <EyeIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => window.open(`/products/${product.id}/edit`, "_blank", "noopener,noreferrer")}
                className={`${actionBtn}`}
                aria-label={isEn ? "Edit" : "تعديل"}
                title={isEn ? "Edit" : "تعديل"}
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onStartQuickEdit(product)}
                className={`${actionBtn}`}
                aria-label={isEn ? "Quick Edit" : "تعديل سريع"}
                title={isEn ? "Quick Edit" : "تعديل سريع"}
              >
                <PencilIcon className="h-3.5 w-3.5 text-zinc-400" />
              </button>
              <button
                onClick={() => onDuplicate(product)}
                disabled={!!duplicatingProductId}
                className={`${actionBtn} disabled:opacity-50`}
                aria-label={duplicatingProductId === product.id ? (isEn ? "Duplicating..." : "جاري النسخ...") : (isEn ? "Duplicate" : "نسخ")}
                title={duplicatingProductId === product.id ? (isEn ? "Duplicating..." : "جاري النسخ...") : (isEn ? "Duplicate" : "نسخ")}
              >
                <DocumentDuplicateIcon className="h-3.5 w-3.5" />
              </button>
              {renderWorkflowActions()}
              {canDelete && (
                <button
                  onClick={() => onDelete(product.id)}
                  className={`${actionBtn} hover:text-rose-600`}
                  aria-label={isEn ? "Delete" : "حذف"}
                  title={isEn ? "Delete" : "حذف"}
                >
                  <TrashIcon className="h-3.5 w-3.5" />
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

