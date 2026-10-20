import React from "react";
import { PhoneIcon, MapPinIcon } from "@heroicons/react/24/outline";
import type { ShipmentRowItem } from "./ShipmentStatementTable";

export interface ShipmentDestinationCustomerCellProps {
  shipment: ShipmentRowItem;
}

export const ShipmentDestinationCustomerCell: React.FC<ShipmentDestinationCustomerCellProps> = React.memo(
  ({ shipment: s }) => {
    const customerName =
      s.order?.customerName || s.order?.customer?.name || "عميل غير محدد";
    const customerPhone = s.order?.customerPhone || s.order?.customer?.phone;

    return (
      <td className="px-3 py-3">
        <div className="font-semibold text-foreground flex items-center gap-1">
          <span>{customerName}</span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          {customerPhone && (
            <a
              href={`tel:${customerPhone}`}
              className="inline-flex items-center gap-0.5 text-[11px] font-mono tabular-nums text-primary hover:underline"
              title="اتصال بالعميل"
            >
              <PhoneIcon className="h-3 w-3 shrink-0" />
              <span>{customerPhone}</span>
            </a>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1">
          <MapPinIcon className="h-3 w-3 shrink-0 text-muted-foreground/60 mt-0.5" />
          <span className="line-clamp-2">
            {[
              s.destinationGovernorate || s.order?.governorate,
              s.destinationCity || s.order?.city,
              s.destinationAddress,
            ]
              .filter(Boolean)
              .join(" - ") || "بدون عنوان محدد"}
          </span>
        </div>
      </td>
    );
  }
);

ShipmentDestinationCustomerCell.displayName = "ShipmentDestinationCustomerCell";
