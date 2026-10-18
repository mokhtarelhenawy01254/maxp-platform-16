import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ORDER_TABLE_COLUMNS,
  normalizeOrderTableColumns,
  type OrderTableColumn,
} from "../utils/ordersTableHelpers";

export type TableDensity = "comfortable" | "compact";

export interface UseOrdersTableSettingsOptions {
  companyOrdersTableColumns?: unknown;
  canSelectOrders?: boolean;
}

export function useOrdersTableSettings({
  companyOrdersTableColumns,
  canSelectOrders = false,
}: UseOrdersTableSettingsOptions = {}) {
  const [tableDensity, setTableDensity] = useState<TableDensity>(() => {
    try {
      return typeof window !== "undefined" &&
        window.localStorage?.getItem("orders:table-density") === "compact"
        ? "compact"
        : "comfortable";
    } catch {
      return "comfortable";
    }
  });

  const changeTableDensity = useCallback((density: TableDensity) => {
    setTableDensity(density);
    try {
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("orders:table-density", density);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const [visibleColumns, setVisibleColumns] = useState<OrderTableColumn[]>(() =>
    normalizeOrderTableColumns(companyOrdersTableColumns),
  );

  useEffect(() => {
    const normalized = normalizeOrderTableColumns(companyOrdersTableColumns);
    setVisibleColumns(normalized);
  }, [companyOrdersTableColumns]);

  const columnsToRender = useMemo(
    () => ORDER_TABLE_COLUMNS.filter((col) => visibleColumns.includes(col)),
    [visibleColumns],
  );

  const tableColumnCount = useMemo(
    () => (canSelectOrders ? 1 : 0) + columnsToRender.length,
    [canSelectOrders, columnsToRender.length],
  );

  return {
    tableDensity,
    setTableDensity,
    changeTableDensity,
    visibleColumns,
    setVisibleColumns,
    columnsToRender,
    tableColumnCount,
  };
}
