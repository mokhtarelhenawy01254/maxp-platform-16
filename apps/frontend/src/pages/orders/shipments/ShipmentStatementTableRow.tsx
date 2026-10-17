import React from "react";
import { Link } from "react-router-dom";
import {
  PhoneIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  PrinterIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathRoundedSquareIcon,
  XCircleIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UserIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { ShipmentRowItem } from "./ShipmentStatementTable";
import { ShipmentStatusBadgeResult } from "./shipmentStatusBadge";

interface ShipmentStatementTableRowProps {
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

const getCarrierTrackUrl = (carrierType: string, trackingNumber?: string | null): string | null => {
  if (!trackingNumber) return null;
  const c = carrierType.toUpperCase();
  if (c === "BOSTA") return `https://bosta.co/tracking-shipment/?shipmentNumber=${trackingNumber}`;
  if (c === "TURBO") return `https://turbocouriers.com/ar/track/${trackingNumber}`;
  if (c === "ARAMEX") return `https://www.aramex.com/track/results?shipmentNumber=${trackingNumber}`;
  if (c === "Mylerz") return `https://track.mylerz.com/${trackingNumber}`;
  if (c === "QP_EXPRESS" || c === "QPEXPRESS") return `https://qpexpress.net/track/${trackingNumber}`;
  return null;
};

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
  const isTurbo = (s.shippingCompany?.providerKey || s.carrierType || "").toUpperCase() === "TURBO";
  const tracking = s.trackingNumber || s.externalShipmentId;
  const trackUrl = getCarrierTrackUrl(s.carrierType, tracking);
  const customerName = s.order?.customerName || s.order?.customer?.name || "عميل غير محدد";
  const customerPhone = s.order?.customerPhone || s.order?.customer?.phone;
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

        {/* Delay Reason */}
        {s.delayReason && (
          <div className="mt-1 p-1 px-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-800 dark:text-amber-300 font-medium">
            <span>سبب التأجيل: </span>
            <span>{s.delayReason}</span>
          </div>
        )}

        {/* Return Reason */}
        {s.returnReason && (
          <div className="mt-1 p-1 px-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-800 dark:text-rose-300 font-medium">
            <span>سبب الإرجاع: </span>
            <span>{s.returnReason}</span>
          </div>
        )}
      </td>

      {/* Customer, Phone & Destination */}
      <td className="px-3 py-3">
        <div className="font-semibold text-foreground flex items-center gap-1">
          <span>{customerName}</span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          {customerPhone && (
            <a
              href={`tel:${customerPhone}`}
              className="inline-flex items-center gap-0.5 text-[11px] font-mono tabular-nums text-primary hover:underline"
              title="اتصال بالعميل"
            >
              <PhoneIcon className="h-3 w-3 shrink-0" />
              <span>{customerPhone}</span>
            </a>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1">
          <MapPinIcon className="h-3 w-3 shrink-0 text-muted-foreground/60 mt-0.5" />
          <span className="line-clamp-2">
            {[s.destinationGovernorate || s.order?.governorate, s.destinationCity || s.order?.city, s.destinationAddress]
              .filter(Boolean)
              .join(" - ") || "بدون عنوان محدد"}
          </span>
        </div>
      </td>

      {/* Shipping Company & Integration */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-xs bg-muted text-foreground border border-border/70">
          {s.shippingCompany?.name || s.carrierType || "يدوي"}
        </span>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {s.shippingCompany?.integrationMode === "LIVE" ? "ربط مباشر" : "تسجيل يدوي"}
        </div>
      </td>

      {/* Tracking Code (AWB) */}
      <td className="px-3 py-3 whitespace-nowrap">
        {tracking ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs font-bold text-foreground">
                {tracking}
              </span>
              <button
                type="button"
                onClick={() => onCopyTracking(tracking)}
                className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                title="نسخ رقم الشحنة"
              >
                <ClipboardDocumentIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            {trackUrl && (
              <a
                href={trackUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
              >
                <span>موقع التتبع</span>
                <ArrowTopRightOnSquareIcon className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground font-mono text-xs">-</span>
        )}
      </td>

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
          {formatPrice(Number(s.order?.total || s.cost || 0), s.currency || s.order?.currency)}
        </div>
        {Number(s.receivedAmount) > 0 && (
          <div className="text-[10px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            مستلم: {formatPrice(Number(s.receivedAmount), s.currency || s.order?.currency)}
          </div>
        )}
      </td>

      {/* Actions */}
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
            <ArrowPathIcon className={`h-4 w-4 ${syncingId === s.id ? "animate-spin text-emerald-600" : ""}`} />
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
    </tr>
  );
};
