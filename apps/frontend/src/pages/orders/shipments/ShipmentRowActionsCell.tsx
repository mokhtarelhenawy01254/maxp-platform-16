import React from "react";
import {
  PrinterIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  TicketIcon,
  ArrowPathRoundedSquareIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type { ShipmentRowItem } from "./ShipmentStatementTable";

export interface ShipmentRowActionsCellProps {
  shipment: ShipmentRowItem;
  isTurbo: boolean;
  syncingId: string | null;
  onSyncShipment: (id: string) => void;
  onPrintWaybill: (s: ShipmentRowItem) => void;
  onOpenChat: (s: ShipmentRowItem) => void;
  onOpenTicket: (s: ShipmentRowItem) => void;
  onResendShipment: (s: ShipmentRowItem) => void;
  onCancelShipment: (s: ShipmentRowItem) => void;
}

export const ShipmentRowActionsCell: React.FC<ShipmentRowActionsCellProps> = React.memo(
  ({
    shipment: s,
    isTurbo,
    syncingId,
    onSyncShipment,
    onPrintWaybill,
    onOpenChat,
    onOpenTicket,
    onResendShipment,
    onCancelShipment,
  }) => {
    return (
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1">
          {/* Print Waybill */}
          <button
            type="button"
            onClick={() => onPrintWaybill(s)}
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted/60 rounded-lg transition-colors"
            title="طباعة البوليصة"
          >
            <PrinterIcon className="h-4 w-4" />
          </button>

          {/* Sync status */}
          <button
            type="button"
            onClick={() => onSyncShipment(s.id)}
            disabled={syncingId === s.id}
            className="p-1.5 text-muted-foreground hover:text-emerald-600 hover:bg-muted/60 rounded-lg transition-colors"
            title="تحديث الحالة من الشركة"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${
                syncingId === s.id ? "animate-spin text-emerald-600" : ""
              }`}
            />
          </button>

          {/* Turbo Chat / Tickets */}
          {isTurbo && (
            <>
              <button
                type="button"
                onClick={() => onOpenChat(s)}
                className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                title="شات الشحنة المباشر مع Turbo"
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onOpenTicket(s)}
                className="p-1.5 text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors"
                title="فتح تذكرة دعم للطلب في Turbo"
              >
                <TicketIcon className="h-4 w-4" />
              </button>

              {/* Resend Shipment */}
              <button
                type="button"
                onClick={() => onResendShipment(s)}
                className="p-1.5 text-cyan-600 hover:bg-cyan-500/10 rounded-lg transition-colors"
                title="طلب إعادة إرسال الشحنة"
              >
                <ArrowPathRoundedSquareIcon className="h-4 w-4" />
              </button>

              {/* Cancel Request */}
              <button
                type="button"
                onClick={() => onCancelShipment(s)}
                className="p-1.5 text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="طلب إلغاء الشحنة"
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </td>
    );
  }
);

ShipmentRowActionsCell.displayName = "ShipmentRowActionsCell";
