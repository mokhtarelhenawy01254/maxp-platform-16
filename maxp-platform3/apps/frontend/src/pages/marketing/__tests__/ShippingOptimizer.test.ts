interface CourierInput {
  name: string;
  deliveryCost: number;
  rtoCost: number;
  deliveryRate: number;
  extraFees: number;
  codPct: number;
}

interface CourierResult extends CourierInput {
  deliveredOrders: number;
  failedOrders: number;
  shippingCost: number;
  rtoCostTotal: number;
  codCost: number;
  extraFeesTotal: number;
  total: number;
  costPerDelivered: number;
}

function computeCourier(c: CourierInput, aov: number, orders: number): CourierResult {
  const deliveredOrders = orders * (c.deliveryRate / 100);
  const failedOrders = orders - deliveredOrders;
  const shippingCost = orders * c.deliveryCost;
  const rtoCostTotal = failedOrders * c.rtoCost;
  const codCost = deliveredOrders * aov * (c.codPct / 100);
  const extraFeesTotal = orders * c.extraFees;
  const total = shippingCost + rtoCostTotal + codCost + extraFeesTotal;
  const costPerDelivered = deliveredOrders > 0 ? total / deliveredOrders : 0;
  return { ...c, deliveredOrders, failedOrders, shippingCost, rtoCostTotal, codCost, extraFeesTotal, total, costPerDelivered };
}

describe("computeCourier", () => {
  const base: CourierInput = {
    name: "Test", deliveryCost: 50, rtoCost: 35,
    deliveryRate: 70, extraFees: 0, codPct: 1.5,
  };

  it("calculates basic fields correctly", () => {
    const r = computeCourier(base, 800, 300);
    expect(r.deliveredOrders).toBe(210);
    expect(r.failedOrders).toBe(90);
    expect(r.shippingCost).toBe(15000);
    expect(r.rtoCostTotal).toBe(3150);
    expect(r.codCost).toBe(2520);
    expect(r.extraFeesTotal).toBe(0);
  });

  it("calculates total and costPerDelivered", () => {
    const r = computeCourier(base, 800, 300);
    expect(r.total).toBe(20670);
    expect(r.costPerDelivered).toBeCloseTo(98.4286, 4);
  });

  it("handles 100% delivery rate (no RTO)", () => {
    const r = computeCourier({ ...base, deliveryRate: 100 }, 800, 300);
    expect(r.failedOrders).toBe(0);
    expect(r.rtoCostTotal).toBe(0);
    expect(r.costPerDelivered).toBe(r.total / 300);
  });

  it("handles 0% delivery rate (all fail)", () => {
    const r = computeCourier({ ...base, deliveryRate: 0 }, 800, 300);
    expect(r.deliveredOrders).toBe(0);
    expect(r.costPerDelivered).toBe(0);
  });

  it("handles zero orders without division by zero", () => {
    const r = computeCourier(base, 800, 0);
    expect(r.total).toBe(0);
    expect(r.costPerDelivered).toBe(0);
  });

  it("includes extra fees in total", () => {
    const r = computeCourier({ ...base, extraFees: 10 }, 800, 300);
    expect(r.extraFeesTotal).toBe(3000);
    expect(r.total).toBe(23670);
  });

  it("computes COD commission correctly", () => {
    const r = computeCourier({ ...base, codPct: 5 }, 800, 300);
    expect(r.codCost).toBe(210 * 800 * 0.05);
  });
});
