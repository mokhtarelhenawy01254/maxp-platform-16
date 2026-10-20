import React from "react";
import { Link } from "react-router-dom";
import {
  PhoneIcon,
  BuildingOfficeIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import type { ShipmentRowItem } from "./ShipmentStatementTable";
import type { ShipmentStatusBadgeResult } from "./shipmentStatusBadge";
import { ShipmentDestinationCustomerCell } from "./ShipmentDestinationCustomerCell";
import { ShipmentCarrierTrackingCell } from "./ShipmentCarrierTrackingCell";
import { ShipmentRowActionsCell } from "./ShipmentRowActionsCell";

export interface ShipmentStatementTableRowProps {
  shipment: ShipmentRowItem;
  isSelected: boolean;
  onToggleSelectOne: (id: string) => void;
  syncingId: string | null;
  onSyncShipment: (id: string) => void;
  onPrintWaybill: (s: ShipmentRowItem) => void;
  onOpenChat: (s: ShipmentRowItem) => void;
  onOpenTicket: (s: ShipmentRowItem) => void;
  onResendShipment: (s: ShipmentRowItem) => void;
  onCancelShipment: (s: ShipmentRowItem) => void;
  onCopyTracking: (tracking: string) => void;
  getStatusBadge: (status: string, shipment?: ShipmentRowItem) => ShipmentStatusBadgeResult;
  formatDate: (date: string | Date | null | undefined) => string;
  formatPrice: (amount: number, curr?: string) => string;
}

export const ShipmentStatementTableRow: React.FC<ShipmentStatementTableRowProps> = ({
  shipment: s,
  isSelected,
  onToggleSelectOne,
  syncingId,
  onSyncShipment,
  onPrintWaybill,
  onOpenChat,
  onOpenTicket,
  onResendShipment,
  onCancelShipment,
  onCopyTracking,
  getStatusBadge,
  formatDate,
  formatPrice,
}) => {
  const isTurbo =
    (s.shippingCompany?.providerKey || s.carrierType || "").toUpperCase() ===
    "TURBO";
  const tracking = s.trackingNumber || s.externalShipmentId;
  const badge = getStatusBadge(s.status, s);

  return (
    <tr
      className={`hover:bg-muted/40 transition-colors ${
        isSelected ? "bg-primary/5" : ""
      }`}
    >
      {/* Checkbox */}
      <td className="px-3 py-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelectOne(s.id)}
          className="rounded border-border/70 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
        />
      </td>

      {/* Order Number & Date */}
      <td className="px-3 py-3 whitespace-nowrap">
        {s.order?.id || s.orderId ? (
          <Link
            to={`/orders/${encodeURIComponent(String(s.order?.id || s.orderId))}`}
            className="font-bold text-primary hover:underline block"
          >
            #{s.order?.orderNumber || (s.order?.id || s.orderId || "").slice(0, 8)}
          </Link>
        ) : (
          <span className="text-muted-foreground font-mono">-</span>
        )}
        <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono tabular-nums">
          {formatDate(s.createdAt)}
        </span>
      </td>

      {/* Status & Reasons / Notes */}
      <td className="px-3 py-3">
        <div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        {s.delayReason && (
          <div className="mt-1 p-1 px-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-800 dark:text-amber-300 font-medium">
            <span>سبب التأجيل: </span>
            <span>{s.delayReason}</span>
          </div>
        )}

        {s.returnReason && (
          <div className="mt-1 p-1 px-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-800 dark:text-rose-300 font-medium">
            <span>سبب الإرجاع: </span>
            <span>{s.returnReason}</span>
          </div>
        )}
      </td>

      {/* Customer, Phone & Destination */}
      <ShipmentDestinationCustomerCell shipment={s} />

      {/* Shipping Company & Integration */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-xs bg-muted text-foreground border border-border/70">
          {s.shippingCompany?.name || s.carrierType || "يدوي"}
        </span>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {s.shippingCompany?.integrationMode === "LIVE"
            ? "ربط مباشر"
            : "تسجيل يدوي"}
        </div>
      </td>

      {/* Tracking Code (AWB) */}
      <ShipmentCarrierTrackingCell
        carrierType={s.carrierType}
        tracking={tracking}
        onCopyTracking={onCopyTracking}
      />

      {/* Delivery Captain */}
      <td className="px-3 py-3">
        {s.captainName ? (
          <div>
            <div className="text-xs font-semibold text-foreground flex items-center gap-1">
              <UserIcon className="h-3 w-3 text-muted-foreground" />
              <span>{s.captainName}</span>
            </div>
            {s.captainPhone && (
              <a
                href={`tel:${s.captainPhone}`}
                className="inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums text-primary hover:underline mt-0.5"
              >
                <PhoneIcon className="h-2.5 w-2.5" />
                <span>{s.captainPhone}</span>
              </a>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">لم يُعيّن مندوب</span>
        )}
      </td>

      {/* Branch & Hub */}
      <td className="px-3 py-3">
        {s.branchName || s.expectedBranch ? (
          <div>
            <div className="text-xs font-medium text-foreground flex items-center gap-1">
              <BuildingOfficeIcon className="h-3 w-3 text-muted-foreground" />
              <span>{s.branchName || s.expectedBranch}</span>
            </div>
            {s.branchPhone && (
              <span className="text-[10px] font-mono tabular-nums text-muted-foreground block">
                {s.branchPhone}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        )}
      </td>

      {/* COD & Received Amount */}
      <td className="px-3 py-3 whitespace-nowrap text-left">
        <div className="font-bold text-xs font-mono tabular-nums text-foreground">
          {formatPrice(
            Number(s.order?.total || s.cost || 0),
            s.currency || s.order?.currency
          )}
        </div>
        {Number(s.receivedAmount) > 0 && (
          <div className="text-[10px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            مستلم:{" "}
            {formatPrice(
              Number(s.receivedAmount),
              s.currency || s.order?.currency
            )}
          </div>
        )}
      </td>

      {/* Actions */}
      <ShipmentRowActionsCell
        shipment={s}
        isTurbo={isTurbo}
        syncingId={syncingId}
        onSyncShipment={onSyncShipment}
        onPrintWaybill={onPrintWaybill}
        onOpenChat={onOpenChat}
        onOpenTicket={onOpenTicket}
        onResendShipment={onResendShipment}
        onCancelShipment={onCancelShipment}
      />
    </tr>
  );
};

export default ShipmentStatementTableRow;
