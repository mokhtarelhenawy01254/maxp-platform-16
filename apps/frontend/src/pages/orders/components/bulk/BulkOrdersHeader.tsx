import React from "react";
import { useTranslation } from "react-i18next";
import { Layers, Plus, Trash2 } from "lucide-react";

export interface BulkOrdersHeaderProps {
  selectedCount: number;
  canCreate?: boolean;
  canDelete?: boolean;
  onOpenCreateModal: () => void;
  onConfirmDeleteMultiple: () => void;
}

export const BulkOrdersHeader: React.FC<BulkOrdersHeaderProps> = ({
  selectedCount,
  canCreate,
  canDelete,
  onOpenCreateModal,
  onConfirmDeleteMultiple,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Layers size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">
              {t("orders.bulkOrders")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("orders.bulkOrdersSubtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {selectedCount > 0 && canDelete && (
          <button
            type="button"
            onClick={onConfirmDeleteMultiple}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-destructive text-destructive-foreground rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-xs hover:bg-destructive/90 cursor-pointer"
          >
            <Trash2 size={13} />
            <span>{t("orders.deleteSelected")} ({selectedCount})</span>
          </button>
        )}
        {canCreate && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-xs hover:bg-primary/90 cursor-pointer"
          >
            <Plus size={14} />
            <span>{t("orders.bulkCreateNew")}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default BulkOrdersHeader;
