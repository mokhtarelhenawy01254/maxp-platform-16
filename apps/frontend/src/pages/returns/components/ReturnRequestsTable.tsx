import React from "react";
import { Package, RefreshCw, Eye, Copy } from "lucide-react";
import type { ReturnRequest, ReviewDisplayConfig } from "../../../services/returnService";

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
  const getRatingBadge = (rating: string | undefined) => {
    if (!rating) return null;
    switch (rating) {
      case "EXCELLENT":
        return (
          <span className="mr-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
            {t("returns.k_136")}
          </span>
        );
      case "GOOD":
        return (
          <span className="mr-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
            {t("returns.k_137")}
          </span>
        );
      case "AVERAGE":
        return (
          <span className="mr-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
            {t("returns.k_138")}
          </span>
        );
      case "BAD":
        return (
          <span className="mr-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
            {t("returns.k_139")}
          </span>
        );
      default:
        return null;
    }
  };
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
                <td colSpan={99} className="text-center py-12 text-muted-foreground space-y-2">
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
                <tr key={request.id} className="hover:bg-muted/20 transition-colors">
                  {displayConfig?.showOrderColumn !== false && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-foreground">
                        {request.order?.orderNumber || t("returns.k_21")}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        {request.refundAmount
                          ? `${request.refundAmount} ${request.order?.currency || t("returns.k_22")}`
                          : "—"}
                      </div>
                    </td>
                  )}
                  {displayConfig?.showCustomerColumn !== false && (
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground flex items-center gap-1.5">
                        <span>
                          {request.customer?.firstName} {request.customer?.lastName}
                        </span>
                        {displayConfig?.showCustomerRating !== false &&
                          getRatingBadge(request.customer?.customerRating)}
                      </div>
                      {displayConfig?.showCustomerPhone !== false && (
                        <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
                          {request.customer?.phone}
                        </div>
                      )}
                      {displayConfig?.showCustomerSuccessScore !== false && (
                        <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                          نسبة النجاح: {request.customer?.successScore?.toFixed(1)}%
                        </div>
                      )}
                    </td>
                  )}
                  {displayConfig?.showReasonColumn !== false && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {request.reason ? (
                        <>
                          <div className="text-foreground">{request.reason.reason}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {request.reason.category?.name}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  {displayConfig?.showResponsiblePartyColumn !== false && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {request.responsibleParty ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            request.responsibleParty === "CUSTOMER"
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                              : request.responsibleParty === "STORE"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border/60"
                          }`}
                        >
                          {responsiblePartyLabel(request.responsibleParty)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  {displayConfig?.showTrackingColumn !== false && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {request.trackingNumber ? (
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <span
                            className="font-mono text-xs text-muted-foreground"
                            title={t("returns.k_223")}
                          >
                            {request.trackingNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyTracking(request.trackingNumber!)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                            title={t("returns.k_224")}
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  {displayConfig?.showFinancialColumn !== false && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {request.returnType && (
                        <div className="mb-1 flex items-center gap-1">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border/60 bg-muted/40 text-foreground">
                            {request.returnType.name}
                          </span>
                          {request.shippingCompany?.name && (
                            <span className="text-[10px] text-muted-foreground">
                              {request.shippingCompany.name}
                            </span>
                          )}
                        </div>
                      )}
                      {(request.shippingReturnCost !== undefined &&
                        request.shippingReturnCost !== null) ||
                      (request.settlementAmount !== undefined &&
                        request.settlementAmount !== null) ? (
                        <div className="font-mono text-[11px] tabular-nums space-y-0.5">
                          {request.shippingReturnCost !== undefined &&
                            request.shippingReturnCost !== null && (
                              <div className="text-rose-600 dark:text-rose-400">
                                {t("returns.k_228")}: {request.shippingReturnCost}{" "}
                                {request.order?.currency || t("returns.k_22")}
                              </div>
                            )}
                          {request.settlementAmount !== undefined &&
                            request.settlementAmount !== null && (
                              <div
                                className={
                                  request.settlementAmount >= 0
                                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                    : "text-rose-600 dark:text-rose-400 font-bold"
                                }
                              >
                                {t("returns.k_229")}: {request.settlementAmount}{" "}
                                {request.order?.currency || t("returns.k_22")}
                              </div>
                            )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  {displayConfig?.showDateColumn !== false && (
                    <td
                      className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground"
                      title={t("returns.k_222")}
                    >
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                  )}
                  {displayConfig?.showActionsColumn !== false && (
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => onSelectRequest(request)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/80 bg-background/80 hover:bg-muted text-foreground transition active:scale-[0.98]"
                        title={t("returns.k_24")}
                      >
                        <Eye size={13} className="text-muted-foreground" />
                        <span>عرض</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Unified Pagination Bar */}
      {totalPages > 1 && (
        <div className="border-t border-border/70 p-3 bg-muted/10 flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">
            {t("returns.k_149")} {total} · صفحة {page} من {totalPages}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-7 px-2.5 text-xs font-medium rounded border border-border/80 bg-background/80 hover:bg-muted text-foreground disabled:opacity-40 transition active:scale-[0.98]"
            >
              السابق
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center gap-1">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-1 text-xs text-muted-foreground">…</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPage(p)}
                    className={`h-7 min-w-7 px-2 text-xs font-mono tabular-nums rounded transition ${
                      page === p
                        ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                        : "border border-border/80 bg-background/80 hover:bg-muted text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-7 px-2.5 text-xs font-medium rounded border border-border/80 bg-background/80 hover:bg-muted text-foreground disabled:opacity-40 transition active:scale-[0.98]"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </>
  );
};
