import React from "react";
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
  onEditPriceChange: (value: string) => void;
  onEditStockChange: (value: string) => void;
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
  onEditPriceChange,
  onEditStockChange,
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
  const SortIcon = ({ field }: { field: SortField }) => {
    const active = sortField === field;
    return (
      <span className={`text-xs ${active ? "text-indigo-600" : "text-gray-400"}`}>
        {active ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
      </span>
    );
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50/80 dark:bg-gray-900/80">
            <tr>
              {canSelectProducts && (
                <th className="px-4 py-3 text-right">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={onSelectAll}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                  />
                </th>
              )}
              {[
                { label: "المنتج", field: "name" as SortField },
                { label: "النوع", field: null },
                { label: "السعر", field: "price" as SortField },
                { label: "المخزون", field: "stock" as SortField },
              ].map(({ label, field }) => {
                if (!field) {
                  return (
                    <th
                      key={label}
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {label}
                    </th>
                  );
                }

                return (
                  <th
                    key={field}
                    onClick={() => onSort(field)}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon field={field} />
                    </div>
                  </th>
                );
              })}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الحالة</th>
              <th
                onClick={() => onSort("updatedAt")}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-1">
                  آخر تحديث
                  <SortIcon field="updatedAt" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white/60 dark:bg-gray-800/60 divide-y divide-gray-200 dark:divide-gray-700">
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
                onEditPriceChange={onEditPriceChange}
                onEditStockChange={onEditStockChange}
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
