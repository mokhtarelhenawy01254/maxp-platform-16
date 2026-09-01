import React from "react";
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
  DocumentDuplicateIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
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
  canDelete,
  onDelete,
}) => {
  const stockStatus = getStockStatus(product.stock);
  const stockColor = getStockStatusColor(stockStatus);
  const stockText = getStockStatusText(stockStatus);

  const mainImage = product.mainImage || (product.images && product.images[0]);
  const imageUrl = getImageUrl(mainImage, "thumbnail");

  return (
    <div
      className={`rounded-2xl border p-3.5 transition-all ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/70 bg-card hover:border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        {canSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(product.id)}
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
        )}

        {/* Product Image */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted/40 border border-border/50">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <PhotoIcon className="h-6 w-6 opacity-40" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h4 className="truncate text-xs font-black text-foreground">
              {product.name}
            </h4>
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${stockColor}`}>
              {stockText}
            </span>
          </div>

          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
            {product.sku || "بدون SKU"}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-black text-primary">
              {formatPrice(product.price)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              المخزون: <strong className="text-foreground">{product.stock}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Edit or Action Bar */}
      {isEditing ? (
        <div className="mt-3 border-t border-border/60 pt-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[9px] text-muted-foreground">السعر</label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => onEditPriceChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="block text-[9px] text-muted-foreground">المخزون</label>
              <input
                type="number"
                value={editStock}
                onChange={(e) => onEditStockChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="block text-[9px] text-muted-foreground">SKU</label>
              <input
                type="text"
                value={editSku}
                onChange={(e) => onEditSkuChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancelQuickEdit}
              className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:bg-muted"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => onSaveQuickEdit(product.id)}
              className="rounded-lg bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground shadow"
            >
              حفظ
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onStartQuickEdit(product)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="تعديل سريع"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(product)}
              disabled={duplicatingProductId === product.id}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              title="تكرار المنتج"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(product.id)}
                className="rounded-lg p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                title="حذف المنتج"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <a
            href={getStorefrontUrl(product)}
            target="_blank"
            rel="noreferrer"
            onClick={() => prepareStorefrontContext()}
            className="flex items-center gap-1 rounded-lg bg-muted/60 px-2.5 py-1 text-[10px] font-bold text-foreground hover:bg-muted"
          >
            <EyeIcon className="h-3.5 w-3.5" />
            <span>عرض بالمتجر</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default ProductMobileCard;
