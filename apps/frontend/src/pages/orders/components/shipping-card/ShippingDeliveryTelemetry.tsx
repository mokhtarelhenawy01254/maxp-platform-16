/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  PhoneIcon,
  UserIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";

export interface ShippingDeliveryTelemetryProps {
  order: any;
  shipmentMeta: any;
  liveStatus: any;
}

export const ShippingDeliveryTelemetry: React.FC<
  ShippingDeliveryTelemetryProps
> = ({ order, shipmentMeta, liveStatus }) => {
  const hasReturnOrDelay = Boolean(
    order?.turboReturnReason ||
      order?.turboDelayReason ||
      shipmentMeta?.returnReason
  );

  const hasDriverDetails = Boolean(
    liveStatus?.driverName || liveStatus?.driverPhone || liveStatus?.statusNote
  );

  if (!hasReturnOrDelay && !hasDriverDetails) {
    return null;
  }

  return (
    <>
      {/* Return & Delay Reasons from Carrier */}
      {hasReturnOrDelay && (
        <div className="p-3 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs space-y-1.5">
          {order?.turboReturnReason && (
            <div className="flex items-start gap-2">
              <span className="font-bold text-rose-800 dark:text-rose-200 shrink-0">
                سبب المرتجع:
              </span>
              <span className="text-rose-950 dark:text-rose-100 font-semibold">
                {order.turboReturnReason}
              </span>
            </div>
          )}
          {order?.turboDelayReason && (
            <div className="flex items-start gap-2 pt-1 border-t border-rose-200/60 dark:border-rose-900/30">
              <span className="font-medium text-rose-700 dark:text-rose-300 shrink-0">
                ملاحظة التأخير:
              </span>
              <span className="text-slate-800 dark:text-slate-200">
                {order.turboDelayReason}
              </span>
            </div>
          )}
          {shipmentMeta?.returnReason &&
            shipmentMeta.returnReason !== order?.turboReturnReason && (
              <div className="flex items-start gap-2 pt-1 border-t border-rose-200/60 dark:border-rose-900/30">
                <span className="font-medium text-rose-700 dark:text-rose-300 shrink-0">
                  سبب الاسترجاع:
                </span>
                <span className="text-slate-800 dark:text-slate-200">
                  {shipmentMeta.returnReason}
                </span>
              </div>
            )}
        </div>
      )}

      {/* Driver & Delivery Field Details (QP Express / Integrated Couriers) */}
      {hasDriverDetails && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
          {liveStatus.driverName && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="text-xs truncate">
                <span className="text-slate-500 dark:text-slate-400">
                  المندوب:{" "}
                </span>
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
                <span className="text-slate-500 dark:text-slate-400">
                  هاتف المندوب:{" "}
                </span>
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
    </>
  );
};
