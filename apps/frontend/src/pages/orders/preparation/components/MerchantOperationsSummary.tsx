import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { apiClient } from "../../../../services/apiClient";
import { getApiErrorMessage } from "../helpers";
import {
  EMPTY_TOTALS,
  type MerchantOperationRow,
  type MerchantOperationsResponse,
  type MerchantOperationsSummaryProps,
  type MerchantOperationsTotals,
} from "./merchant/merchantTypes";
import MerchantOperationsKpis from "./merchant/MerchantOperationsKpis";
import MerchantOperationsTable from "./merchant/MerchantOperationsTable";

const MerchantOperationsSummary = ({
  formatPrice,
  formatDate,
}: MerchantOperationsSummaryProps) => {
  const { t } = useTranslation();
  const [totals, setTotals] = useState<MerchantOperationsTotals>(EMPTY_TOTALS);
  const [rows, setRows] = useState<MerchantOperationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchSummary = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const response = await apiClient.get<MerchantOperationsResponse>(
        "/merchant-portal/operations-summary",
      );
      const payload = response.data?.data || {};

      setTotals({
        ...EMPTY_TOTALS,
        ...(payload.summary || {}),
      });
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
    } catch (fetchError: unknown) {
      console.error("Failed to load merchant operations summary:", fetchError);
      setError(getApiErrorMessage(fetchError) || t("merchant.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header & Refresh */}
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            {t("merchant.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("merchant.summaryDesc", {
              ordersCount: totals.assignedOrdersCount,
              piecesCount: totals.preparationPieces,
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchSummary(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("merchant.refresh")}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {/* KPI Cards */}
      <MerchantOperationsKpis totals={totals} formatPrice={formatPrice} />

      {/* Table & Mobile Views */}
      <MerchantOperationsTable
        rows={rows}
        formatPrice={formatPrice}
        formatDate={formatDate}
      />
    </section>
  );
};

export default MerchantOperationsSummary;
