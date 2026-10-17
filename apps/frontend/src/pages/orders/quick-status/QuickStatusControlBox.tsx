import React from "react";
import { useTranslation } from "react-i18next";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { getSystemStatusOptions } from "../../../utils/statusRegistry";

interface QuickStatusControlBoxProps {
  inputRef: React.RefObject<HTMLInputElement>;
  orderCode: string;
  setOrderCode: (val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  siteStatuses: { id: string; name: string; code?: string }[];
  searchLoading: boolean;
  changeLoading: boolean;
  duplicateModal: { code: string; count: number } | null;
  currentOrder: { id: string; status: string } | null;
  handleSearch: () => void;
  handleChangeStatus: () => void;
  handleClear: () => void;
}

export const QuickStatusControlBox: React.FC<QuickStatusControlBoxProps> = ({
  inputRef,
  orderCode,
  setOrderCode,
  handleKeyDown,
  selectedStatus,
  setSelectedStatus,
  siteStatuses,
  searchLoading,
  changeLoading,
  duplicateModal,
  currentOrder,
  handleSearch,
  handleChangeStatus,
  handleClear,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-card rounded-2xl border border-border/70 shadow-xs p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-end">
        <div className="flex-1 w-full min-w-0">
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            {t("quickStatus.orderCode")}
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={String(t("quickStatus.orderCodePlaceholder"))}
              className="w-full px-4 py-2.5 pr-10 text-base sm:text-lg border border-border/70 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground placeholder-muted-foreground transition-colors tracking-wider font-mono tabular-nums"
              disabled={searchLoading || !!duplicateModal}
            />
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
          </div>
        </div>

        <div className="w-full lg:w-72">
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            {t("quickStatus.newStatus")}
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2.5 text-sm sm:text-base border border-border/70 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground transition-colors"
            disabled={changeLoading || !!duplicateModal}
          >
            <option value="">{t("quickStatus.selectStatus")}</option>
            {(siteStatuses.length > 0
              ? siteStatuses
              : getSystemStatusOptions().map((s) => ({
                  id: s.code,
                  name: s.label,
                }))
            ).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            onClick={handleSearch}
            disabled={searchLoading || !!duplicateModal || !orderCode.trim()}
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition font-semibold text-sm shadow-xs"
          >
            {searchLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>{t("quickStatus.search")}</span>
          </button>
          <button
            onClick={handleChangeStatus}
            disabled={
              changeLoading ||
              !!duplicateModal ||
              !currentOrder ||
              !selectedStatus ||
              selectedStatus === currentOrder?.status
            }
            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition font-semibold text-sm shadow-xs"
          >
            {changeLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            <span>{t("quickStatus.change")}</span>
          </button>
          <button
            onClick={handleClear}
            disabled={searchLoading || changeLoading || !!duplicateModal}
            className="inline-flex items-center justify-center px-3 py-2.5 bg-muted text-foreground rounded-xl hover:bg-muted/80 disabled:opacity-50 transition font-medium text-sm"
          >
            {t("quickStatus.clear")}
          </button>
        </div>
      </div>
    </div>
  );
};
