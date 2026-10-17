/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  ClipboardDocumentIcon,
  ArrowPathIcon,
  PrinterIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  UserIcon,
  ChatBubbleBottomCenterTextIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { useCurrency } from "../../../../hooks/useCurrency";

interface ShippingTrackingViewProps {
  order: any;
  shipment: any;
  existingTracking: string;
  existingCarrierName: string;
  isQpExpress: boolean;
  isBosta: boolean;
  isTurbo: boolean;
  shipmentMeta: any;
  liveStatus: any;
  resending: boolean;
  syncing: boolean;
  onResendShipment: () => void;
  onSyncStatus: () => void;
  onOpenTicket?: () => void;
  onPrintBostaAWB: () => void;
  onPrintQpWaybill: () => void;
  onShowCancelModal: () => void;
  onCopyTracking: () => void;
}

export const ShippingTrackingView: React.FC<ShippingTrackingViewProps> = ({
  order,
  shipment,
  existingTracking,
  existingCarrierName,
  isQpExpress,
  isBosta,
  isTurbo,
  shipmentMeta,
  liveStatus,
  resending,
  syncing,
  onResendShipment,
  onSyncStatus,
  onOpenTicket,
  onPrintBostaAWB,
  onPrintQpWaybill,
  onShowCancelModal,
  onCopyTracking,
}) => {
  const { formatPrice } = useCurrency();

  return (
    <div className="space-y-4">
      {/* 3-Column Info Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">شركة الشحن</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {existingCarrierName}
            </p>
            {isQpExpress && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                QP API
              </span>
            )}
            {isBosta && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                Bosta API
              </span>
            )}
            {isTurbo && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                Turbo API
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">رقم التتبع (AWB)</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-sm font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
              {existingTracking}
            </span>
            <button
              type="button"
              onClick={onCopyTracking}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition active:scale-90"
              title="نسخ رقم التتبع"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">قيمة التحصيل (COD)</p>
          <p className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
            {formatPrice(order?.total || 0)}
          </p>
        </div>
      </div>

      {/* Return & Delay Reasons from Carrier */}
      {(order?.turboReturnReason || order?.turboDelayReason || shipmentMeta?.returnReason) && (
        <div className="p-3 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs space-y-1.5">
          {order?.turboReturnReason && (
            <div className="flex items-start gap-2">
              <span className="font-bold text-rose-800 dark:text-rose-200 shrink-0">سبب المرتجع:</span>
              <span className="text-rose-950 dark:text-rose-100 font-semibold">{order.turboReturnReason}</span>
            </div>
          )}
          {order?.turboDelayReason && (
            <div className="flex items-start gap-2 pt-1 border-t border-rose-200/60 dark:border-rose-900/30">
              <span className="font-medium text-rose-700 dark:text-rose-300 shrink-0">ملاحظة التأخير:</span>
              <span className="text-slate-800 dark:text-slate-200">{order.turboDelayReason}</span>
            </div>
          )}
          {shipmentMeta?.returnReason && shipmentMeta.returnReason !== order?.turboReturnReason && (
            <div className="flex items-start gap-2 pt-1 border-t border-rose-200/60 dark:border-rose-900/30">
              <span className="font-medium text-rose-700 dark:text-rose-300 shrink-0">سبب الاسترجاع:</span>
              <span className="text-slate-800 dark:text-slate-200">{shipmentMeta.returnReason}</span>
            </div>
          )}
        </div>
      )}

      {/* Driver & Delivery Field Details (QP Express / Integrated Couriers) */}
      {(liveStatus?.driverName || liveStatus?.driverPhone || liveStatus?.statusNote) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
          {liveStatus.driverName && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="text-xs truncate">
                <span className="text-slate-500 dark:text-slate-400">المندوب: </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {liveStatus.driverName}
                </span>
              </div>
            </div>
          )}

          {liveStatus.driverPhone && (
            <div className="flex items-center gap-2">
              <PhoneIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="text-slate-500 dark:text-slate-400">هاتف المندوب: </span>
                <a
                  href={`tel:${liveStatus.driverPhone}`}
                  className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {liveStatus.driverPhone}
                </a>
              </div>
            </div>
          )}

          {liveStatus.statusNote && (
            <div className="sm:col-span-2 flex items-start gap-2 pt-1 border-t border-blue-100/60 dark:border-blue-900/30">
              <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-amber-800 dark:text-amber-300">
                  ملاحظة المندوب الميدانية:{" "}
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {liveStatus.statusNote}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons for active shipment */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onResendShipment}
          disabled={resending || syncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition disabled:opacity-50 active:scale-97"
          title="إعادة إرسال وتحديث بيانات الشحنة والعنوان لشركة الشحن"
        >
          <PaperAirplaneIcon className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
          <span>{resending ? "جاري الإرسال..." : "إعادة إرسال الشحنة"}</span>
        </button>

        <button
          type="button"
          onClick={onSyncStatus}
          disabled={syncing || resending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50 active:scale-97"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
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

        {isTurbo && (order?.turboTrackingNumber || order?.turboShipmentId || shipment?.trackingNumber) && (
          <a
            href={`/api/v1/turbo/orders/${order.orderNumber || order.id}/waybill`}
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
    </div>
  );
};

export default ShippingTrackingView;
