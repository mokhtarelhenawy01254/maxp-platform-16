import React from "react";
import { Package, RefreshCw } from "lucide-react";
import type {
  ReturnRequest,
  ReviewDisplayConfig,
} from "../../../services/returnService";
import { ReturnRequestsTableRow } from "./ReturnRequestsTableRow";
import { ReturnRequestsPagination } from "./ReturnRequestsPagination";

export interface ReturnRequestsTableProps {
  requests: ReturnRequest[];
  loading: boolean;
  displayConfig: ReviewDisplayConfig | null;
  responsiblePartyLabel: (role?: string | null) => string;
  copyTracking: (value: string) => Promise<void>;
  onSelectRequest: (request: ReturnRequest) => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  total: number;
  t: (key: string) => string;
}

export const ReturnRequestsTable: React.FC<ReturnRequestsTableProps> = ({
  requests,
  loading,
  displayConfig,
  responsiblePartyLabel,
  copyTracking,
  onSelectRequest,
  page,
  setPage,
  totalPages,
  total,
  t,
}) => {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border/60 text-right">
          <thead className="bg-muted/30 text-xs font-semibold text-muted-foreground">
            <tr>
              {displayConfig?.showOrderColumn !== false && (
                <th className="px-4 py-2.5">{t("returns.k_143")}</th>
              )}
              {displayConfig?.showCustomerColumn !== false && (
                <th className="px-4 py-2.5">{t("returns.k_49")}</th>
              )}
              {displayConfig?.showReasonColumn !== false && (
                <th className="px-4 py-2.5">{t("returns.k_57")}</th>
              )}
              {displayConfig?.showResponsiblePartyColumn !== false && (
                <th className="px-4 py-2.5">{t("returns.k_59")}</th>
              )}
              {displayConfig?.showTrackingColumn !== false && (
                <th className="px-4 py-2.5">{t("returns.k_221")}</th>
              )}
              {displayConfig?.showFinancialColumn !== false && (
                <th className="px-4 py-2.5">{t("returns.k_227")}</th>
              )}
              {displayConfig?.showDateColumn !== false && (
                <th className="px-4 py-2.5">{t("returns.k_65")}</th>
              )}
              {displayConfig?.showActionsColumn !== false && (
                <th className="px-4 py-2.5 text-center">{t("returns.k_67")}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {loading ? (
              <tr>
                <td
                  colSpan={99}
                  className="text-center py-12 text-muted-foreground space-y-2"
                >
                  <RefreshCw className="size-5 animate-spin mx-auto text-primary" />
                  <p>{t("returns.k_144")}</p>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={99} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package size={32} className="opacity-40" />
                    <span className="text-xs">{t("returns.k_145")}</span>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <ReturnRequestsTableRow
                  key={request.id}
                  request={request}
                  displayConfig={displayConfig}
                  responsiblePartyLabel={responsiblePartyLabel}
                  copyTracking={copyTracking}
                  onSelectRequest={onSelectRequest}
                  t={t}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Unified Pagination Bar */}
      <ReturnRequestsPagination
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        total={total}
        t={t}
      />
    </>
  );
};

export default ReturnRequestsTable;
