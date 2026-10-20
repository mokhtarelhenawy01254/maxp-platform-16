import React from "react";
import {
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

export interface ShipmentCarrierTrackingCellProps {
  carrierType: string;
  tracking?: string | null;
  onCopyTracking: (tracking: string) => void;
}

const getCarrierTrackUrl = (
  carrierType: string,
  trackingNumber?: string | null
): string | null => {
  if (!trackingNumber) return null;
  const c = carrierType.toUpperCase();
  if (c === "BOSTA")
    return `https://bosta.co/tracking-shipment/?shipmentNumber=${trackingNumber}`;
  if (c === "TURBO")
    return `https://turbocouriers.com/ar/track/${trackingNumber}`;
  if (c === "ARAMEX")
    return `https://www.aramex.com/track/results?shipmentNumber=${trackingNumber}`;
  if (c === "Mylerz")
    return `https://track.mylerz.com/${trackingNumber}`;
  if (c === "QP_EXPRESS" || c === "QPEXPRESS")
    return `https://qpexpress.net/track/${trackingNumber}`;
  return null;
};

export const ShipmentCarrierTrackingCell: React.FC<ShipmentCarrierTrackingCellProps> = React.memo(
  ({ carrierType, tracking, onCopyTracking }) => {
    const trackUrl = getCarrierTrackUrl(carrierType, tracking);

    return (
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
    );
  }
);

ShipmentCarrierTrackingCell.displayName = "ShipmentCarrierTrackingCell";
