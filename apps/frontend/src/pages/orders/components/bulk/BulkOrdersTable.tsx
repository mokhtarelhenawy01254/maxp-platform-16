import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit2,
  Play,
  Copy,
  Loader2,
  Layers,
} from "lucide-react";
import { getStatusDisplay } from "../../../../utils/statusRegistry";

interface BulkOrder {
  id: string;
  operationNumber: string;
  name: string;
  totalOrders: number;
  status: string;
  progress: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
}

interface BulkOrdersTableProps {
  loading: boolean;
  data: BulkOrder[];
  selectedIds: string[];
  selectAll: boolean;
  handleSelectAll: () => void;
  handleSelect: (id: string) => void;
  sortBy: string;
  sortOrder: string;
  handleSort: (col: string) => void;
  canEdit: boolean;
  activeActions: Set<string>;
  setViewingItem: (id: string) => void;
  setEditingItem: (item: BulkOrder) => void;
  setShowModal: (show: boolean) => void;
  handleExecute: (id: string) => void;
  handleDuplicate: (id: string) => void;
}

export const BulkOrdersTable: React.FC<BulkOrdersTableProps> = ({
  loading,
  data,
  selectedIds,
  selectAll,
  handleSelectAll,
  handleSelect,
  sortBy,
  sortOrder,
  handleSort,
  canEdit,
  activeActions,
  setViewingItem,
  setEditingItem,
  setShowModal,
  handleExecute,
  handleDuplicate,
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const SortHeader = ({ column, label }: { column: string; label: string }) => {
    const isCurrent = sortBy === column;
    return (
      <th
        className="px-3.5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          {isCurrent ? (
            sortOrder === "asc" ? (
              <ArrowUp size={12} className="text-primary" />
            ) : (
              <ArrowDown size={12} className="text-primary" />
            )
          ) : (
            <ArrowUpDown size={11} className="text-muted-foreground/50" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-right">
        <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground font-semibold">
          <tr>
            <th className="px-3.5 py-3 w-10 text-center">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="rounded border-border/70 text-primary focus:ring-primary"
              />
            </th>
            <SortHeader column="operationNumber" label={t("orders.bulkOperationNumber")} />
            <SortHeader column="name" label={t("orders.bulkOperationName")} />
            <SortHeader column="totalOrders" label={t("orders.bulkTotalOrders")} />
            <SortHeader column="status" label={t("orders.bulkStatus")} />
            <SortHeader column="progress" label={t("orders.bulkProgress")} />
            <SortHeader column="createdByName" label={t("orders.bulkCreatedBy")} />
            <SortHeader column="createdAt" label={t("orders.bulkCreatedAt")} />
            <SortHeader column="updatedAt" label={t("orders.bulkUpdatedAt")} />
            <th className="px-3.5 py-3 text-xs font-semibold text-muted-foreground text-center">
              {t("orders.bulkActions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {loading ? (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin text-primary" />
                  <span>{t("orders.loadingOrders") || "جاري التحميل…"}</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Layers size={36} className="text-muted-foreground/40" />
                  <p className="font-bold text-foreground text-sm">{t("orders.bulkNoData")}</p>
                  <p className="text-xs text-muted-foreground">{t("orders.bulkNoDataDesc")}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const info = getStatusDisplay(item.status);
              return (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3.5 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => handleSelect(item.id)}
                      className="rounded border-border/70 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-3.5 py-3 font-mono font-bold text-primary tabular-nums" dir="ltr">
                    {item.operationNumber}
                  </td>
                  <td className="px-3.5 py-3 font-bold text-foreground">
                    {item.name}
                  </td>
                  <td className="px-3.5 py-3 font-mono font-bold tabular-nums text-foreground">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-full bg-muted/60 text-xs font-bold border border-border/40">
                      {item.totalOrders}
                    </span>
                  </td>
                  <td className="px-3.5 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${info.colorClass}`}>
                      {t(info.labelKey) || info.label}
                    </span>
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[60px]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.progress === 100
                              ? "bg-emerald-500"
                              : item.progress > 50
                              ? "bg-primary"
                              : item.progress > 0
                              ? "bg-amber-500"
                              : "bg-muted-foreground/30"
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono tabular-nums text-muted-foreground min-w-[2.5rem]">
                        {item.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3.5 py-3 text-muted-foreground">
                    {item.createdByName || "—"}
                  </td>
                  <td className="px-3.5 py-3 text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                    {new Date(item.createdAt).toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-3.5 py-3 text-muted-foreground whitespace-nowrap font-mono tabular-nums">
                    {new Date(item.updatedAt).toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-3.5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewingItem(item.id)}
                        className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title={t("orders.bulkView")}
                      >
                        <Eye size={13} />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setShowModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          title={t("orders.bulkEdit")}
                          disabled={activeActions.has(`exec-${item.id}`)}
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleExecute(item.id)}
                          className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400 transition-colors disabled:opacity-50"
                          title={t("orders.bulkExecute")}
                          disabled={
                            activeActions.has(`exec-${item.id}`) ||
                            item.status === "COMPLETED" ||
                            item.status === "CANCELLED" ||
                            item.status === "PROCESSING"
                          }
                        >
                          {activeActions.has(`exec-${item.id}`) ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Play size={13} />
                          )}
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDuplicate(item.id)}
                          className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          title={t("orders.bulkDuplicate")}
                          disabled={activeActions.has(`dup-${item.id}`)}
                        >
                          {activeActions.has(`dup-${item.id}`) ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
