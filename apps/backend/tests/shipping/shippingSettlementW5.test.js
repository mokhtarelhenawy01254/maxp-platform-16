/**
 * SHIP-W5 COD Settlements & Shipping Client Statements Acceptance Tests
 * 
 * Verifies all 7 Acceptance Criteria:
 * 1. 200 delivered shipments + 20 returned in period -> preview: grossCOD = sum(collectedAmount) with piastres/cents, net = collected - shipping - cod - return (decimals).
 * 2. Create settlement, then attempt to include same shipment in second settlement -> excluded.
 * 3. Approve then attempt to edit line -> 409/400.
 * 4. Pay -> PAID + reference + no modification to shipment records.
 * 5. Client requests another client's settlement -> 404 (not 403, strict isolation).
 * 6. GET /shipping-client/settlements contains zero internal cost fields (key inspection).
 * 7. Void is allowed for DRAFT only; export CSV contains valid headers & BOM.
 */

const mockPrisma = {
  merchant: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  clientRateCard: {
    findMany: jest.fn(),
  },
  shipment: {
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  shippingSettlement: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  shippingSettlementLine: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  treasuryAccount: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  treasuryTransaction: {
    create: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockPrisma)),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

const settlementService = require('../../services/shipping/settlementService');

describe('SHIP-W5: COD Settlements Engine & Acceptance Tests', () => {
  const companyId = 'comp-ship-1';
  const merchantA = 'merch-a';
  const merchantB = 'merch-b';

  const mockRateCard = {
    id: 'rc-1',
    companyId,
    merchantId: merchantA,
    name: 'Cairo Express',
    governorateCode: 'القاهرة',
    basePrice: 50.25,
    baseWeightKg: 1,
    extraKgPrice: 10,
    codFeeFixed: 5.50,
    codFeePercent: 1.5, // 1.5%
    returnFee: 25.00,
    isActive: true,
  };

  const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb) => cb(mockPrisma));
  });

  test('Acceptance 1: 200 delivered + 20 returned shipments -> exact decimal sums for grossCOD and netPayout', async () => {
    const deliveredShipments = [];
    let expectedGrossCOD = 0;
    let expectedShippingFees = 0;
    let expectedCodFees = 0;

    for (let i = 1; i <= 200; i++) {
      const cod = round2(150.75 + (i % 10) * 0.10);
      const collected = cod;
      const cost = 50.25;
      const codFee = round2(5.50 + (collected * 1.5) / 100);

      expectedGrossCOD = round2(expectedGrossCOD + collected);
      expectedShippingFees = round2(expectedShippingFees + cost);
      expectedCodFees = round2(expectedCodFees + codFee);

      deliveredShipments.push({
        id: `ship-del-${i}`,
        companyId,
        merchantId: merchantA,
        status: 'DELIVERED',
        destinationGovernorate: 'القاهرة',
        codAmount: cod,
        collectedAmount: collected,
        cost,
        actualWeight: 1,
        weight: 1,
        createdAt: new Date('2026-11-01T10:00:00Z'),
        order: { orderNumber: `ORD-${i}` },
      });
    }

    const returnedShipments = [];
    let expectedReturnFees = 0;
    for (let i = 1; i <= 20; i++) {
      const returnFee = 25.00;
      expectedReturnFees = round2(expectedReturnFees + returnFee);

      returnedShipments.push({
        id: `ship-ret-${i}`,
        companyId,
        merchantId: merchantA,
        status: 'RETURNED',
        destinationGovernorate: 'القاهرة',
        codAmount: 200.00,
        collectedAmount: 0,
        cost: 0,
        actualWeight: 1,
        weight: 1,
        createdAt: new Date('2026-11-02T10:00:00Z'),
        order: { orderNumber: `ORD-RET-${i}` },
      });
    }

    const allShipments = [...deliveredShipments, ...returnedShipments];

    mockPrisma.merchant.findFirst.mockResolvedValue({
      id: merchantA,
      name: 'تاجر الملابس',
      phone: '01011111111',
      email: 'merchant@test.com',
    });
    mockPrisma.clientRateCard.findMany.mockResolvedValue([mockRateCard]);
    mockPrisma.shipment.findMany.mockResolvedValue(allShipments);

    const preview = await settlementService.preview({
      companyId,
      merchantId: merchantA,
      from: '2026-11-01',
      to: '2026-11-04',
      prismaClient: mockPrisma,
    });

    expect(preview.summary.totalShipments).toBe(220);
    expect(preview.summary.deliveredCount).toBe(200);
    expect(preview.summary.returnedCount).toBe(20);

    expect(preview.summary.grossCOD).toBe(expectedGrossCOD);
    expect(preview.summary.shippingFeesTotal).toBe(expectedShippingFees);
    expect(preview.summary.codFeesTotal).toBe(expectedCodFees);
    expect(preview.summary.returnFeesTotal).toBe(expectedReturnFees);

    const expectedNet = round2(expectedGrossCOD - expectedShippingFees - expectedCodFees - expectedReturnFees);
    expect(preview.summary.netPayout).toBe(expectedNet);

    // Verify sum of lines equals summary netPayout down to the penny
    const linesNetSum = round2(preview.lines.reduce((s, l) => s + l.net, 0));
    expect(preview.summary.netPayout).toBe(linesNetSum);
  });

  test('Acceptance 2: create settlement excludes already settled shipments', async () => {
    const rawShipments = [
      { id: 's-1', status: 'DELIVERED', codAmount: 100, collectedAmount: 100, cost: 40, destinationGovernorate: 'القاهرة' },
      { id: 's-2', status: 'DELIVERED', codAmount: 200, collectedAmount: 200, cost: 40, destinationGovernorate: 'القاهرة' },
    ];

    let createdRecord = null;
    mockPrisma.merchant.findFirst.mockResolvedValue({ id: merchantA, name: 'تاجر' });
    mockPrisma.clientRateCard.findMany.mockResolvedValue([mockRateCard]);
    mockPrisma.shipment.findMany.mockResolvedValue(rawShipments);
    mockPrisma.shippingSettlementLine.findMany.mockResolvedValue([{ shipmentId: 's-1' }]);
    mockPrisma.shippingSettlement.create.mockImplementation((args) => {
      createdRecord = args.data;
      return { id: 'settle-1', ...args.data };
    });

    const result = await settlementService.issue({
      companyId,
      merchantId: merchantA,
      shipmentIds: ['s-1', 's-2'],
    });

    // Shipment s-1 must be excluded, only s-2 created
    expect(createdRecord.totalShipments).toBe(1);
    expect(createdRecord.lines.create.length).toBe(1);
    expect(createdRecord.lines.create[0].shipmentId).toBe('s-2');
  });

  test('Acceptance 3: approve locks settlement; editing line on APPROVED/PAID returns 409', async () => {
    const approvedSettlement = {
      id: 'settle-approved-1',
      companyId,
      merchantId: merchantA,
      status: 'APPROVED',
      approvedBy: 'super-admin',
      approvedAt: new Date(),
    };

    mockPrisma.shippingSettlement.findFirst.mockResolvedValue(approvedSettlement);

    // Attempting to edit line in APPROVED settlement
    await expect(
      settlementService.updateLine('settle-approved-1', 'line-1', { codAmount: 999 }, { companyId })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('ممنوع تعديل أسطر كشف معتمد أو مدفوع'),
    });
  });

  test('Acceptance 4: pay updates status to PAID, links treasury transaction, leaves shipment amounts untouched', async () => {
    const approvedSettlement = {
      id: 'settle-to-pay',
      companyId,
      merchantId: merchantA,
      settlementNumber: 'SET-20261103-9999',
      status: 'APPROVED',
      netPayout: 1250.50,
      lines: [{ id: 'line-1', shipmentId: 'ship-1' }],
    };

    const mockAccount = {
      id: 'treasury-main',
      companyId,
      balance: 10000.00,
    };

    let createdTx = null;
    let updatedSettlement = null;

    mockPrisma.shippingSettlement.findFirst.mockResolvedValue(approvedSettlement);
    mockPrisma.shippingSettlement.update.mockImplementation((args) => {
      updatedSettlement = args.data;
      return { ...approvedSettlement, ...args.data };
    });
    mockPrisma.treasuryAccount.findFirst.mockResolvedValue(mockAccount);
    mockPrisma.treasuryAccount.update.mockResolvedValue({
      ...mockAccount,
      balance: mockAccount.balance - 1250.50,
    });
    mockPrisma.treasuryTransaction.create.mockImplementation((args) => {
      createdTx = args.data;
      return { id: 'ttx-123', ...args.data };
    });

    const paidResult = await settlementService.pay('settle-to-pay', {
      companyId,
      method: 'BANK_TRANSFER',
      reference: 'TXN-REF-8877',
      treasuryAccountId: 'treasury-main',
      userId: 'user-finance-1',
    });

    expect(updatedSettlement.status).toBe('PAID');
    expect(updatedSettlement.paymentMethod).toBe('BANK_TRANSFER');
    expect(updatedSettlement.paymentReference).toBe('TXN-REF-8877');
    expect(createdTx.type).toBe('WITHDRAWAL');
    expect(createdTx.amount).toBe(1250.50);
    expect(mockPrisma.shipment.update).not.toHaveBeenCalled();
    expect(mockPrisma.shipment.updateMany).not.toHaveBeenCalled();
  });

  test('Acceptance 5: client portal querying another client settlement returns 404', async () => {
    const settlementMerchantA = {
      id: 'settle-a-1',
      companyId,
      merchantId: merchantA,
      status: 'ISSUED',
      lines: [],
    };

    mockPrisma.shippingSettlement.findFirst.mockResolvedValue(settlementMerchantA);
    mockPrisma.merchant.findFirst.mockResolvedValue({ id: merchantA, name: 'تاجر A' });

    // Client B requests Client A's settlement
    await expect(
      settlementService.getById('settle-a-1', {
        companyId,
        merchantId: merchantB, // Different merchant!
        isClient: true,
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringContaining('الكشف غير موجود'),
    });
  });

  test('Acceptance 6: client settlement endpoint contains zero internal cost fields', async () => {
    const settlement = {
      id: 'settle-a-1',
      companyId,
      merchantId: merchantA,
      settlementNumber: 'SET-1001',
      status: 'ISSUED',
      grossCOD: 500,
      shippingFeesTotal: 60,
      codFeesTotal: 10,
      returnFeesTotal: 0,
      netPayout: 430,
      lines: [
        {
          id: 'line-1',
          shipmentId: 'ship-1',
          codAmount: 500,
          collectedAmount: 500,
          shippingFee: 60,
          codFee: 10,
          returnFee: 0,
          net: 430,
          createdAt: new Date(),
          shipment: {
            id: 'ship-1',
            barcode: 'BC-123456',
            trackingNumber: 'TRK-123456',
            recipientName: 'منى خليل',
            destinationGovernorate: 'الجيزة',
            destinationCity: 'الدقي',
            status: 'DELIVERED',
            codAmount: 500,
            collectedAmount: 500,
            cost: 35.00, // INTERNAL CARRIER COST! MUST BE STRIPPED
          },
        },
      ],
    };

    mockPrisma.shippingSettlement.findFirst.mockResolvedValue(settlement);
    mockPrisma.merchant.findFirst.mockResolvedValue({ id: merchantA, name: 'تاجر A' });

    const clientOutput = await settlementService.getById('settle-a-1', {
      companyId,
      merchantId: merchantA,
      isClient: true,
    });

    expect(clientOutput.lines.length).toBe(1);
    const line = clientOutput.lines[0];

    // Client fields must exist
    expect(line.barcode).toBe('BC-123456');
    expect(line.shippingFee).toBe(60);
    expect(line.codFee).toBe(10);
    expect(line.net).toBe(430);

    // MUST NOT CONTAIN INTERNAL COST
    expect(line).not.toHaveProperty('cost');
    expect(line.shipment).toBeUndefined();
    expect(Object.keys(line)).not.toContain('cost');
    expect(Object.keys(line)).not.toContain('carrierType');
    expect(Object.keys(line)).not.toContain('shippingCompanyId');
  });

  test('Acceptance 7: void allowed only for DRAFT; export CSV has UTF-8 BOM and headers', async () => {
    const draftSettlement = {
      id: 'settle-draft',
      companyId,
      status: 'DRAFT',
    };
    const issuedSettlement = {
      id: 'settle-issued',
      companyId,
      status: 'ISSUED',
    };

    mockPrisma.shippingSettlement.findFirst
      .mockResolvedValueOnce(issuedSettlement) // first call: issued
      .mockResolvedValueOnce(draftSettlement)  // second call: draft
      .mockResolvedValueOnce({                // third call: export
        id: 'settle-exp',
        companyId,
        merchantId: merchantA,
        settlementNumber: 'SET-EXP-1',
        status: 'APPROVED',
        periodStart: new Date('2026-11-01'),
        periodEnd: new Date('2026-11-03'),
        totalShipments: 1,
        deliveredCount: 1,
        returnedCount: 0,
        grossCOD: 300,
        shippingFeesTotal: 40,
        codFeesTotal: 5,
        returnFeesTotal: 0,
        netPayout: 255,
        lines: [
          {
            id: 'l-1',
            shipmentId: 's-1',
            codAmount: 300,
            collectedAmount: 300,
            shippingFee: 40,
            codFee: 5,
            returnFee: 0,
            net: 255,
            shipment: {
              barcode: 'BC-999',
              recipientName: 'عمرو',
              destinationGovernorate: 'الإسكندرية',
              status: 'DELIVERED',
            },
          },
        ],
      });
    mockPrisma.shippingSettlement.delete.mockResolvedValue({ id: 'settle-draft' });
    mockPrisma.merchant.findFirst.mockResolvedValue({ id: merchantA, name: 'تاجر التجربة' });

    // Attempting void on ISSUED must fail
    await expect(
      settlementService.void('settle-issued', { companyId })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('لا يمكن إلغاء كشف إلا في حالة المسودة (DRAFT)'),
    });

    // Void on DRAFT succeeds
    const voidRes = await settlementService.void('settle-draft', { companyId });
    expect(voidRes.success).toBe(true);
    expect(mockPrisma.shippingSettlement.delete).toHaveBeenCalledWith({ where: { id: 'settle-draft' } });

    // Export CSV check
    const { filename, csv } = await settlementService.exportCsv('settle-exp', { companyId });
    expect(filename).toBe('settlement-SET-EXP-1.csv');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('رقم الكشف,SET-EXP-1');
    expect(csv).toContain('صافي التوريد المستحق,255.00');
    expect(csv).toContain('"BC-999"');
    expect(csv).toContain('"الإسكندرية"');
  });
});
