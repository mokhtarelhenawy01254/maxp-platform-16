/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  ArrowPathIcon,
  PrinterIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  PaperAirplaneIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";

export interface ShippingTrackingActionsProps {
  order: any;
  shipment: any;
  existingTracking: string;
  isQpExpress: boolean;
  isBosta: boolean;
  isTurbo: boolean;
  resending: boolean;
  syncing: boolean;
  onResendShipment: () => void;
  onSyncStatus: () => void;
  onOpenTicket?: () => void;
  onPrintBostaAWB: () => void;
  onPrintQpWaybill: () => void;
  onShowCancelModal: () => void;
}

export const ShippingTrackingActions: React.FC<
  ShippingTrackingActionsProps
> = ({
  order,
  shipment,
  existingTracking,
  isQpExpress,
  isBosta,
  isTurbo,
  resending,
  syncing,
  onResendShipment,
  onSyncStatus,
  onOpenTicket,
  onPrintBostaAWB,
  onPrintQpWaybill,
  onShowCancelModal,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <button
        type="button"
        onClick={onResendShipment}
        disabled={resending || syncing}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition disabled:opacity-50 active:scale-97"
        title="إعادة إرسال وتحديث بيانات الشحنة والعنوان لشركة الشحن"
      >
        <PaperAirplaneIcon
          className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`}
        />
        <span>{resending ? "جاري الإرسال..." : "إعادة إرسال الشحنة"}</span>
      </button>

      <button
        type="button"
        onClick={onSyncStatus}
        disabled={syncing || resending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50 active:scale-97"
      >
        <ArrowPathIcon
          className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
        />
        <span>مزامنة الحالة اللحظية</span>
      </button>

      {onOpenTicket && (
        <button
          type="button"
          onClick={onOpenTicket}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition shadow-xs active:scale-97"
          title="فتح تذكرة دعم بخصوص هذه الشحنة في مركز التذاكر"
        >
          <TicketIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>فتح تذكرة شحن</span>
        </button>
      )}

      {isQpExpress && (
        <a
          href="https://qpxpress.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-97"
        >
          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 text-indigo-500" />
          <span>بوابة QP Express</span>
        </a>
      )}

      {isBosta && (
        <a
          href="https://business.bosta.co"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-97"
        >
          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 text-amber-600" />
          <span>بوابة بوستا Bosta</span>
        </a>
      )}

      {shipment?.labelUrl && (
        <a
          href={shipment.labelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition active:scale-97"
        >
          <PrinterIcon className="h-3.5 w-3.5" />
          <span>طباعة البوليصة AWB</span>
        </a>
      )}

      {isBosta && (
        <button
          type="button"
          onClick={onPrintBostaAWB}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition shadow-xs active:scale-97"
          title="طباعة بوليصة شحن بوستا AWB"
        >
          <PrinterIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>طباعة بوليصة بوستا AWB</span>
        </button>
      )}

      {isQpExpress && existingTracking && (
        <button
          type="button"
          onClick={onPrintQpWaybill}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition shadow-xs active:scale-97"
          title="طباعة ستيكر حراري (80×50 مم) مع الباركود"
        >
          <PrinterIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>طباعة ستيكر QP (80×50 مم)</span>
        </button>
      )}

      {isTurbo &&
        (order?.turboTrackingNumber ||
          order?.turboShipmentId ||
          shipment?.trackingNumber) && (
          <a
            href={`/api/v1/turbo/orders/${
              order.orderNumber || order.id
            }/waybill`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 hover:bg-blue-100 transition shadow-xs active:scale-97"
            title="طباعة بوليصة شحن تربو الرسمية"
          >
            <PrinterIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>طباعة بوليصة تربو AWB</span>
          </a>
        )}

      <button
        type="button"
        onClick={onShowCancelModal}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30 transition active:scale-97"
      >
        <XMarkIcon className="h-3.5 w-3.5" />
        <span>إلغاء الشحنة</span>
      </button>
    </div>
  );
};
