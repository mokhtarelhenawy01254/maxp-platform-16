import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  RotateCw,
  ShoppingCart,
} from "lucide-react";
import type { IncompleteOrder } from "../incompleteUtils";
import IncompleteOrderTableRow from "./IncompleteOrderTableRow";

const SKELETON_WIDTHS = [72, 55, 30, 45, 60, 35, 50, 40];

interface IncompleteOrdersTableProps {
  orders: IncompleteOrder[];
  loading: boolean;
  error: string | null;
  canShowAttribution: boolean;
  convertingCartId: string | null;
  onRetry: () => void;
  onCopyCartId: (cartId: string) => void;
  onConfirmConvert: (cartId: string) => void;
  onOpenContactModal: (cartId: string) => void;
  onOpenCancelModal: (order: IncompleteOrder) => void;
}

export const IncompleteOrdersTable: React.FC<IncompleteOrdersTableProps> = ({
  orders,
  loading,
  error,
  canShowAttribution,
  convertingCartId,
  onRetry,
  onCopyCartId,
  onConfirmConvert,
  onOpenContactModal,
  onOpenCancelModal,
}) => {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, cartId: string) => {
    e.stopPropagation();
    onCopyCartId(cartId);
    setCopiedId(cartId);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-start min-w-[1080px]">
          <thead>
            <tr className="border-b border-border/70 bg-muted/40">
              <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("orders.customer")}
              </th>
              <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("orders.contact")}
              </th>
              <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("orders.itemsCount")}
              </th>
              <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("orders.amount")}
              </th>
              {canShowAttribution && (
                <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("orders.incompleteAdSource")}
                </th>
              )}
              <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("orders.lastUpdated")}
              </th>
              <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("orders.incompleteReasonColumn")}
              </th>
              <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("orders.orderStatus")}
              </th>
              <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("orders.incompleteActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr
                  key={`skeleton-${idx}`}
                  className="border-b border-border/40 last:border-0"
                >
                  {SKELETON_WIDTHS.map((width, cellIdx) => (
                    <td
                      key={`skeleton-${idx}-${cellIdx}`}
                      className="px-4 py-3.5"
                    >
                      <div
                        className="h-4 rounded-md bg-muted/60 animate-pulse"
                        style={{ width: `${width}%` }}
                      />
                    </td>
                  ))}
                  {canShowAttribution && (
                    <td className="px-4 py-3.5">
                      <div className="h-4 rounded-md bg-muted/60 animate-pulse w-3/4" />
                    </td>
                  )}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td
                  colSpan={canShowAttribution ? 9 : 8}
                  className="px-5 py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-destructive">
                      {error}
                    </p>
                    <button
                      type="button"
                      onClick={onRetry}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>{t("orders.incompleteRetry")}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={canShowAttribution ? 9 : 8}
                  className="px-5 py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="p-3 rounded-full bg-muted text-muted-foreground">
                      <ShoppingCart className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {t("orders.incompleteNoOrders")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("orders.incompleteNoOrdersDesc")}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order, idx) => (
                <IncompleteOrderTableRow
                  key={order.cartId}
                  order={order}
                  idx={idx}
                  canShowAttribution={canShowAttribution}
                  convertingCartId={convertingCartId}
                  copiedId={copiedId}
                  onCopyCartId={handleCopy}
                  onConfirmConvert={onConfirmConvert}
                  onOpenContactModal={onOpenContactModal}
                  onOpenCancelModal={onOpenCancelModal}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncompleteOrdersTable;
