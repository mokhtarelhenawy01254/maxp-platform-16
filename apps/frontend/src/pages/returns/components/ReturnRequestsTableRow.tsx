import React from "react";
import { Eye, Copy } from "lucide-react";
import type {
  ReturnRequest,
  ReviewDisplayConfig,
} from "../../../services/returnService";

export interface ReturnRequestsTableRowProps {
  request: ReturnRequest;
  displayConfig: ReviewDisplayConfig | null;
  responsiblePartyLabel: (role?: string | null) => string;
  copyTracking: (value: string) => Promise<void>;
  onSelectRequest: (request: ReturnRequest) => void;
  t: (key: string) => string;
}

const getRatingBadge = (
  rating: string | undefined,
  t: (key: string) => string
) => {
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

export const ReturnRequestsTableRow: React.FC<ReturnRequestsTableRowProps> = ({
  request,
  displayConfig,
  responsiblePartyLabel,
  copyTracking,
  onSelectRequest,
  t,
}) => {
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      {displayConfig?.showOrderColumn !== false && (
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="font-mono text-xs font-semibold text-foreground">
            {request.order?.orderNumber || t("returns.k_21")}
          </div>
          <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {request.refundAmount
              ? `${request.refundAmount} ${
                  request.order?.currency || t("returns.k_22")
                }`
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
              getRatingBadge(request.customer?.customerRating, t)}
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
                onClick={() => void copyTracking(request.trackingNumber!)}
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
  );
};
