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
  getStatusBadge: (status: string, shipment?: ShipmentRowItem) => { label: string; className: string };
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
    if (c === "TURBO") return `https://turbo-eg.com/track?trackingNumber=${encodeURIComponent(trackingNumber)}`;
    if (c === "BOSTA") return `https://bosta.co/tracking-shipment/?track=${encodeURIComponent(trackingNumber)}`;
    if (c === "QP_EXPRESS" || c === "QPEXPRESS") return `https://qpexpress.net/track/${encodeURIComponent(trackingNumber)}`;
    return null;
  };

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
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
              isSelected ? "bg-primary/5 dark:bg-primary/10" : ""
            }`}
          >
            {/* Row 1: Order # & Status Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelectOne(s.id)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                {s.order?.id || s.orderId ? (
                  <Link
                    to={`/orders/${encodeURIComponent(String(s.order?.id || s.orderId))}`}
                    className="font-bold text-xs text-primary hover:underline"
                  >
                    #{s.order?.orderNumber || (s.order?.id || s.orderId || "").slice(0, 8)}
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400">بدون طلب</span>
                )}
                <span className="text-[10px] text-gray-400 font-mono tabular-nums">
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
                <p className="font-semibold text-gray-900 dark:text-white">{customerName}</p>
                {customerPhone && (
                  <a
                    href={`tel:${customerPhone}`}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5 hover:underline"
                  >
                    <PhoneIcon className="h-3 w-3" />
                    <span>{customerPhone}</span>
                  </a>
                )}
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {[s.destinationGovernorate || s.order?.governorate, s.destinationCity || s.order?.city, s.destinationAddress]
                    .filter(Boolean)
                    .join(" - ")}
                </p>
              </div>

              <div className="text-left shrink-0">
                <span className="font-bold text-sm text-gray-900 dark:text-white font-mono tabular-nums block">
                  {formatPrice(s.order?.total || s.cost || 0)}
                </span>
                {s.receivedAmount !== undefined && s.receivedAmount !== null && Number(s.receivedAmount) > 0 && (
                  <span className="text-[10px] text-emerald-600 font-mono block">
                    محصل: {formatPrice(Number(s.receivedAmount))}
                  </span>
                )}
              </div>
            </div>

            {/* Row 3: Courier Captain & Branch Info (if exists) */}
            {(s.captainName || s.branchName || s.delayReason || s.returnReason) && (
              <div className="pt-1 text-[11px] space-y-1">
                {s.captainName && (
                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3 text-indigo-500" />
                      <span>المندوب: {s.captainName}</span>
                    </div>
                    {s.captainPhone && (
                      <a href={`tel:${s.captainPhone}`} className="text-emerald-600 font-mono">
                        {s.captainPhone}
                      </a>
                    )}
                  </div>
                )}

                {s.branchName && (
                  <div className="flex items-center gap-1 text-gray-500 text-[10px]">
                    <BuildingOfficeIcon className="h-3 w-3" />
                    <span>الفرع: {s.branchName}</span>
                    {s.expectedBranch && s.expectedBranch !== s.branchName && (
                      <span>(المتوقع: {s.expectedBranch})</span>
                    )}
                  </div>
                )}

                {/* Delay / Return reason badges */}
                {s.delayReason && (
                  <div className="p-1 px-1.5 rounded bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 text-[10px] text-yellow-800 dark:text-yellow-300">
                    سبب التأجيل: {s.delayReason}
                  </div>
                )}
                {s.returnReason && (
                  <div className="p-1 px-1.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[10px] text-rose-800 dark:text-rose-300">
                    سبب الإرجاع: {s.returnReason}
                  </div>
                )}
              </div>
            )}

            {/* Row 4: Carrier & Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {s.shippingCompany?.name || s.carrierType || "يدوي"}
                </span>
                {tracking && (
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[10px] text-gray-700 dark:text-gray-300">
                      {tracking}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCopyTracking(tracking)}
                      className="text-gray-400 hover:text-gray-600 p-0.5"
                      title="نسخ رقم البوليصة"
                    >
                      <ClipboardDocumentIcon className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {trackUrl && (
                  <a
                    href={trackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-500 hover:text-indigo-600"
                    title="تتبع الشحنة"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onSyncShipment(s.id)}
                  disabled={syncingId === s.id}
                  className="p-1.5 text-gray-500 hover:text-indigo-600"
                  title="مزامنة"
                >
                  <ArrowPathIcon
                    className={`h-4 w-4 ${syncingId === s.id ? "animate-spin text-indigo-600" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onPrintWaybill(s)}
                  className="p-1.5 text-gray-500 hover:text-indigo-600"
                  title="طباعة البوليصة"
                >
                  <PrinterIcon className="h-4 w-4" />
                </button>
                {isTurbo && tracking && (
                  <button
                    type="button"
                    onClick={() => onOpenChat(s)}
                    className="p-1.5 text-gray-500 hover:text-blue-600"
                    title="محادثة تربو"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  </button>
                )}
                {isTurbo && tracking && onOpenTicket && (
                  <button
                    type="button"
                    onClick={() => onOpenTicket(s)}
                    className="p-1.5 text-gray-500 hover:text-amber-600"
                    title="فتح تذكرة دعم تربو"
                  >
                    <TicketIcon className="h-4 w-4" />
                  </button>
                )}
                {isTurbo && tracking && (
                  <button
                    type="button"
                    onClick={() => onResendShipment(s)}
                    className="p-1.5 text-gray-500 hover:text-cyan-600"
                    title="طلب إعادة الإرسال في تربو"
                  >
                    <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                  </button>
                )}
                {tracking && s.status !== "CANCELLED" && s.status !== "DELIVERED" && (
                  <button
                    type="button"
                    onClick={() => onCancelShipment(s)}
                    className="p-1.5 text-gray-500 hover:text-rose-600"
                    title="طلب إلغاء الشحنة"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
