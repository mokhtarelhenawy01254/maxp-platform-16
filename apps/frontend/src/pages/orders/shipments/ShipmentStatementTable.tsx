import React from "react";
import { useCurrency } from "../../../hooks/useCurrency";
import { ShippingCompanyRef } from "./CarrierTabsBar";
import { ShipmentStatusBadgeResult } from "./shipmentStatusBadge";
import { ShipmentStatementTableRow } from "./ShipmentStatementTableRow";

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
    customerName?: string | null;
    customerPhone?: string | null;
    governorate?: string | null;
    city?: string | null;
    turboShipmentStatus?: string | null;
    customer?: {
      name: string;
      phone?: string | null;
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
  onPrintWaybill: (s: ShipmentRowItem) => void;
  onOpenChat: (s: ShipmentRowItem) => void;
  onOpenTicket: (s: ShipmentRowItem) => void;
  onResendShipment: (s: ShipmentRowItem) => void;
  onCancelShipment: (s: ShipmentRowItem) => void;
  onCopyTracking: (tracking: string) => void;
  getStatusBadge: (status: string, shipment?: ShipmentRowItem) => ShipmentStatusBadgeResult;
  formatDate: (date: string | Date | null | undefined) => string;
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right text-xs">
        {/* Table Head */}
        <thead className="bg-muted/60 text-muted-foreground border-b border-border/70 font-medium">
          <tr>
            <th className="px-3 py-3 w-10 text-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={onToggleSelectAll}
                className="rounded border-border/70 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                title="تحديد الكل"
              />
            </th>
            <th className="px-3 py-3 whitespace-nowrap">الطلب والتاريخ</th>
            <th className="px-3 py-3 whitespace-nowrap">الحالة والملاحظات</th>
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
        <tbody className="divide-y divide-border/50">
          {shipments.map((s) => (
            <ShipmentStatementTableRow
              key={s.id}
              shipment={s}
              isSelected={selectedIds.includes(s.id)}
              onToggleSelectOne={onToggleSelectOne}
              syncingId={syncingId}
              onSyncShipment={onSyncShipment}
              onPrintWaybill={onPrintWaybill}
              onOpenChat={onOpenChat}
              onOpenTicket={onOpenTicket}
              onResendShipment={onResendShipment}
              onCancelShipment={onCancelShipment}
              onCopyTracking={onCopyTracking}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
              formatPrice={formatPrice}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
