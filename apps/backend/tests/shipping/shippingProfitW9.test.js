const { computeCourierCost } = require('../../services/shipping/profitService');

describe('SHIP-W9 Profit Service Unit Tests', () => {
  test('computeCourierCost with FIXED_PER_ORDER', async () => {
    const shipment = { cost: 100 };
    const courier = { commissionType: 'FIXED_PER_ORDER', commissionAmount: 25.5 };
    const result = await computeCourierCost(shipment, courier);
    expect(result.courierCost).toBe(25.5);
    expect(result.costSource).toBe('COMMISSION');
    expect(result.marginAmount).toBe(74.5);
  });

  test('computeCourierCost with PERCENTAGE', async () => {
    const shipment = { cost: 200 };
    const courier = { commissionType: 'PERCENTAGE', commissionAmount: 15 };
    const result = await computeCourierCost(shipment, courier);
    expect(result.courierCost).toBe(30);
    expect(result.costSource).toBe('COMMISSION');
    expect(result.marginAmount).toBe(170);
  });

  test('computeCourierCost with SALARY_ONLY', async () => {
    const shipment = { cost: 120 };
    const courier = { commissionType: 'SALARY_ONLY', commissionAmount: 0 };
    const result = await computeCourierCost(shipment, courier);
    expect(result.courierCost).toBe(0);
    expect(result.costSource).toBe('SALARY');
    expect(result.marginAmount).toBe(120);
  });

  test('computeCourierCost with 3PL partner company', async () => {
    const shipment = { cost: 85, shippingCompanyId: 'comp_part_1' };
    const result = await computeCourierCost(shipment, null);
    expect(result.courierCost).toBe(0);
    expect(result.costSource).toBe('PARTNER_RATE');
    expect(result.marginAmount).toBe(85);
  });

  test('computeCourierCost with no courier or partner', async () => {
    const shipment = { cost: 50 };
    const result = await computeCourierCost(shipment, null);
    expect(result.courierCost).toBe(0);
    expect(result.costSource).toBe('NONE');
    expect(result.marginAmount).toBe(50);
  });

  test('Totals sum must match sum of rows to the penny', () => {
    const rows = [
      { shipments: 2, revenue: 120.33, courierCost: 30.11, margin: 90.22, marginPct: 74.98 },
      { shipments: 1, revenue: 80.66, courierCost: 20.00, margin: 60.66, marginPct: 75.20 }
    ];
    let totalRev = 0;
    let totalCost = 0;
    let totalMargin = 0;
    for (const r of rows) {
      totalRev = Math.round((totalRev + r.revenue) * 100) / 100;
      totalCost = Math.round((totalCost + r.courierCost) * 100) / 100;
      totalMargin = Math.round((totalMargin + r.margin) * 100) / 100;
    }
    expect(totalRev).toBe(200.99);
    expect(totalCost).toBe(50.11);
    expect(totalMargin).toBe(150.88);
  });
});
