import {
  OrderStats,
  ShippingPerformance,
  BranchPerformance,
  GovernorateDetail,
} from "./types";
import { DerivedOrderMetrics, DerivedFinancials } from "./analyticsCalculations";

export function deriveShippingList(
  stats: OrderStats | null,
  counts: DerivedOrderMetrics,
  financials: DerivedFinancials,
): ShippingPerformance[] {
  const rawList = stats?.shippingPerformance || [];
  if (rawList.length > 0) {
    const merged: Record<string, ShippingPerformance> = {};
    rawList.forEach((c) => {
      const key = c.name.toLowerCase().includes("turbo") ? "شركة Turbo للشحن والتوزيع" : c.name;
      if (!merged[key]) {
        merged[key] = { ...c, name: key };
      } else {
        merged[key].totalOrders += c.totalOrders;
        merged[key].deliveredOrders += c.deliveredOrders;
        merged[key].cancelledOrders += c.cancelledOrders;
        merged[key].returnedOrders += c.returnedOrders;
        merged[key].inTransitOrders += c.inTransitOrders;
        merged[key].totalRevenue += c.totalRevenue;
        merged[key].codCollected += c.codCollected;
        merged[key].lostShipping += c.lostShipping;
        if (merged[key].totalOrders > 0) {
          merged[key].deliveryRate = Number(
            ((merged[key].deliveredOrders / merged[key].totalOrders) * 100).toFixed(1),
          );
          merged[key].returnRate = Number(
            ((merged[key].returnedOrders / merged[key].totalOrders) * 100).toFixed(1),
          );
        }
      }
    });
    return Object.values(merged);
  }

  const { deliveredOrders, returnedOrders, inTransitOrders, totalOrders, cancelledOrders, totalRevenue } = counts;
  const { deliveryRate, returnRate, codDeliveredRevenue, pendingRevenue } = financials;

  if (deliveredOrders > 0 || returnedOrders > 0 || totalOrders > 0) {
    const dispatched = deliveredOrders + returnedOrders + inTransitOrders;
    return [
      {
        name: "شركة Turbo للتوزيع والشحن",
        totalOrders: dispatched > 0 ? dispatched : totalOrders,
        deliveredOrders,
        cancelledOrders,
        returnedOrders,
        inTransitOrders,
        deliveryRate: dispatched > 0 ? Number(((deliveredOrders / dispatched) * 100).toFixed(1)) : deliveryRate,
        returnRate: dispatched > 0 ? Number(((returnedOrders / dispatched) * 100).toFixed(1)) : returnRate,
        avgDeliveryDays: 2.2,
        totalRevenue,
        codCollected: codDeliveredRevenue,
        uncollectedCash: pendingRevenue,
        lostShipping: returnedOrders * 45,
      },
    ];
  }
  return [];
}

export function deriveBranchList(
  stats: OrderStats | null,
  counts: DerivedOrderMetrics,
  financials: DerivedFinancials,
): BranchPerformance[] {
  if (stats?.branchPerformance && stats.branchPerformance.length > 0) {
    return stats.branchPerformance;
  }
  const { totalOrders, deliveredOrders, returnedOrders, inTransitOrders, warehouseOrders, cancelledOrders, totalRevenue } = counts;
  const { deliveryRate, returnRate } = financials;

  return [
    {
      name: "المستودع الرئيسي (فرع الضبعة)",
      totalOrders,
      dispatchedOrders: deliveredOrders + returnedOrders + inTransitOrders,
      pendingDispatch: warehouseOrders,
      deliveredOrders,
      returnedOrders,
      cancelledOrders,
      deliveryRate,
      returnRate,
      revenue: totalRevenue,
    },
  ];
}

export function deriveGovernorateList(
  stats: OrderStats | null,
  counts: DerivedOrderMetrics,
  financials: DerivedFinancials,
): GovernorateDetail[] {
  if (stats?.governorateDetails && stats.governorateDetails.length > 0) {
    return stats.governorateDetails;
  }
  const rawGov = stats?.governorateStats || {};
  const total = counts.totalOrders > 0 ? counts.totalOrders : 1;
  const dRate = financials.deliveryRate / 100;
  const rRate = financials.returnRate / 100;
  const cRate = financials.cancellationRate / 100;
  const aov = stats?.avgOrderValue || (counts.totalOrders > 0 ? counts.totalRevenue / counts.totalOrders : 0);

  return Object.entries(rawGov)
    .map(([name, count]) => {
      const govDelivered = Math.round(count * dRate);
      const govReturned = Math.round(count * rRate);
      const govCancelled = Math.round(count * cRate);
      const govRevenue = count * aov;
      const govDRate = count > 0 ? Number(((govDelivered / count) * 100).toFixed(1)) : 0;
      const govRRate = count > 0 ? Number(((govReturned / count) * 100).toFixed(1)) : 0;
      const sharePct = Number(((count / total) * 100).toFixed(1));
      const lostCost = govReturned * 45;

      return {
        name,
        ordersCount: count,
        deliveredCount: govDelivered,
        cancelledCount: govCancelled,
        returnedCount: govReturned,
        revenue: govRevenue,
        shippingCost: count * 45,
        lostShippingCost: lostCost,
        avgShippingCost: 45,
        deliveryRate: govDRate,
        returnRate: govRRate,
        sharePct,
      };
    })
    .sort((a, b) => b.ordersCount - a.ordersCount);
}
