import React from "react";
import { useTranslation } from "react-i18next";
import { Product, SortField, SortDirection } from "./ProductsTypes";
import ProductTableRow from "./ProductTableRow";

type WorkflowAction =
  | "save_draft"
  | "submit_review"
  | "approve"
  | "reject"
  | "publish"
  | "unpublish";

interface ProductsTableProps {
  products: Product[];
  selectedProducts: Set<string>;
  selectAll: boolean;
  onSelectAll: () => void;
  onSelectProduct: (id: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  formatPrice: (price: number) => string;
  formatDate: (date: Date) => string;
  getStorefrontUrl: (product: Pick<Product, "id" | "slug" | "workflow"> | string) => string;
  prepareStorefrontContext: () => void;
  editingProductId: string | null;
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
  canSelectProducts: boolean;
  canDeleteProducts: boolean;
  onDelete: (id: string) => void;
}

const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  selectedProducts,
  selectAll,
  onSelectAll,
  onSelectProduct,
  sortField,
  sortDirection,
  onSort,
  formatPrice,
  formatDate,
  getStorefrontUrl,
  prepareStorefrontContext,
  editingProductId,
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
  canSelectProducts,
  canDeleteProducts,
  onDelete,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  const SortIcon = ({ field }: { field: SortField }) => {
    const active = sortField === field;
    return (
      <span className={`text-xs ${active ? "text-indigo-600" : "text-gray-400"}`}>
        {active ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
      </span>
    );
  };

  const alignClass = isEn ? "text-left" : "text-right";

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
          <thead className="bg-zinc-50/80 dark:bg-zinc-850/80 border-b border-zinc-200/80 dark:border-zinc-800/80">
            <tr>
              {canSelectProducts && (
                <th className={`px-4 py-3.5 ${alignClass}`}>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={onSelectAll}
                    className="h-4 w-4 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-100 border-zinc-300 dark:border-zinc-700 rounded dark:bg-zinc-800"
                  />
                </th>
              )}
              {[
                { label: isEn ? "Product" : "المنتج", field: "name" as SortField },
                { label: isEn ? "Type" : "النوع", field: null },
                { label: "SKU", field: null },
                { label: isEn ? "Price" : "السعر", field: "price" as SortField },
                { label: isEn ? "Stock" : "المخزون", field: "stock" as SortField },
              ].map(({ label, field }) => {
                if (!field) {
                  return (
                    <th
                      key={label}
                      className={`px-4 py-3.5 ${alignClass} text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.08em]`}
                    >
                      {label}
                    </th>
                  );
                }

                return (
                  <th
                    key={field}
                    onClick={() => onSort(field)}
                    className={`px-4 py-3.5 ${alignClass} text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.08em] cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors select-none`}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon field={field} />
                    </div>
                  </th>
                );
              })}
              <th className={`px-4 py-3.5 ${alignClass} text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.08em]`}>
                {isEn ? "Status" : "الحالة"}
              </th>
              <th
                onClick={() => onSort("updatedAt")}
                className={`px-4 py-3.5 ${alignClass} text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.08em] cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors select-none`}
              >
                <div className="flex items-center gap-1">
                  {isEn ? "Last Updated" : "آخر تحديث"}
                  <SortIcon field="updatedAt" />
                </div>
              </th>
              <th className={`px-4 py-3.5 ${alignClass} text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.08em]`}>
                {isEn ? "Actions" : "الإجراءات"}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {products.map((product) => (
              <ProductTableRow
                key={product.id}
                product={product}
                selected={selectedProducts.has(product.id)}
                onSelect={onSelectProduct}
                canSelect={canSelectProducts}
                formatPrice={formatPrice}
                formatDate={formatDate}
                getStorefrontUrl={getStorefrontUrl}
                prepareStorefrontContext={prepareStorefrontContext}
                isEditing={editingProductId === product.id}
                editPrice={editPrice}
                editStock={editStock}
                editSku={editSku}
                onEditPriceChange={onEditPriceChange}
                onEditStockChange={onEditStockChange}
                onEditSkuChange={onEditSkuChange}
                onSaveQuickEdit={onSaveQuickEdit}
                onCancelQuickEdit={onCancelQuickEdit}
                onStartQuickEdit={onStartQuickEdit}
                onDuplicate={onDuplicate}
                duplicatingProductId={duplicatingProductId}
                workflowLoadingId={workflowLoadingId}
                onWorkflowAction={onWorkflowAction}
                canManageWorkflow={canManageWorkflow}
                canSubmitReviewWorkflow={canSubmitReviewWorkflow}
                canDelete={canDeleteProducts}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsTable;
