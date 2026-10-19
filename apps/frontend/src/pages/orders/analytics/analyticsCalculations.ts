import { OrderStats } from "./types";

export interface DerivedOrderMetrics {
  totalOrders: number;
  totalRevenue: number;
  statusDist: Record<string, number>;
  statusPieces: Record<string, number>;
  paymentStats: Record<string, number>;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  inTransitOrders: number;
  warehouseOrders: number;
  unprocessedOrders: number;
  totalPieces: number;
  avgPiecesPerOrder: number;
  avgPiecesPerDay: number;
  deliveredPieces: number;
  inTransitPieces: number;
  warehousePieces: number;
  cancelledPieces: number;
  returnedPieces: number;
  unprocessedPieces: number;
  deliveredPct: number;
  inTransitPct: number;
  warehousePct: number;
  unprocessedPct: number;
  cancelledPct: number;
  returnedPct: number;
  avgOrdersPerDay: number;
  avgDeliveredPerDay: number;
  avgCancelledPerDay: number;
  avgReturnedPerDay: number;
  avgDeliveredPiecesPerDay: number;
  avgCancelledPiecesPerDay: number;
  avgReturnedPiecesPerDay: number;
}

export interface DerivedFinancials {
  deliveryRate: number;
  cancellationRate: number;
  returnRate: number;
  netRevenue: number;
  pendingRevenue: number;
  lostRevenue: number;
  netRealizationPct: number;
  codOrdersCount: number;
  prepaidOrdersCount: number;
  codDeliveredRevenue: number;
  codCollectionRate: number;
  prepaidDeliveryRate: number;
}

export function deriveOrderCountsAndPieces(
  stats: OrderStats | null,
  daysCount: number,
): DerivedOrderMetrics {
  const totalOrders = stats?.totalOrders || 0;
  const totalRevenue = stats?.totalRevenue || 0;
  const statusDist = stats?.statusDistribution || {};
  const statusPieces = stats?.statusPiecesDistribution || {};
  const paymentStats = stats?.paymentStats || {};

  // 1. Delivered
  let deliveredOrders = 0;
  if (typeof stats?.metrics?.deliveredOrders === "number" && stats.metrics.deliveredOrders > 0) {
    deliveredOrders = stats.metrics.deliveredOrders;
  } else {
    deliveredOrders =
      (statusDist["DELIVERED"] || 0) +
      (statusDist["PARTIALLY_DELIVERED"] || 0) +
      (statusDist["COMPLETED"] || 0) +
      (statusDist["delivered"] || 0);
  }

  // 2. Cancelled
  let cancelledOrders = 0;
  if (typeof stats?.metrics?.cancelledOrders === "number" && stats.metrics.cancelledOrders > 0) {
    cancelledOrders = stats.metrics.cancelledOrders;
  } else {
    cancelledOrders =
      (statusDist["CANCELLED"] || 0) +
      (statusDist["REJECTED"] || 0) +
      (statusDist["FAILED"] || 0) +
      (statusDist["DUPLICATE_ORDER"] || 0) +
      (statusDist["cancelled"] || 0);
  }

  // 3. Returned
  let returnedOrders = 0;
  if (typeof stats?.metrics?.returnedOrders === "number" && stats.metrics.returnedOrders > 0) {
    returnedOrders = stats.metrics.returnedOrders;
  } else {
    returnedOrders =
      (statusDist["RETURNED"] || 0) +
      (statusDist["PARTIALLY_RETURNED"] || 0) +
      (statusDist["RETURNED_TO_COMPANY"] || 0) +
      (statusDist["REFUNDED"] || 0) +
      (statusDist["PARTIALLY_REFUNDED"] || 0) +
      (statusDist["returned"] || 0);
  }

  // 4. In Transit
  const inTransitOrders =
    (statusDist["SHIPPED"] || 0) +
    (statusDist["OUT_FOR_DELIVERY"] || 0) +
    (statusDist["in_transit"] || 0);

  // 5. Warehouse Pending
  const rawWarehouse =
    (statusDist["READY_FOR_SHIPPING"] || 0) +
    (statusDist["PROCESSING_WAREHOUSE"] || 0) +
    (statusDist["PACKED"] || 0) +
    (statusDist["PREPARING"] || 0);
  const warehouseOrders =
    rawWarehouse > 0
      ? rawWarehouse
      : typeof stats?.actionCenter?.pendingFulfillmentCount === "number"
        ? stats.actionCenter.pendingFulfillmentCount
        : 0;

  // 6. Unprocessed
  const unprocessedOrders = Math.max(
    0,
    totalOrders - deliveredOrders - inTransitOrders - warehouseOrders - cancelledOrders - returnedOrders,
  );

  // Pieces & Basket Size Intelligence
  const totalPieces = stats?.totalPieces || 0;
  const avgPiecesPerOrder =
    totalOrders > 0 && totalPieces > 0
      ? Number((totalPieces / totalOrders).toFixed(1))
      : stats?.avgPiecesPerOrder || 0;
  const avgPiecesPerDay =
    daysCount > 0 && totalPieces > 0 ? Number((totalPieces / daysCount).toFixed(1)) : 0;

  const deliveredPieces = (() => {
    const raw =
      (statusPieces["DELIVERED"] || 0) +
      (statusPieces["PARTIALLY_DELIVERED"] || 0) +
      (statusPieces["COMPLETED"] || 0) +
      (statusPieces["delivered"] || 0);
    if (raw > 0) return raw;
    return deliveredOrders > 0 && avgPiecesPerOrder > 0
      ? Math.round(deliveredOrders * avgPiecesPerOrder)
      : 0;
  })();

  const inTransitPieces = (() => {
    const raw =
      (statusPieces["SHIPPED"] || 0) +
      (statusPieces["OUT_FOR_DELIVERY"] || 0) +
      (statusPieces["in_transit"] || 0);
    if (raw > 0) return raw;
    return inTransitOrders > 0 && avgPiecesPerOrder > 0
      ? Math.round(inTransitOrders * avgPiecesPerOrder)
      : 0;
  })();

  const warehousePieces = (() => {
    const raw =
      (statusPieces["READY_FOR_SHIPPING"] || 0) +
      (statusPieces["PROCESSING_WAREHOUSE"] || 0) +
      (statusPieces["PACKED"] || 0) +
      (statusPieces["PREPARING"] || 0);
    if (raw > 0) return raw;
    return warehouseOrders > 0 && avgPiecesPerOrder > 0
      ? Math.round(warehouseOrders * avgPiecesPerOrder)
      : 0;
  })();

  const cancelledPieces = (() => {
    const raw =
      (statusPieces["CANCELLED"] || 0) +
      (statusPieces["REJECTED"] || 0) +
      (statusPieces["FAILED"] || 0) +
      (statusPieces["DUPLICATE_ORDER"] || 0) +
      (statusPieces["cancelled"] || 0);
    if (raw > 0) return raw;
    return cancelledOrders > 0 && avgPiecesPerOrder > 0
      ? Math.round(cancelledOrders * avgPiecesPerOrder)
      : 0;
  })();

  const returnedPieces = (() => {
    const raw =
      (statusPieces["RETURNED"] || 0) +
      (statusPieces["PARTIALLY_RETURNED"] || 0) +
      (statusPieces["RETURNED_TO_COMPANY"] || 0) +
      (statusPieces["REFUNDED"] || 0) +
      (statusPieces["PARTIALLY_REFUNDED"] || 0) +
      (statusPieces["returned"] || 0);
    if (raw > 0) return raw;
    return returnedOrders > 0 && avgPiecesPerOrder > 0
      ? Math.round(returnedOrders * avgPiecesPerOrder)
      : 0;
  })();

  const unprocessedPieces = (() => {
    const raw = (statusPieces["PENDING"] || 0) + (statusPieces["CONFIRMED"] || 0);
    if (raw > 0) return raw;
    return Math.max(
      0,
      totalPieces -
        (deliveredPieces + cancelledPieces + returnedPieces + inTransitPieces + warehousePieces),
    );
  })();

  // Percentages
  const safeTotal = totalOrders > 0 ? totalOrders : 1;
  const deliveredPct =
    totalOrders > 0 ? Number(((deliveredOrders / safeTotal) * 100).toFixed(1)) : 0;
  const inTransitPct =
    totalOrders > 0 ? Number(((inTransitOrders / safeTotal) * 100).toFixed(1)) : 0;
  const warehousePct =
    totalOrders > 0 ? Number(((warehouseOrders / safeTotal) * 100).toFixed(1)) : 0;
  const unprocessedPct =
    totalOrders > 0 ? Number(((unprocessedOrders / safeTotal) * 100).toFixed(1)) : 0;
  const cancelledPct =
    totalOrders > 0 ? Number(((cancelledOrders / safeTotal) * 100).toFixed(1)) : 0;
  const returnedPct =
    totalOrders > 0 ? Number(((returnedOrders / safeTotal) * 100).toFixed(1)) : 0;

  // Daily Averages
  const avgOrdersPerDay =
    daysCount > 0 ? Number((totalOrders / daysCount).toFixed(1)) : totalOrders;
  const avgDeliveredPerDay =
    daysCount > 0 ? Number((deliveredOrders / daysCount).toFixed(2)) : deliveredOrders;
  const avgCancelledPerDay =
    daysCount > 0 ? Number((cancelledOrders / daysCount).toFixed(2)) : cancelledOrders;
  const avgReturnedPerDay =
    daysCount > 0 ? Number((returnedOrders / daysCount).toFixed(2)) : returnedOrders;

  const avgDeliveredPiecesPerDay =
    daysCount > 0 && deliveredPieces > 0 ? Number((deliveredPieces / daysCount).toFixed(1)) : 0;
  const avgCancelledPiecesPerDay =
    daysCount > 0 && cancelledPieces > 0 ? Number((cancelledPieces / daysCount).toFixed(1)) : 0;
  const avgReturnedPiecesPerDay =
    daysCount > 0 && returnedPieces > 0 ? Number((returnedPieces / daysCount).toFixed(1)) : 0;

  return {
    totalOrders,
    totalRevenue,
    statusDist,
    statusPieces,
    paymentStats,
    deliveredOrders,
    cancelledOrders,
    returnedOrders,
    inTransitOrders,
    warehouseOrders,
    unprocessedOrders,
    totalPieces,
    avgPiecesPerOrder,
    avgPiecesPerDay,
    deliveredPieces,
    inTransitPieces,
    warehousePieces,
    cancelledPieces,
    returnedPieces,
    unprocessedPieces,
    deliveredPct,
    inTransitPct,
    warehousePct,
    unprocessedPct,
    cancelledPct,
    returnedPct,
    avgOrdersPerDay,
    avgDeliveredPerDay,
    avgCancelledPerDay,
    avgReturnedPerDay,
    avgDeliveredPiecesPerDay,
    avgCancelledPiecesPerDay,
    avgReturnedPiecesPerDay,
  };
}

export function deriveFinancialsAndPayments(
  stats: OrderStats | null,
  counts: DerivedOrderMetrics,
): DerivedFinancials {
  const { totalOrders, totalRevenue, deliveredOrders, cancelledOrders, returnedOrders, inTransitOrders, deliveredPct, cancelledPct, returnedPct, paymentStats } = counts;
  const safeTotal = totalOrders > 0 ? totalOrders : 1;

  const deliveryRate = deliveredPct;
  const cancellationRate = cancelledPct;
  const returnRate = returnedPct;

  const netRevenue =
    typeof stats?.metrics?.netRealizedRevenue === "number" && stats.metrics.netRealizedRevenue > 0
      ? stats.metrics.netRealizedRevenue
      : totalOrders > 0 && totalRevenue > 0
        ? Math.round(totalRevenue * (deliveredOrders / safeTotal))
        : 0;

  const pendingRevenue =
    totalOrders > 0 && totalRevenue > 0
      ? Math.round(totalRevenue * (inTransitOrders / safeTotal))
      : 0;
  const lostRevenue =
    totalOrders > 0 && totalRevenue > 0
      ? Math.round(totalRevenue * ((returnedOrders + cancelledOrders) / safeTotal))
      : 0;
  const netRealizationPct =
    totalRevenue > 0 ? Number(((netRevenue / totalRevenue) * 100).toFixed(1)) : 0;

  // Payment Breakdown
  const codOrdersCount =
    (paymentStats["CASH"] || 0) +
    (paymentStats["COD"] || 0) +
    (paymentStats["cash"] || 0) +
    (paymentStats["cod"] || 0);
  const prepaidOrdersCount = Object.entries(paymentStats).reduce(
    (acc, [m, c]) => (!["CASH", "COD"].includes(m.toUpperCase()) ? acc + c : acc),
    0,
  );
  const codDeliveredRevenue =
    typeof stats?.metrics?.codDeliveredRevenue === "number" && stats.metrics.codDeliveredRevenue > 0
      ? stats.metrics.codDeliveredRevenue
      : netRevenue;
  const codCollectionRate =
    stats?.metrics?.codCollectionRate ??
    (totalOrders > 0 ? Number(((deliveredOrders / safeTotal) * 100).toFixed(1)) : 0);
  const prepaidDeliveryRate =
    typeof stats?.metrics?.prepaidDeliveryRate === "number" && stats.metrics.prepaidDeliveryRate > 0
      ? stats.metrics.prepaidDeliveryRate
      : prepaidOrdersCount > 0
        ? 95
        : 0;

  return {
    deliveryRate,
    cancellationRate,
    returnRate,
    netRevenue,
    pendingRevenue,
    lostRevenue,
    netRealizationPct,
    codOrdersCount,
    prepaidOrdersCount,
    codDeliveredRevenue,
    codCollectionRate,
    prepaidDeliveryRate,
  };
}

export {
  deriveShippingList,
  deriveBranchList,
  deriveGovernorateList,
} from "./logisticsCalculations";
