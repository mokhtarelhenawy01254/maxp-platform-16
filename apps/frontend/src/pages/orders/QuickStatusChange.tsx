import React from "react";
import { useTranslation } from "react-i18next";
import { Search, RotateCcw, AlertCircle } from "lucide-react";
import { getStatusDisplay } from "../../utils/statusRegistry";
import { QuickStatusDuplicateModal } from "./quick-status/QuickStatusDuplicateModal";
import { QuickStatusChangeLog } from "./quick-status/QuickStatusChangeLog";
import { QuickStatusCurrentOrderCard } from "./quick-status/QuickStatusCurrentOrderCard";
import { QuickStatusControlBox } from "./quick-status/QuickStatusControlBox";
import { useQuickStatusChange } from "./quick-status/useQuickStatusChange";

const StatusBadge: React.FC<{ status: string; label?: string }> = ({
  status,
  label,
}) => {
  const { t } = useTranslation();
  const info = getStatusDisplay(status);
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${info.colorClass}`}
    >
      {label || t(info.labelKey) || info.label}
    </span>
  );
};

export const QuickStatusChange: React.FC = () => {
  const { t } = useTranslation();
  const {
    inputRef,
    orderCode,
    setOrderCode,
    selectedStatus,
    setSelectedStatus,
    currentOrder,
    changeLog,
    setChangeLog,
    searchLoading,
    changeLoading,
    hasSearched,
    searchError,
    duplicateModal,
    setDuplicateModal,
    siteStatuses,
    handleSearch,
    handleChangeStatus,
    handleKeyDown,
    handleClear,
    getStatusDisplayName,
  } = useQuickStatusChange();

  return (
    <div
      className="p-4 sm:p-6 w-full max-w-7xl mx-auto space-y-4 sm:space-y-6"
      dir="rtl"
    >
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <RotateCcw className="text-primary" size={26} />
          {t("quickStatus.title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {t("quickStatus.description")}
        </p>
      </div>

      <QuickStatusControlBox
        inputRef={inputRef}
        orderCode={orderCode}
        setOrderCode={setOrderCode}
        handleKeyDown={handleKeyDown}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        siteStatuses={siteStatuses}
        searchLoading={searchLoading}
        changeLoading={changeLoading}
        duplicateModal={duplicateModal}
        currentOrder={currentOrder}
        handleSearch={handleSearch}
        handleChangeStatus={handleChangeStatus}
        handleClear={handleClear}
      />

      {searchError && !searchLoading && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 shrink-0" size={16} />
          <p>{searchError}</p>
        </div>
      )}

      {duplicateModal && (
        <QuickStatusDuplicateModal
          duplicateModal={duplicateModal}
          onClose={() => {
            setDuplicateModal(null);
            setOrderCode("");
            inputRef.current?.focus();
          }}
        />
      )}

      {currentOrder && !searchLoading && (
        <QuickStatusCurrentOrderCard
          currentOrder={currentOrder}
          getStatusDisplayName={getStatusDisplayName}
          renderStatusBadge={(st, lb) => <StatusBadge status={st} label={lb} />}
        />
      )}

      <QuickStatusChangeLog
        changeLog={changeLog}
        getStatusDisplayName={getStatusDisplayName}
        onClearLog={() => setChangeLog([])}
        renderStatusBadge={(st, lb) => <StatusBadge status={st} label={lb} />}
      />

      {hasSearched && !currentOrder && !searchLoading && !searchError && (
        <div className="bg-card rounded-2xl border border-border/70 shadow-xs p-8 sm:p-12 text-center">
          <Search className="mx-auto text-muted-foreground/60 mb-3" size={48} />
          <h3 className="text-base font-bold text-foreground mb-1">
            {t("quickStatus.noResults")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("quickStatus.searchFirst")}
          </p>
        </div>
      )}
    </div>
  );
};

export default QuickStatusChange;
