import { compute } from "../RefundRateCalculator";

const base = {
  revenue: 100000,
  orders: 200,
  refundRate: 10,
  refundAmount: 500,
  shipping: 50,
  restocking: 20,
  margin: 30,
};

describe("RefundRateCalculator compute", () => {
  it("10% refunds on 200 orders of 500 = net loss 9000 after shipping and restocking", () => {
    const r = compute(base);
    expect(r.refundedOrders).toBe(20);
    expect(r.totalRefund).toBe(10000);
    expect(r.shippingCost).toBe(1000);
    expect(r.restockingRecovery).toBe(2000);
    expect(r.netRefundLoss).toBe(9000);
  });

  it("lostProfit equals netRefundLoss — cash loss is NOT margin-adjusted (ticket T2 regression)", () => {
    const r = compute(base);
    // 30% margin would have shown 2700 under the old formula; the cash loss is 9000.
    expect(r.lostProfit).toBe(9000);
    expect(r.lostProfit).toBe(r.netRefundLoss);
  });

  it("maxAcceptableRate uses the documented 15% revenue share constant", () => {
    const r = compute(base);
    const perUnitCost = 500 + 50 - 500 * 0.2; // 450
    const expected = (100000 * 0.15) / (200 * perUnitCost) * 100;
    expect(r.maxAcceptableRate).toBeCloseTo(expected, 6);
  });

  it("zero refunds produce zero losses", () => {
    const r = compute({ ...base, refundRate: 0 });
    expect(r.netRefundLoss).toBe(0);
    expect(r.lostProfit).toBe(0);
    expect(r.effectiveRevenue).toBe(100000);
  });
});
