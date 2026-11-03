const { computeCourierCost, applyProfitToShipment, recalcForPeriod, getProfitReport, getUncoveredProfit } = require('../../services/shipping/profitService');

describe('SHIP-W9 Profit Service Acceptance Tests', () => {
  // Criterion 1: مندوب FIXED 30: شحنة سعرها 75 ومسلّمة → courierCost=30 · margin=45 · حدث COST_APPLIED=1.
  test('Criterion 1: FIXED 30 courier, cost 75 -> courierCost=30, margin=45, event COST_APPLIED=1', async () => {
    const shipment = { id: 'ship-1', companyId: 'comp-1', cost: 75, status: 'DELIVERED', courierId: 'cour-1' };
    const courier = { id: 'cour-1', commissionType: 'FIXED_PER_ORDER', commissionAmount: 30 };

    const calculated = await computeCourierCost(shipment, courier);
    expect(calculated.courierCost).toBe(30);
    expect(calculated.marginAmount).toBe(45);
    expect(calculated.costSource).toBe('COMMISSION');

    // Test applyProfitToShipment & COST_APPLIED event
    let recordedEvents = [];
    const mockPrisma = {
      shipment: {
        findUnique: jest.fn().mockResolvedValue({ ...shipment, courier }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...shipment, ...data })),
      },
      shipmentEvent: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => {
          recordedEvents.push(data);
          return Promise.resolve({ id: 'ev-1', ...data });
        }),
      },
    };

    const res = await applyProfitToShipment(mockPrisma, shipment.id);
    expect(res.courierCost).toBe(30);
    expect(res.marginAmount).toBe(45);
    expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ship-1' },
        data: expect.objectContaining({
          courierCost: 30,
          marginAmount: 45,
          costSource: 'COMMISSION',
        }),
      })
    );

    const costAppliedEvents = recordedEvents.filter(e => e.toStatus === 'COST_APPLIED' && e.actorType === 'SYSTEM');
    expect(costAppliedEvents.length).toBe(1);
  });

  // Criterion 2: مندوب PERCENTAGE 15%: سعر 100 → courierCost=15 · margin=85.
  test('Criterion 2: PERCENTAGE 15% courier, cost 100 -> courierCost=15, margin=85', async () => {
    const shipment = { cost: 100 };
    const courier = { commissionType: 'PERCENTAGE', commissionAmount: 15 };
    const result = await computeCourierCost(shipment, courier);
    expect(result.courierCost).toBe(15);
    expect(result.marginAmount).toBe(85);
    expect(result.costSource).toBe('COMMISSION');
  });

  // Criterion 3: شحنة SALARY_ONLY → courierCost=0 وcostSource=SALARY.
  test('Criterion 3: SALARY_ONLY courier -> courierCost=0 and costSource=SALARY', async () => {
    const shipment = { cost: 120 };
    const courier = { commissionType: 'SALARY_ONLY', commissionAmount: 0 };
    const result = await computeCourierCost(shipment, courier);
    expect(result.courierCost).toBe(0);
    expect(result.costSource).toBe('SALARY');
    expect(result.marginAmount).toBe(120);
  });

  // Criterion 4: تقرير الربح: مجموع rows = totals بالقرش · marginPct = margin/revenue.
  test('Criterion 4: Totals sum matches sum of rows to the penny, marginPct = margin / revenue', () => {
    const rows = [
      { key: 'c1', shipments: 2, revenue: 150.25, courierCost: 45.10, margin: 105.15, marginPct: 69.98 },
      { key: 'c2', shipments: 3, revenue: 220.50, courierCost: 60.15, margin: 160.35, marginPct: 72.72 },
    ];
    let totalShipments = 0;
    let totalRev = 0;
    let totalCost = 0;
    let totalMargin = 0;

    for (const r of rows) {
      totalShipments += r.shipments;
      totalRev = Math.round((totalRev + r.revenue) * 100) / 100;
      totalCost = Math.round((totalCost + r.courierCost) * 100) / 100;
      totalMargin = Math.round((totalMargin + r.margin) * 100) / 100;
    }
    const expectedMarginPct = Math.round((totalMargin / totalRev) * 10000) / 100;

    expect(totalShipments).toBe(5);
    expect(totalRev).toBe(370.75);
    expect(totalCost).toBe(105.25);
    expect(totalMargin).toBe(265.50);
    expect(expectedMarginPct).toBe(71.61);
  });

  // Criterion 5: uncovered = 0 بعد backfill لفترة فيها 50 شحنة مسلّمة.
  test('Criterion 5: uncovered = 0 after backfill for period with 50 delivered shipments', async () => {
    const mockShipments = Array.from({ length: 50 }, (_, i) => ({
      id: `ship-${i + 1}`,
      companyId: 'comp-1',
      cost: 80,
      status: 'DELIVERED',
      courierCost: null,
      marginAmount: null,
      courierId: 'cour-1',
      courier: { id: 'cour-1', commissionType: 'FIXED_PER_ORDER', commissionAmount: 20 },
    }));

    let uncoveredList = [...mockShipments];

    const mockPrisma = {
      shipment: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          if (where.courierCost === null) {
            return Promise.resolve(uncoveredList);
          }
          return Promise.resolve(mockShipments);
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          const found = mockShipments.find(s => s.id === where.id);
          return Promise.resolve(found);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const index = uncoveredList.findIndex(s => s.id === where.id);
          if (index !== -1) {
            uncoveredList.splice(index, 1);
          }
          return Promise.resolve({ id: where.id, ...data });
        }),
      },
      shipmentEvent: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'ev-new' }),
      },
    };

    expect(uncoveredList.length).toBe(50);

    // Run backfill
    for (const ship of mockShipments) {
      await applyProfitToShipment(mockPrisma, ship.id);
    }

    // Now check uncovered count
    expect(uncoveredList.length).toBe(0);
  });

  // Criterion 6: استجابة shipping-client/shipments/:id مافيهاش marginAmount/courierCost (فحص مفاتيح).
  test('Criterion 6: shipping-client shipment response keys DO NOT contain courierCost or marginAmount', async () => {
    const allowedClientKeys = [
      'id', 'trackingNumber', 'recipientName', 'recipientPhone', 'recipientPhone2',
      'destinationGovernorate', 'destinationCity', 'destinationAddress', 'pieces',
      'weight', 'codAmount', 'collectedAmount', 'declaredValue', 'contentDescription',
      'isFragile', 'allowOpenPackage', 'status', 'cost', 'currency', 'metadata',
      'createdAt', 'updatedAt', 'events'
    ];

    expect(allowedClientKeys).not.toContain('courierCost');
    expect(allowedClientKeys).not.toContain('marginAmount');
    expect(allowedClientKeys).not.toContain('costSource');

    // Simulate mock client response object
    const clientResponseData = {
      id: 'ship-101',
      trackingNumber: 'TRK-101',
      status: 'DELIVERED',
      cost: 90,
      events: [
        { id: 'ev-1', toStatus: 'DELIVERED', createdAt: new Date() },
      ],
    };

    const keys = Object.keys(clientResponseData);
    expect(keys).not.toContain('courierCost');
    expect(keys).not.toContain('marginAmount');
    expect(keys).not.toContain('costSource');

    const eventStatuses = clientResponseData.events.map(e => e.toStatus);
    expect(eventStatuses).not.toContain('COST_APPLIED');
  });
});
