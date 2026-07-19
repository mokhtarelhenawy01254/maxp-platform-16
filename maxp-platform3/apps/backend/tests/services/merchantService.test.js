const mockPrisma = {
  $transaction: jest.fn((callback) => callback(mockPrisma)),
  merchantProduct: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  affiliateSetting: {
    findUnique: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  merchant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  warehouse: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  merchantOrder: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  shippingCompany: {
    findFirst: jest.fn(),
  },
  shipment: {
    upsert: jest.fn(),
    updateMany: jest.fn(),
  },
  inventory: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn(),
  },
  stockMovement: {
    create: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const merchantService = require("../../services/merchantService");

describe("merchantService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("decorates company-warehouse merchant products with physical stock visibility", async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      {
        productId: "product-1",
        warehouseId: "warehouse-shared",
        quantity: 110,
        available: 104,
        reserved: 6,
        warehouse: {
          id: "warehouse-shared",
          name: "Shared Company Warehouse",
          merchantId: null,
          type: "company",
        },
      },
    ]);

    const products = await merchantService.decorateMerchantProductsWithInventorySnapshot(
      {
        id: "merchant-7",
        companyId: "company-1",
        fulfillmentMode: "COMPANY_WAREHOUSE",
        defaultWarehouseId: "warehouse-shared",
      },
      [
        {
          id: "merchant-product-7",
          productId: "product-1",
          stock: 115,
        },
      ],
    );

    expect(mockPrisma.inventory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: { in: ["product-1"] },
          warehouse: expect.objectContaining({
            id: "warehouse-shared",
            companyId: "company-1",
          }),
        }),
      }),
    );
    expect(products[0].inventorySnapshot).toMatchObject({
      stockLocation: "COMPANY_WAREHOUSE",
      stockLocationLabel: "في مخزن الشركة",
      canEditStock: false,
      availableForSale: 104,
      physicalQuantity: 110,
      physicalAvailable: 104,
      reservedQuantity: 6,
      merchantProductStock: 115,
      warehouseNames: ["Shared Company Warehouse"],
    });
  });

  test("summarizes merchant-owned stock from sellable merchant product balances", async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      {
        productId: "product-1",
        warehouseId: "warehouse-merchant",
        quantity: 85,
        available: 85,
        reserved: 0,
        warehouse: {
          id: "warehouse-merchant",
          name: "Merchant Warehouse",
          merchantId: "merchant-1",
          type: "merchant",
        },
      },
    ]);

    const merchant = {
      id: "merchant-1",
      companyId: "company-1",
      fulfillmentMode: "MERCHANT",
      merchantProducts: [
        {
          id: "merchant-product-1",
          productId: "product-1",
          stock: 74,
        },
      ],
    };

    const decorated = await merchantService.decorateMerchantRecordWithInventorySnapshot(
      merchant,
    );

    expect(decorated.inventorySummary).toMatchObject({
      stockLocation: "MERCHANT",
      stockLocationLabel: "عند التاجر",
      availableForSale: 74,
      merchantProductStock: 74,
      physicalQuantity: 85,
      physicalAvailable: 85,
      reservedQuantity: 0,
      warehouseNames: ["Merchant Warehouse"],
    });
  });

  test("adds platform margin when linking a merchant product", async () => {
    mockPrisma.merchantProduct.upsert.mockResolvedValue({
      id: "merchant-product-1",
      productId: "product-1",
      merchant: {
        companyId: "company-1",
      },
    });
    mockPrisma.merchant.findUnique.mockResolvedValue({
      id: "merchant-1",
      companyId: "company-1",
      fulfillmentMode: "MERCHANT",
      defaultWarehouseId: null,
      address: "Cairo",
      name: "Merchant Co",
    });
    mockPrisma.warehouse.findFirst.mockResolvedValue({
      id: "warehouse-merchant-1",
      companyId: "company-1",
      merchantId: "merchant-1",
      isActive: true,
    });
    mockPrisma.inventory.findFirst.mockResolvedValue(null);
    mockPrisma.inventory.create.mockResolvedValue({
      id: "inventory-1",
      available: 5,
      quantity: 5,
      reserved: 0,
    });
    mockPrisma.inventory.aggregate.mockResolvedValue({
      _sum: { available: 5 },
    });
    mockPrisma.merchantProduct.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.product.findUnique.mockResolvedValue({ companyId: "company-1" });
    mockPrisma.merchantProduct.findMany.mockResolvedValue([
      {
        merchantPrice: 100,
        stock: 5,
        merchant: {
          isActive: true,
          fulfillmentMode: "MERCHANT",
        },
      },
    ]);
    mockPrisma.affiliateSetting.findUnique.mockResolvedValue({
      companyId: "company-1",
      platformMarginType: "PERCENTAGE",
      platformMarginValue: 25,
    });
    mockPrisma.product.update.mockResolvedValue({});

    await merchantService.addMerchantProduct("merchant-1", "product-1", {
      merchantPrice: 100,
      stock: 5,
    });

    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: {
        isDropshipped: true,
        price: 125,
        basePrice: 125,
      },
    });
  });

  test("keeps company warehouse fulfillment on a shared company warehouse when linking stock", async () => {
    mockPrisma.merchant.findUnique.mockResolvedValue({
      id: "merchant-company-warehouse",
      companyId: "company-1",
      fulfillmentMode: "COMPANY_WAREHOUSE",
      defaultWarehouseId: "shared-warehouse-1",
      address: "Cairo",
      name: "Company Warehouse Merchant",
    });
    mockPrisma.warehouse.findFirst.mockResolvedValue({
      id: "shared-warehouse-1",
      companyId: "company-1",
      merchantId: null,
      isActive: true,
    });
    mockPrisma.merchantProduct.upsert.mockResolvedValue({
      id: "merchant-product-company-warehouse",
      productId: "product-1",
      merchantId: "merchant-company-warehouse",
      merchantPrice: 90,
      stock: 12,
      merchant: {
        companyId: "company-1",
      },
    });
    mockPrisma.inventory.findFirst.mockResolvedValue({
      id: "inventory-shared-1",
      reserved: 2,
    });
    mockPrisma.inventory.update.mockResolvedValue({
      id: "inventory-shared-1",
      warehouseId: "shared-warehouse-1",
      quantity: 12,
      available: 10,
      reserved: 2,
    });
    mockPrisma.merchantProduct.update.mockResolvedValue({
      id: "merchant-product-company-warehouse",
      stock: 10,
    });
    mockPrisma.product.findUnique.mockResolvedValue({ companyId: "company-1" });
    mockPrisma.merchantProduct.findMany.mockResolvedValue([
      {
        merchantPrice: 90,
        stock: 10,
        merchant: {
          isActive: true,
          fulfillmentMode: "COMPANY_WAREHOUSE",
        },
      },
    ]);
    mockPrisma.affiliateSetting.findUnique.mockResolvedValue({
      companyId: "company-1",
      platformMarginType: "FIXED",
      platformMarginValue: 15,
    });
    mockPrisma.product.update.mockResolvedValue({});

    await merchantService.addMerchantProduct("merchant-company-warehouse", "product-1", {
      merchantPrice: 90,
      stock: 12,
    });

    expect(mockPrisma.warehouse.update).not.toHaveBeenCalled();
    expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
      where: { id: "inventory-shared-1" },
      data: expect.objectContaining({
        quantity: 12,
        available: 10,
      }),
    });
    expect(mockPrisma.merchantProduct.update).toHaveBeenCalledWith({
      where: { id: "merchant-product-company-warehouse" },
      data: expect.objectContaining({
        stock: 10,
      }),
    });
  });

  test("syncs merchant inventory by stamping lastSyncedAt on enabled products", async () => {
    mockPrisma.merchant.findUnique.mockResolvedValue({
      id: "merchant-1",
      merchantProducts: [{ id: "mp-1" }, { id: "mp-2" }],
    });

    const result = await merchantService.syncMerchantInventory("merchant-1");

    expect(result.synced).toBe(2);
    expect(mockPrisma.merchantProduct.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.merchantProduct.update).toHaveBeenNthCalledWith(1, {
      where: { id: "mp-1" },
      data: {
        lastSyncedAt: expect.any(Date),
      },
    });
  });

  test("creates a merchant order and marks the source order as dropshipped", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      companyId: "company-1",
      merchantOrderId: null,
      shippingAddress: '{"city":"Cairo"}',
      orderItems: [
        {
          productId: "product-1",
          quantity: 2,
          product: {
            merchantProducts: [
              {
                id: "merchant-product-1",
                merchantId: "merchant-1",
                merchantSku: "SKU-1",
                merchantPrice: 75,
              },
            ],
          },
        },
      ],
    });
    mockPrisma.merchant.findUnique.mockResolvedValue({
      id: "merchant-1",
      companyId: "company-1",
      isActive: true,
      fulfillmentMode: "MERCHANT",
      defaultWarehouseId: null,
      defaultShippingCompanyId: null,
    });
    mockPrisma.merchantOrder.findUnique.mockResolvedValue(null);
    mockPrisma.merchantProduct.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.merchantOrder.upsert.mockResolvedValue({
      id: "merchant-order-1",
      status: "PENDING",
      trackingNumber: null,
      merchantOrderId: null,
      shippingCompanyId: null,
    });
    mockPrisma.shippingCompany.findFirst.mockResolvedValue(null);
    mockPrisma.shipment.upsert.mockResolvedValue({ id: "shipment-1" });
    mockPrisma.order.update.mockResolvedValue({});

    const result = await merchantService.createMerchantOrder(
      "order-1",
      "merchant-1",
    );

    expect(result.id).toBe("merchant-order-1");
    expect(mockPrisma.merchantOrder.upsert).toHaveBeenCalledWith({
      where: {
        merchantId_orderId: {
          merchantId: "merchant-1",
          orderId: "order-1",
        },
      },
      update: {
        items: JSON.stringify([
          {
            productId: "product-1",
            merchantProductId: "merchant-product-1",
            merchantSku: "SKU-1",
            quantity: 2,
            price: 75,
            fulfillmentSource: "MERCHANT",
            warehouseId: null,
          },
        ]),
        totalAmount: 150,
        shippingAddress: '{"city":"Cairo"}',
        fulfillmentSource: "MERCHANT",
        warehouseId: null,
        shippingCompanyId: null,
      },
      create: {
        merchantId: "merchant-1",
        orderId: "order-1",
        items: JSON.stringify([
          {
            productId: "product-1",
            merchantProductId: "merchant-product-1",
            merchantSku: "SKU-1",
            quantity: 2,
            price: 75,
            fulfillmentSource: "MERCHANT",
            warehouseId: null,
          },
        ]),
        totalAmount: 150,
        shippingAddress: '{"city":"Cairo"}',
        status: "PENDING",
        fulfillmentSource: "MERCHANT",
        warehouseId: null,
        shippingCompanyId: null,
      },
    });
    expect(mockPrisma.merchantProduct.updateMany).toHaveBeenCalledWith({
      where: {
        id: "merchant-product-1",
        stock: {
          gte: 2,
        },
      },
      data: {
        stock: {
          decrement: 2,
        },
      },
    });
    expect(mockPrisma.shipment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          merchantOrderId: "merchant-order-1",
        },
      }),
    );
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: {
        merchantOrderId: "merchant-order-1",
        isDropshipped: true,
      },
    });
  });

  test("fulfills a merchant order without forcing a single tracking number on multi-merchant orders", async () => {
    mockPrisma.merchantOrder.findUnique.mockResolvedValue({
      id: "merchant-order-2",
      orderId: "order-2",
      status: "PENDING",
      fulfillmentSource: "MERCHANT",
      items: "[]",
      order: {
        id: "order-2",
      },
    });
    mockPrisma.merchantOrder.update.mockResolvedValue({
      id: "merchant-order-2",
      orderId: "order-2",
      status: "FULFILLED",
      trackingNumber: "AUTO-TRACK-22",
      merchantOrderId: "AUTO-ORDER-22",
      order: {
        id: "order-2",
      },
    });
    mockPrisma.merchantOrder.count.mockResolvedValue(2);
    mockPrisma.shipment.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.order.update.mockResolvedValue({});

    await merchantService.fulfillMerchantOrder("merchant-order-2", {
      trackingNumber: "AUTO-TRACK-22",
      merchantOrderId: "AUTO-ORDER-22",
      notes: "fulfilled automatically",
    });

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-2" },
      data: {
        turboShipmentStatus: "FULFILLED",
      },
    });
  });

  test("builds merchant shipping and payable operations summary", async () => {
    const createdAt = new Date("2026-05-03T10:00:00.000Z");
    mockPrisma.merchantOrder.findMany.mockResolvedValue([
      {
        id: "merchant-order-prep",
        orderId: "order-prep",
        status: "PENDING",
        items: JSON.stringify([{ quantity: 2 }]),
        totalAmount: 100,
        fulfillmentSource: "MERCHANT",
        createdAt,
        trackingNumber: null,
        shipments: [{
          status: "PENDING",
          cost: 10,
          trackingNumber: null,
          shippingCompany: { name: "Local Carrier" },
          warehouse: { name: "Merchant Warehouse" },
        }],
        order: {
          orderNumber: "ORD-PREP",
          status: "CONFIRMED",
          customerName: "Prep Customer",
          customerPhone: "01000000001",
          customer: null,
          commissions: [{ amount: 100, status: "CONFIRMED" }],
        },
      },
      {
        id: "merchant-order-ship",
        orderId: "order-ship",
        status: "FULFILLED",
        items: JSON.stringify([{ quantity: 3 }]),
        totalAmount: 150,
        fulfillmentSource: "MERCHANT",
        createdAt,
        trackingNumber: "TRK-1",
        shipments: [{
          status: "FULFILLED",
          cost: 15,
          trackingNumber: "TRK-1",
          shippingCompany: { name: "Local Carrier" },
          warehouse: { name: "Merchant Warehouse" },
        }],
        order: {
          orderNumber: "ORD-SHIP",
          status: "PROCESSING",
          customerName: "Shipping Customer",
          customerPhone: "01000000002",
          customer: null,
          commissions: [{ amount: 150, status: "PENDING" }],
        },
      },
      {
        id: "merchant-order-delivered",
        orderId: "order-delivered",
        status: "FULFILLED",
        items: JSON.stringify([{ quantity: 1 }]),
        totalAmount: 50,
        fulfillmentSource: "MERCHANT",
        createdAt,
        trackingNumber: "TRK-2",
        shipments: [{
          status: "DELIVERED",
          cost: 20,
          trackingNumber: "TRK-2",
          shippingCompany: { name: "Local Carrier" },
          warehouse: { name: "Merchant Warehouse" },
        }],
        order: {
          orderNumber: "ORD-DELIVERED",
          status: "DELIVERED",
          customerName: "Delivered Customer",
          customerPhone: "01000000003",
          customer: null,
          commissions: [{ amount: 50, status: "PAID" }],
        },
      },
      {
        id: "merchant-order-failed",
        orderId: "order-failed",
        status: "FAILED",
        items: JSON.stringify([{ quantity: 1 }]),
        totalAmount: 25,
        fulfillmentSource: "MERCHANT",
        createdAt,
        trackingNumber: null,
        shipments: [{
          status: "FAILED",
          cost: 5,
          trackingNumber: null,
          shippingCompany: { name: "Local Carrier" },
          warehouse: { name: "Merchant Warehouse" },
        }],
        order: {
          orderNumber: "ORD-FAILED",
          status: "DELIVERY_FAILED",
          customerName: "Failed Customer",
          customerPhone: "01000000004",
          customer: null,
          commissions: [],
        },
      },
    ]);

    const result = await merchantService.getMerchantOperationsSummary("merchant-1");

    expect(result.summary).toMatchObject({
      assignedOrdersCount: 4,
      assignedPieces: 7,
      preparationOrdersCount: 1,
      preparationPieces: 2,
      inShippingOrdersCount: 1,
      inShippingPieces: 3,
      deliveredOrdersCount: 1,
      deliveredPieces: 1,
      notDeliveredOrdersCount: 1,
      notDeliveredPieces: 1,
      payablePieces: 1,
      pendingPayablePieces: 3,
      expectedReceivableAmount: 300,
      deliveredPayableAmount: 50,
      inShippingAmount: 150,
      notDeliveredAmount: 25,
      shippingCostAmount: 50,
      confirmedCommissionAmount: 100,
      pendingCommissionAmount: 150,
      paidAmount: 50,
    });
    expect(result.rows.map((row) => row.operationStatus)).toEqual([
      "PREPARATION",
      "IN_SHIPPING",
      "DELIVERED",
      "NOT_DELIVERED",
    ]);
  });
});
