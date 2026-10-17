import React from "react";
import { Link } from "react-router-dom";
import {
  PhoneIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  PrinterIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  BuildingOfficeIcon,
  ArrowPathRoundedSquareIcon,
  XCircleIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { useCurrency } from "../../../hooks/useCurrency";
import { ShipmentRowItem } from "./ShipmentStatementTable";
import { ShipmentStatusBadgeResult } from "./shipmentStatusBadge";

interface ShipmentStatementCardsProps {
  shipments: ShipmentRowItem[];
  selectedIds: string[];
  onToggleSelectOne: (id: string) => void;
  syncingId: string | null;
  onSyncShipment: (id: string) => void;
  onPrintWaybill: (shipment: ShipmentRowItem) => void;
  onOpenChat: (shipment: ShipmentRowItem) => void;
  onOpenTicket?: (shipment: ShipmentRowItem) => void;
  onResendShipment: (shipment: ShipmentRowItem) => void;
  onCancelShipment: (shipment: ShipmentRowItem) => void;
  onCopyTracking: (tracking: string) => void;
  getStatusBadge: (status: string, shipment?: ShipmentRowItem) => ShipmentStatusBadgeResult;
  formatDate: (dateStr?: string | Date | null) => string;
}

export const ShipmentStatementCards: React.FC<ShipmentStatementCardsProps> = ({
  shipments,
  selectedIds,
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
}) => {
  const { formatPrice } = useCurrency();

  const getCarrierTrackUrl = (carrierType: string, trackingNumber?: string | null) => {
    if (!trackingNumber) return null;
    const c = (carrierType || "").toUpperCase();
    if (c === "TURBO") return `https://turbocouriers.com/ar/track/${encodeURIComponent(trackingNumber)}`;
    if (c === "BOSTA") return `https://bosta.co/tracking-shipment/?shipmentNumber=${encodeURIComponent(trackingNumber)}`;
    if (c === "QP_EXPRESS" || c === "QPEXPRESS") return `https://qpexpress.net/track/${encodeURIComponent(trackingNumber)}`;
    return null;
  };

  return (
    <div className="divide-y divide-border/50">
      {shipments.map((s) => {
        const isSelected = selectedIds.includes(s.id);
        const isTurbo = (s.shippingCompany?.providerKey || s.carrierType || "").toUpperCase() === "TURBO";
        const tracking = s.trackingNumber || s.externalShipmentId;
        const trackUrl = getCarrierTrackUrl(s.carrierType, tracking);
        const customerName = s.order?.customerName || s.order?.customer?.name || "عميل غير محدد";
        const customerPhone = s.order?.customerPhone || s.order?.customer?.phone;
        const badge = getStatusBadge(s.status, s);

        return (
          <div
            key={s.id}
            className={`p-3.5 space-y-2 transition-colors ${
              isSelected ? "bg-primary/5" : ""
            }`}
          >
            {/* Row 1: Order # & Status Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelectOne(s.id)}
                  className="rounded border-border/70 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                {s.order?.id || s.orderId ? (
                  <Link
                    to={`/orders/${encodeURIComponent(String(s.order?.id || s.orderId))}`}
                    className="font-bold text-xs text-primary hover:underline"
                  >
                    #{s.order?.orderNumber || (s.order?.id || s.orderId || "").slice(0, 8)}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">بدون طلب</span>
                )}
                <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                  • {formatDate(s.createdAt)}
                </span>
              </div>

              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>

            {/* Row 2: Customer & Destination */}
            <div className="flex items-start justify-between text-xs gap-2">
              <div>
                <p className="font-semibold text-foreground">{customerName}</p>
                {customerPhone && (
                  <a
                    href={`tel:${customerPhone}`}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-primary mt-0.5 hover:underline"
                  >
                    <PhoneIcon className="h-3 w-3" />
                    <span>{customerPhone}</span>
                  </a>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {[s.destinationGovernorate || s.order?.governorate, s.destinationCity || s.order?.city, s.destinationAddress]
                    .filter(Boolean)
                    .join(" - ")}
                </p>
              </div>

              <div className="text-left shrink-0">
                <span className="font-bold text-sm text-foreground font-mono tabular-nums block">
                  {formatPrice(Number(s.order?.total || s.cost || 0))}
                </span>
                {s.receivedAmount !== undefined && s.receivedAmount !== null && Number(s.receivedAmount) > 0 && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block">
                    محصل: {formatPrice(Number(s.receivedAmount))}
                  </span>
                )}
              </div>
            </div>

            {/* Row 3: Courier Captain & Branch Info */}
            {(s.captainName || s.branchName || s.delayReason || s.returnReason) && (
              <div className="pt-1 text-[11px] space-y-1">
                {s.captainName && (
                  <div className="flex items-center justify-between text-foreground">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3 text-primary" />
                      <span>المندوب: {s.captainName}</span>
                    </div>
                    {s.captainPhone && (
                      <a href={`tel:${s.captainPhone}`} className="text-emerald-600 dark:text-emerald-400 font-mono">
                        {s.captainPhone}
                      </a>
                    )}
                  </div>
                )}

                {s.branchName && (
                  <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                    <BuildingOfficeIcon className="h-3 w-3" />
                    <span>الفرع: {s.branchName}</span>
                    {s.expectedBranch && s.expectedBranch !== s.branchName && (
                      <span>(المتوقع: {s.expectedBranch})</span>
                    )}
                  </div>
                )}

                {/* Delay / Return reason badges */}
                {s.delayReason && (
                  <div className="p-1 px-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-800 dark:text-amber-300">
                    سبب التأجيل: {s.delayReason}
                  </div>
                )}
                {s.returnReason && (
                  <div className="p-1 px-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-800 dark:text-rose-300">
                    سبب الإرجاع: {s.returnReason}
                  </div>
                )}
              </div>
            )}

            {/* Row 4: Carrier & Tracking */}
            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-muted text-foreground text-[10px] font-semibold border border-border/70">
                  {s.shippingCompany?.name || s.carrierType || "يدوي"}
                </span>

                {tracking && (
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <span className="text-foreground">{tracking}</span>
                    <button
                      type="button"
                      onClick={() => onCopyTracking(tracking)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ClipboardDocumentIcon className="h-3 w-3" />
                    </button>
                    {trackUrl && (
                      <a
                        href={trackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPrintWaybill(s)}
                  className="p-1 text-muted-foreground hover:text-primary rounded"
                  title="طباعة البوليصة"
                >
                  <PrinterIcon className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onSyncShipment(s.id)}
                  disabled={syncingId === s.id}
                  className="p-1 text-muted-foreground hover:text-emerald-600 rounded"
                  title="تحديث الحالة"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${syncingId === s.id ? "animate-spin text-emerald-600" : ""}`} />
                </button>

                {isTurbo && (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenChat(s)}
                      className="p-1 text-primary hover:bg-primary/10 rounded"
                      title="شات الشحنة"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    </button>

                    {onOpenTicket && (
                      <button
                        type="button"
                        onClick={() => onOpenTicket(s)}
                        className="p-1 text-amber-600 hover:bg-amber-500/10 rounded"
                        title="فتح تذكرة دعم"
                      >
                        <TicketIcon className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onResendShipment(s)}
                      className="p-1 text-cyan-600 hover:bg-cyan-500/10 rounded"
                      title="إعادة إرسال"
                    >
                      <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onCancelShipment(s)}
                      className="p-1 text-rose-600 hover:bg-rose-500/10 rounded"
                      title="إلغاء الشحنة"
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
