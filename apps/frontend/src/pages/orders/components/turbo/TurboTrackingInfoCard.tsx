import React from "react";
import {
  FileText,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { OrderDetailsType } from "../../types";
import { getTurboStatusDisplay } from "../../../../utils/statusRegistry";

interface TurboTrackingInfoCardProps {
  order: OrderDetailsType;
  turboTrackingData: any;
  formatDate: (date: string) => string;
}

export const TurboTrackingInfoCard: React.FC<TurboTrackingInfoCardProps> = ({
  order,
  turboTrackingData,
  formatDate,
}) => {
  return (
    <div className="bg-card rounded-xl border border-border/70 p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="flex justify-between items-center py-1 border-b border-border/30">
          <span className="font-medium text-muted-foreground">رقم التتبع:</span>
          <span className="font-bold font-mono tabular-nums text-primary" dir="ltr">
            {order.turboTrackingNumber || order.turboShipmentId || "غير متاح"}
          </span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-border/30">
          <span className="font-medium text-muted-foreground">حالة الشحنة:</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getTurboStatusDisplay(order.turboShipmentStatus).colorClass}`}
          >
            {getTurboStatusDisplay(order.turboShipmentStatus).label}
          </span>
        </div>

        {turboTrackingData?.currentLocation && (
          <div className="flex justify-between items-center py-1 border-b border-border/30">
            <span className="font-medium text-muted-foreground">الموقع الحالي:</span>
            <span className="font-semibold text-foreground">
              {turboTrackingData.currentLocation}
            </span>
          </div>
        )}

        {turboTrackingData?.estimatedDelivery && (
          <div className="flex justify-between items-center py-1 border-b border-border/30">
            <span className="font-medium text-muted-foreground">التسليم المتوقع:</span>
            <span className="font-mono tabular-nums text-foreground">
              {formatDate(turboTrackingData.estimatedDelivery)}
            </span>
          </div>
        )}

        {turboTrackingData?.deliveredAt && (
          <div className="flex justify-between items-center py-1 border-b border-border/30">
            <span className="font-medium text-muted-foreground">تاريخ التسليم:</span>
            <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} />
              {formatDate(turboTrackingData.deliveredAt)}
            </span>
          </div>
        )}

        {(order.turboCaptainName || turboTrackingData?.captain) && (
          <div className="flex justify-between items-center py-1 border-b border-border/30">
            <span className="font-medium text-muted-foreground">المندوب:</span>
            <span className="text-foreground flex items-center gap-1 font-semibold">
              {order.turboCaptainName || turboTrackingData?.captain}
              {(order.turboCaptainPhone || turboTrackingData?.captainNumber1) && (
                <span className="text-[11px] text-muted-foreground font-mono tabular-nums" dir="ltr">
                  ({order.turboCaptainPhone || turboTrackingData?.captainNumber1})
                </span>
              )}
            </span>
          </div>
        )}

        {(order.turboBranchName || turboTrackingData?.branch) && (
          <div className="flex justify-between items-center py-1 border-b border-border/30">
            <span className="font-medium text-muted-foreground">الفرع:</span>
            <span className="text-foreground flex items-center gap-1 font-semibold">
              <MapPin size={12} className="text-primary" />
              {order.turboBranchName || turboTrackingData?.branch}
              {(order.turboBranchPhone || turboTrackingData?.branchNumber1) && (
                <span className="text-[11px] text-muted-foreground font-mono tabular-nums" dir="ltr">
                  ({order.turboBranchPhone || turboTrackingData?.branchNumber1})
                </span>
              )}
            </span>
          </div>
        )}

        {order.turboDelayReason && (
          <div className="flex justify-between items-center py-1 border-b border-border/30">
            <span className="font-medium text-muted-foreground">سبب التأخير:</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <Clock size={12} />
              {order.turboDelayReason}
            </span>
          </div>
        )}

        {order.turboReturnReason && (
          <div className="flex justify-between items-center py-1 border-b border-border/30">
            <span className="font-medium text-muted-foreground">سبب الارتجاع:</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
              <RotateCcw size={12} />
              {order.turboReturnReason}
            </span>
          </div>
        )}

        {order.updatedAt && (
          <div className="flex justify-between items-center py-1 md:col-span-2">
            <span className="font-medium text-muted-foreground">آخر تحديث:</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {formatDate(order.updatedAt)}
            </span>
          </div>
        )}
      </div>

      {order.turboLabelUrl && (
        <div className="pt-2 border-t border-border/40">
          <a
            href={order.turboLabelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <FileText size={14} />
            <span>عرض ملصق الشحنة (Waybill)</span>
          </a>
        </div>
      )}
    </div>
  );
};
