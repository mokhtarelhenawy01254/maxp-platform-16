import React from "react";
import { Truck, Plus, Loader2 } from "lucide-react";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { useCurrency } from "../../../hooks/useCurrency";
import { OrderDetailsType } from "../types";
import { TurboTrackingInfoCard } from "./turbo/TurboTrackingInfoCard";
import { TurboCostComparisonCard } from "./turbo/TurboCostComparisonCard";
import { TurboActionsBar } from "./turbo/TurboActionsBar";

interface TurboShippingPanelProps {
  order: OrderDetailsType;
  turboTrackingData: any;
  shippingComparison: any;
  loadingComparison: boolean;
  turboLoading: boolean;
  onCreateShipment: () => void;
  onUpdateShipment?: () => void;
  onSyncStatus?: () => void;
  onPrintWaybill: () => void;
  onCancelShipment: () => void;
  onUnlinkShipment: () => void;
  onRecreateShipment?: () => void;
  onCalculateShipping: () => void;
  canManageShipments?: boolean;
}

const TurboShippingPanel: React.FC<TurboShippingPanelProps> = ({
  order,
  turboTrackingData,
  shippingComparison,
  loadingComparison,
  turboLoading,
  onCreateShipment,
  onUpdateShipment,
  onSyncStatus,
  onPrintWaybill,
  onCancelShipment,
  onUnlinkShipment,
  onRecreateShipment,
  onCalculateShipping,
  canManageShipments = true,
}) => {
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();

  if (!order) return null;

  const normalizedTurboStatus = String(
    order.turboShipmentStatus || "",
  ).toLowerCase();
  const isTurboShipmentCancelled =
    normalizedTurboStatus === "cancelled" ||
    normalizedTurboStatus === "deleted" ||
    normalizedTurboStatus === "9";
  const isTurboShipmentDelivered =
    normalizedTurboStatus === "delivered" ||
    normalizedTurboStatus === "completed" ||
    normalizedTurboStatus === "7" ||
    normalizedTurboStatus === "8";
  const hasTurboShipmentLink = Boolean(
    order.turboTrackingNumber ||
      order.turboShipmentId ||
      order.turboShipmentStatus ||
      order.turboLabelUrl,
  );
  const canCancelTurboShipment =
    Boolean(order.turboShipmentId || order.turboTrackingNumber) &&
    !isTurboShipmentCancelled &&
    !isTurboShipmentDelivered;
  const canUnlinkTurboShipment = !isTurboShipmentDelivered;
  const canRecreateTurboShipment =
    Boolean(order.turboShipmentId || order.turboTrackingNumber) &&
    !isTurboShipmentDelivered;

  return (
    <div className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex justify-between items-center border-b border-border/40 pb-3">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck size={16} />
          </span>
          <span>شحن Turbo</span>
        </h3>
      </div>

      {hasTurboShipmentLink ? (
        <div className="space-y-4">
          <TurboTrackingInfoCard
            order={order}
            turboTrackingData={turboTrackingData}
            formatDate={formatDate}
          />

          <TurboCostComparisonCard
            order={order}
            shippingComparison={shippingComparison}
            loadingComparison={loadingComparison}
            canManageShipments={canManageShipments}
            onCalculateShipping={onCalculateShipping}
            formatPrice={formatPrice}
          />

          <TurboActionsBar
            canManageShipments={canManageShipments}
            canCancelTurboShipment={canCancelTurboShipment}
            canUnlinkTurboShipment={canUnlinkTurboShipment}
            canRecreateTurboShipment={canRecreateTurboShipment}
            turboLoading={turboLoading}
            turboTrackingNumber={order.turboTrackingNumber}
            onUpdateShipment={onUpdateShipment}
            onSyncStatus={onSyncStatus}
            onPrintWaybill={onPrintWaybill}
            onCancelShipment={onCancelShipment}
            onUnlinkShipment={onUnlinkShipment}
            onRecreateShipment={onRecreateShipment}
          />

          {/* Tracking History */}
          {turboTrackingData?.history && turboTrackingData.history.length > 0 && (
            <div className="pt-3.5 border-t border-border/40">
              <h4 className="text-xs font-bold text-foreground mb-2.5">
                سجل تتبع الشحنة:
              </h4>
              <div className="space-y-2">
                {turboTrackingData.history.map((event: any, index: number) => (
                  <div key={index} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {event.status || event.description}
                      </p>
                      {event.location && (
                        <p className="text-muted-foreground text-[11px]">
                          {event.location}
                        </p>
                      )}
                      {(event.timestamp || event.date) && (
                        <p className="text-muted-foreground/70 font-mono text-[10px] tabular-nums" dir="ltr">
                          {event.timestamp || event.date}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-xs text-muted-foreground mb-4">
            لم يتم إنشاء شحنة Turbo لهذا الطلب
          </p>
          {canManageShipments ? (
            <>
              <button
                type="button"
                onClick={onCreateShipment}
                disabled={turboLoading || order.status !== "CONFIRMED"}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-all active:scale-[0.98] shadow-xs"
              >
                {turboLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>جاري الإنشاء…</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>إنشاء شحنة Turbo</span>
                  </>
                )}
              </button>
              {order.status !== "CONFIRMED" && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  يجب تأكيد الطلب أولاً
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-2">
              إدارة الشحن من صلاحيات الشركة.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TurboShippingPanel;
