/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { ShippingTrackingHeader } from "./ShippingTrackingHeader";
import { ShippingDeliveryTelemetry } from "./ShippingDeliveryTelemetry";
import { ShippingTrackingActions } from "./ShippingTrackingActions";

export interface ShippingTrackingViewProps {
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
  return (
    <div className="space-y-4">
      {/* 3-Column Info Header */}
      <ShippingTrackingHeader
        order={order}
        existingTracking={existingTracking}
        existingCarrierName={existingCarrierName}
        isQpExpress={isQpExpress}
        isBosta={isBosta}
        isTurbo={isTurbo}
        onCopyTracking={onCopyTracking}
      />

      {/* Return & Delay Reasons + Driver Telemetry */}
      <ShippingDeliveryTelemetry
        order={order}
        shipmentMeta={shipmentMeta}
        liveStatus={liveStatus}
      />

      {/* Action Buttons for active shipment */}
      <ShippingTrackingActions
        order={order}
        shipment={shipment}
        existingTracking={existingTracking}
        isQpExpress={isQpExpress}
        isBosta={isBosta}
        isTurbo={isTurbo}
        resending={resending}
        syncing={syncing}
        onResendShipment={onResendShipment}
        onSyncStatus={onSyncStatus}
        onOpenTicket={onOpenTicket}
        onPrintBostaAWB={onPrintBostaAWB}
        onPrintQpWaybill={onPrintQpWaybill}
        onShowCancelModal={onShowCancelModal}
      />
    </div>
  );
};

export default ShippingTrackingView;
