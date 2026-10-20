import React from "react";
import {
  CheckCircleIcon,
  TruckIcon,
  ArchiveBoxIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathRoundedSquareIcon,
} from "@heroicons/react/24/outline";
import { OrdersOperationalStageCard } from "./OrdersOperationalStageCard";

export interface OrdersOperationalFunnelGridProps {
  deliveredOrders: number;
  deliveredPct: number;
  deliveredPieces?: number;
  inTransitOrders: number;
  inTransitPct: number;
  inTransitPieces?: number;
  warehouseOrders: number;
  warehousePct: number;
  warehousePieces?: number;
  unprocessedOrders: number;
  unprocessedPct: number;
  unprocessedPieces?: number;
  cancelledOrders: number;
  cancelledPct: number;
  cancelledPieces?: number;
  returnedOrders: number;
  returnedPct: number;
  returnedPieces?: number;
  onFilterStatus?: (status: string) => void;
}

export const OrdersOperationalFunnelGrid: React.FC<OrdersOperationalFunnelGridProps> = React.memo(
  ({
    deliveredOrders,
    deliveredPct,
    deliveredPieces,
    inTransitOrders,
    inTransitPct,
    inTransitPieces,
    warehouseOrders,
    warehousePct,
    warehousePieces,
    unprocessedOrders,
    unprocessedPct,
    unprocessedPieces,
    cancelledOrders,
    cancelledPct,
    cancelledPieces,
    returnedOrders,
    returnedPct,
    returnedPieces,
    onFilterStatus,
  }) => {
    return (
      <div className="lg:col-span-8 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <OrdersOperationalStageCard
          title="تم التسليم"
          statusKey="DELIVERED"
          icon={CheckCircleIcon}
          percentage={deliveredPct}
          ordersCount={deliveredOrders}
          piecesCount={deliveredPieces}
          subLabel="طلب ناجح"
          piecesLabel="قطعة مسلّمة"
          tooltip="انقر لتصفية الطلبات المسلمة"
          variant="emerald"
          onFilterStatus={onFilterStatus}
        />

        <OrdersOperationalStageCard
          title="معلق بالشحن"
          statusKey="SHIPPED"
          icon={TruckIcon}
          percentage={inTransitPct}
          ordersCount={inTransitOrders}
          piecesCount={inTransitPieces}
          subLabel="مع المندوب"
          piecesLabel="قطعة بالشحن"
          tooltip="انقر لتصفية الطلبات قيد الشحن"
          variant="sky"
          onFilterStatus={onFilterStatus}
        />

        <OrdersOperationalStageCard
          title="معلق بالمخزن"
          statusKey="PROCESSING"
          icon={ArchiveBoxIcon}
          percentage={warehousePct}
          ordersCount={warehouseOrders}
          piecesCount={warehousePieces}
          subLabel="جاهز للتسليم"
          piecesLabel="قطعة بالمخزن"
          tooltip="انقر لتصفية الطلبات الجاهزة بالمخزن"
          variant="amber"
          onFilterStatus={onFilterStatus}
        />

        <OrdersOperationalStageCard
          title="معلق هنا (جديد)"
          statusKey="PENDING"
          icon={ClockIcon}
          percentage={unprocessedPct}
          ordersCount={unprocessedOrders}
          piecesCount={unprocessedPieces}
          subLabel="قيد التأكيد"
          piecesLabel="قطعة جديدة"
          tooltip="انقر لتصفية الطلبات المعلقة هنا"
          variant="indigo"
          onFilterStatus={onFilterStatus}
        />

        <OrdersOperationalStageCard
          title="ملغي"
          statusKey="CANCELLED"
          icon={XCircleIcon}
          percentage={cancelledPct}
          ordersCount={cancelledOrders}
          piecesCount={cancelledPieces}
          subLabel="طلب ملغي"
          piecesLabel="قطعة ملغاة"
          tooltip="انقر لتصفية الطلبات الملغاة"
          variant="rose"
          onFilterStatus={onFilterStatus}
        />

        <OrdersOperationalStageCard
          title="مرتجع"
          statusKey="RETURNED"
          icon={ArrowPathRoundedSquareIcon}
          percentage={returnedPct}
          ordersCount={returnedOrders}
          piecesCount={returnedPieces}
          subLabel="طلب مرتجع"
          piecesLabel="قطعة مرتجعة"
          tooltip="انقر لتصفية الطلبات المرتجعة"
          variant="red"
          onFilterStatus={onFilterStatus}
        />
      </div>
    );
  }
);

OrdersOperationalFunnelGrid.displayName = "OrdersOperationalFunnelGrid";
