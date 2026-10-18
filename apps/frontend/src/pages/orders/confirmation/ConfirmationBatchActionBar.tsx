import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCheck, UserCheck } from "lucide-react";
import type { OrderConfirmationUser } from "./types";

export interface ConfirmationBatchActionBarProps {
  allSelected: boolean;
  selectedCount: number;
  bulkUserId: string;
  setBulkUserId: (val: string) => void;
  bulkProcessing: boolean;
  eligibleUsers: OrderConfirmationUser[];
  onToggleSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkAssign: () => void;
  onBulkConfirm: () => void;
}

export const ConfirmationBatchActionBar: React.FC<ConfirmationBatchActionBarProps> = ({
  allSelected,
  selectedCount,
  bulkUserId,
  setBulkUserId,
  bulkProcessing,
  eligibleUsers,
  onToggleSelectAll,
  onDeselectAll,
  onBulkAssign,
  onBulkConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Selection Checkbox and Counters */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 transition-all cursor-pointer"
              checked={allSelected}
              onChange={onToggleSelectAll}
            />
            <span>{t("orders.selectAll", { defaultValue: "تحديد الكل في هذه الصفحة" })}</span>
          </label>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {t("orders.selectedCount", { selectedCount, defaultValue: `تم تحديد ${selectedCount}` })}
          </span>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-xs font-semibold text-primary hover:underline transition-all cursor-pointer"
            >
              {t("orders.deselect", { defaultValue: "إلغاء التحديد" })}
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={bulkUserId}
            onChange={(e) => setBulkUserId(e.target.value)}
            className="h-10 px-3 border border-border/70 rounded-xl bg-background text-foreground text-xs min-w-[160px] focus:border-primary focus:outline-none transition-colors"
            disabled={eligibleUsers.length === 0 || selectedCount === 0}
          >
            <option value="">{t("orders.selectEmployeeToAssign", { defaultValue: "اختر موظفاً للتخصيص" })}</option>
            {eligibleUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || user.id}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onBulkAssign}
            disabled={selectedCount === 0 || !bulkUserId || bulkProcessing}
            className="inline-flex h-10 items-center gap-1.5 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 hover:bg-primary/90 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <UserCheck className="h-4 w-4" />
            <span>{t("orders.bulkAssign", { defaultValue: "تخصيص جماعي" })}</span>
          </button>

          <button
            type="button"
            onClick={onBulkConfirm}
            disabled={selectedCount === 0 || bulkProcessing}
            className="inline-flex h-10 items-center gap-1.5 px-3.5 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 hover:bg-emerald-700 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <CheckCheck className="h-4 w-4" />
            <span>{t("orders.bulkConfirm", { defaultValue: "تأكيد جماعي" })}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationBatchActionBar;
