import React from "react";
import { useTranslation } from "react-i18next";
import {
  PREPARATION_COLUMN_LABEL_KEYS,
  type PreparationTableColumn,
} from "../../constants";

interface PreparationOrdersTableHeaderProps {
  visibleColumns: PreparationTableColumn[];
}

export const PreparationOrdersTableHeader: React.FC<PreparationOrdersTableHeaderProps> = ({
  visibleColumns,
}) => {
  const { t } = useTranslation();

  return (
    <thead>
      <tr className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200">
        <th className="w-10 px-3 py-2.5">
          <span className="sr-only">{t("preparation.table.selectColumn")}</span>
        </th>
        <th className="px-3 py-2.5">{t("preparation.table.orderNumber")}</th>
        {visibleColumns.includes("customer") && (
          <th className="px-3 py-2.5">{t(PREPARATION_COLUMN_LABEL_KEYS.customer)}</th>
        )}
        {visibleColumns.includes("units") && (
          <th className="px-3 py-2.5">{t(PREPARATION_COLUMN_LABEL_KEYS.units)}</th>
        )}
        {visibleColumns.includes("value") && (
          <th className="px-3 py-2.5">{t(PREPARATION_COLUMN_LABEL_KEYS.value)}</th>
        )}
        {visibleColumns.includes("status") && (
          <th className="px-3 py-2.5">{t(PREPARATION_COLUMN_LABEL_KEYS.status)}</th>
        )}
        {visibleColumns.includes("problem") && (
          <th className="px-3 py-2.5">{t(PREPARATION_COLUMN_LABEL_KEYS.problem)}</th>
        )}
        {visibleColumns.includes("warehouse") && (
          <th className="px-3 py-2.5">{t(PREPARATION_COLUMN_LABEL_KEYS.warehouse)}</th>
        )}
        {visibleColumns.includes("readiness") && (
          <th className="px-3 py-2.5">{t(PREPARATION_COLUMN_LABEL_KEYS.readiness)}</th>
        )}
        {visibleColumns.includes("printStatus") && (
          <th className="px-3 py-2.5">{t(PREPARATION_COLUMN_LABEL_KEYS.printStatus)}</th>
        )}
        {visibleColumns.includes("shippingCode") && (
          <th className="px-3 py-2.5">{t(PREPARATION_COLUMN_LABEL_KEYS.shippingCode)}</th>
        )}
        <th className="w-20 px-3 py-2.5">
          <span className="sr-only">{t("preparation.table.detailsColumn")}</span>
        </th>
      </tr>
    </thead>
  );
};

export default PreparationOrdersTableHeader;
