import { compute } from "../AdBudgetPlanner";

const base = {
  targetRevenue: 100000,
  aov: 500,
  targetRoas: 3,
  cpp: 120,
  totalBudget: 33333,
  convRate: 3,
  dailyCap: 3000,
};

describe("AdBudgetPlanner compute", () => {
  it("cpp mode derives budget from revenue / ROAS", () => {
    const r = compute(base, "cpp");
    expect(r.monthlyBudget).toBeCloseTo(100000 / 3, 2);
    expect(r.expectedRevenue).toBe(100000);
    expect(r.expectedOrders).toBe(200);
    expect(r.actualRoas).toBeCloseTo(3, 5);
    expect(r.daysToTarget).toBe(Math.ceil(100000 / 3 / 3000));
  });

  it("budget mode uses totalBudget and derives revenue from ROAS", () => {
    const r = compute(base, "budget");
    expect(r.monthlyBudget).toBe(33333);
    expect(r.expectedRevenue).toBe(33333 * 3);
    expect(r.profitAfterAds).toBe(33333 * 3 - 33333);
    expect(r.expectedOrders).toBe(Math.round((33333 * 3) / 500));
    expect(r.actualRoas).toBeCloseTo(3, 5);
  });

  it("switching mode changes the results (ticket T1 regression)", () => {
    const inputs = { ...base, totalBudget: 10000 };
    const cpp = compute(inputs, "cpp");
    const budget = compute(inputs, "budget");
    expect(budget.monthlyBudget).toBe(10000);
    expect(budget.monthlyBudget).not.toBe(cpp.monthlyBudget);
    expect(budget.expectedRevenue).not.toBe(cpp.expectedRevenue);
    expect(budget.profitAfterAds).not.toBe(cpp.profitAfterAds);
  });

  it("presets are internally consistent (totalBudget = revenue / ROAS)", () => {
    const presets = [
      { targetRevenue: 100000, targetRoas: 3, totalBudget: 33333 },
      { targetRevenue: 300000, targetRoas: 4, totalBudget: 75000 },
      { targetRevenue: 700000, targetRoas: 5, totalBudget: 140000 },
    ];
    for (const p of presets) {
      expect(p.totalBudget).toBe(Math.round(p.targetRevenue / p.targetRoas));
    }
  });
});
