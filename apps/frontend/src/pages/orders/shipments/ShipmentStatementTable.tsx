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
import { useCurrency } from "../../../hooks/useCurrency";
import { ShippingCompanyRef } from "./CarrierTabsBar";

export interface ShipmentRowItem {
  id: string;
  orderId?: string | null;
  trackingNumber?: string | null;
  externalShipmentId?: string | null;
  status: string;
  carrierType: string;
  serviceLevel?: string | null;
  cost?: number | null;
  currency?: string;
  settlementStatus?: string | null;
  destinationGovernorate?: string | null;
  destinationCity?: string | null;
  destinationAddress?: string | null;
  labelUrl?: string | null;
  createdAt: string;
  shippingCompany?: ShippingCompanyRef | null;
  captainName?: string | null;
  captainPhone?: string | null;
  branchName?: string | null;
  branchPhone?: string | null;
  expectedBranch?: string | null;
  delayReason?: string | null;
  returnReason?: string | null;
  receivedAmount?: number | string | null;
  notes?: string | null;
  order?: {
    id: string;
    orderNumber: string;
    total: number;
    currency: string;
    status: string;
    governorate?: string;
    city?: string;
    customerName?: string;
    customerPhone?: string;
    turboShipmentStatus?: string;
    customer?: {
      id?: string | null;
      name?: string;
      phone?: string;
    } | null;
  } | null;
}

interface ShipmentStatementTableProps {
  shipments: ShipmentRowItem[];
  selectedIds: string[];
  onToggleSelectOne: (id: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
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

export const ShipmentStatementTable: React.FC<ShipmentStatementTableProps> = ({
  shipments,
  selectedIds,
  onToggleSelectOne,
  onToggleSelectAll,
  isAllSelected,
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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-right text-xs">
        {/* Table Head */}
        <thead className="bg-gray-50/90 dark:bg-gray-900/80 font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
          <tr>
            <th className="px-3 py-3 w-8 text-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onToggleSelectAll}
                className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              />
            </th>
            <th className="px-3 py-3 whitespace-nowrap">الطلب والتاريخ</th>
            <th className="px-3 py-3 min-w-[160px]">الحالة والملاحظات</th>
            <th className="px-3 py-3 min-w-[180px]">العميل والوجهة</th>
            <th className="px-3 py-3 whitespace-nowrap">شركة الشحن</th>
            <th className="px-3 py-3 whitespace-nowrap">رقم التتبع (AWB)</th>
            <th className="px-3 py-3 min-w-[160px]">مندوب الشحن</th>
            <th className="px-3 py-3 min-w-[140px]">الفرع والمركز</th>
            <th className="px-3 py-3 whitespace-nowrap text-left">قيمة التحصيل</th>
            <th className="px-3 py-3 text-center whitespace-nowrap">إجراءات</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
          {shipments.map((s) => {
            const isSelected = selectedIds.includes(s.id);
            const isTurbo = (s.shippingCompany?.providerKey || s.carrierType || "").toUpperCase() === "TURBO";
            const tracking = s.trackingNumber || s.externalShipmentId;
            const trackUrl = getCarrierTrackUrl(s.carrierType, tracking);
            const customerName = s.order?.customerName || s.order?.customer?.name || "عميل غير محدد";
            const customerPhone = s.order?.customerPhone || s.order?.customer?.phone;
            const badge = getStatusBadge(s.status, s);

            return (
              <tr
                key={s.id}
                className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors ${
                  isSelected ? "bg-primary/5 dark:bg-primary/10" : ""
                }`}
              >
                {/* Checkbox */}
                <td className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelectOne(s.id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
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
                    <span className="text-gray-400 font-mono">-</span>
                  )}
                  <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono tabular-nums">
                    {formatDate(s.createdAt)}
                  </span>
                </td>

                {/* Status & Reasons / Notes (Prominently at the front) */}
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
                    <div className="mt-1 p-1 px-1.5 rounded bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 text-[10px] text-yellow-800 dark:text-yellow-300 font-medium">
                      <span>سبب التأجيل: </span>
                      <span>{s.delayReason}</span>
                    </div>
                  )}

                  {/* Return Reason */}
                  {s.returnReason && (
                    <div className="mt-1 p-1 px-1.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[10px] text-rose-800 dark:text-rose-300 font-medium">
                      <span>سبب الإرجاع: </span>
                      <span>{s.returnReason}</span>
                    </div>
                  )}
                </td>

                {/* Customer, Phone & Destination */}
                <td className="px-3 py-3">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                    <span>{customerName}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    {customerPhone && (
                      <a
                        href={`tel:${customerPhone}`}
                        className="inline-flex items-center gap-0.5 text-[11px] font-mono tabular-nums text-indigo-600 dark:text-indigo-400 hover:underline"
                        title="اتصال بالعميل"
                      >
                        <PhoneIcon className="h-3 w-3 shrink-0" />
                        <span>{customerPhone}</span>
                      </a>
                    )}
                  </div>

                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-start gap-1">
                    <MapPinIcon className="h-3 w-3 shrink-0 text-gray-400 mt-0.5" />
                    <span className="line-clamp-2">
                      {[s.destinationGovernorate || s.order?.governorate, s.destinationCity || s.order?.city, s.destinationAddress]
                        .filter(Boolean)
                        .join(" - ") || "بدون عنوان محدد"}
                    </span>
                  </div>
                </td>

                {/* Shipping Company & Integration */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {s.shippingCompany?.name || s.carrierType || "يدوي"}
                  </span>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {s.shippingCompany?.integrationMode === "LIVE" ? "ربط مباشر" : "تسجيل يدوي"}
                  </div>
                </td>

                {/* Tracking Code (AWB) */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {tracking ? (
                    <div className="flex items-center gap-1 font-mono text-xs">
                      {trackUrl ? (
                        <a
                          href={trackUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                          title="تتبع مباشر على موقع شركة الشحن"
                        >
                          <span>{tracking}</span>
                          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="font-bold text-gray-900 dark:text-gray-100">
                          {tracking}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onCopyTracking(tracking)}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                        title="نسخ رقم البوليصة"
                      >
                        <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400 italic">بدون كود</span>
                  )}
                </td>

                {/* Captain / Delivery Driver Telemetry */}
                <td className="px-3 py-3">
                  {s.captainName ? (
                    <div className="space-y-0.5">
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                        <UserIcon className="h-3 w-3 text-indigo-500 shrink-0" />
                        <span>{s.captainName}</span>
                      </div>
                      {s.captainPhone && (
                        <a
                          href={`tel:${s.captainPhone}`}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                          title="اتصال بمندوب التوصيل"
                        >
                          <PhoneIcon className="h-3 w-3" />
                          <span>{s.captainPhone}</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-[11px]">لم يُحدد مندوب بعد</span>
                  )}
                </td>

                {/* Branch Info */}
                <td className="px-3 py-3">
                  {s.branchName || s.expectedBranch ? (
                    <div className="space-y-0.5 text-[11px]">
                      {s.branchName && (
                        <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                          <BuildingOfficeIcon className="h-3 w-3 text-gray-400 shrink-0" />
                          <span>{s.branchName}</span>
                        </div>
                      )}
                      {s.expectedBranch && s.expectedBranch !== s.branchName && (
                        <div className="text-[10px] text-gray-500">
                          المتوقع: {s.expectedBranch}
                        </div>
                      )}
                      {s.branchPhone && (
                        <a
                          href={`tel:${s.branchPhone}`}
                          className="text-[10px] font-mono text-gray-500 hover:underline block"
                        >
                          {s.branchPhone}
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-[11px]">-</span>
                  )}
                </td>

                {/* COD & Received Amount */}
                <td className="px-3 py-3 whitespace-nowrap text-left font-mono tabular-nums">
                  <div className="font-bold text-gray-900 dark:text-white">
                    {formatPrice(s.order?.total || s.cost || 0)}
                  </div>
                  {s.receivedAmount !== undefined && s.receivedAmount !== null && Number(s.receivedAmount) > 0 && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      محصل: {formatPrice(Number(s.receivedAmount))}
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td className="px-3 py-3 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1">
                    {/* Live Sync */}
                    <button
                      type="button"
                      onClick={() => onSyncShipment(s.id)}
                      disabled={syncingId === s.id}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                      title="مزامنة الحالة مع شركة الشحن"
                    >
                      <ArrowPathIcon
                        className={`h-4 w-4 ${syncingId === s.id ? "animate-spin text-indigo-600" : ""}`}
                      />
                    </button>

                    {/* Print Waybill */}
                    <button
                      type="button"
                      onClick={() => onPrintWaybill(s)}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                      title="طباعة البوليصة"
                    >
                      <PrinterIcon className="h-4 w-4" />
                    </button>

                    {/* Turbo Chat / Messages (Only for Turbo) */}
                    {isTurbo && tracking && (
                      <button
                        type="button"
                        onClick={() => onOpenChat(s)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                        title="فتح محادثة الشحنة مع تربو والمندوب"
                      >
                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      </button>
                    )}

                    {/* Support Ticket (Only for Turbo) */}
                    {isTurbo && tracking && onOpenTicket && (
                      <button
                        type="button"
                        onClick={() => onOpenTicket(s)}
                        className="p-1.5 text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                        title="فتح تذكرة دعم ومتابعة مع شركة الشحن"
                      >
                        <TicketIcon className="h-4 w-4" />
                      </button>
                    )}

                    {/* Resend Action (if delayed or returned) */}
                    {isTurbo && tracking && (
                      <button
                        type="button"
                        onClick={() => onResendShipment(s)}
                        className="p-1.5 text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 rounded-lg transition"
                        title="طلب إعادة الإرسال في تربو"
                      >
                        <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                      </button>
                    )}

                    {/* Cancel Request */}
                    {tracking && s.status !== "CANCELLED" && s.status !== "DELIVERED" && (
                      <button
                        type="button"
                        onClick={() => onCancelShipment(s)}
                        className="p-1.5 text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                        title="طلب إلغاء الشحنة"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
