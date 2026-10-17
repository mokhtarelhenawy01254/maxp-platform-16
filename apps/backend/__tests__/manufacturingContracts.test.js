/**
 * Unit & Integration Tests for Contract Manufacturing Layer (Wave 1)
 *
 * Scenarios:
 * 1. CustomerOrder creation with auto-generated CO-YYYY-XXXXX sequence
 * 2. Status lifecycle (DRAFT -> CONFIRMED -> IN_PRODUCTION -> READY -> DELIVERED)
 * 3. Child ProductionOrder creation (WO split: 400 pcs FULL_PACKAGE, 600 pcs CMT)
 * 4. Contract value & totals calculation: Σ(plannedQty × salePricePerUnit)
 * 5. Default 70/20/10 payment schedule generation (ON_CONFIRMATION, ON_START, ON_DELIVERY)
 * 6. Payment recording (PAID, paidAt, paidAmount) and remaining balance update
 * 7. RBAC permissions: operator can mark paid, only admin/owner can alter schedule
 * 8. Strict multi-tenant isolation (zero cross-company leakage)
 */

let currentPrisma = null;

// Mock sharedDatabase before requiring services
const sharedDbPath = require.resolve('../services/sharedDatabase');
require.cache[sharedDbPath] = {
  id: sharedDbPath,
  filename: sharedDbPath,
  loaded: true,
  exports: {
    getSharedPrismaClient: () => global.__testPrisma || currentPrisma,
  },
};

if (typeof jest !== 'undefined') {
  jest.mock('../services/sharedDatabase', () => ({
    getSharedPrismaClient: () => global.__testPrisma || currentPrisma,
  }));
}

const ManufacturingContractService = require('../services/manufacturingContractService');

// In-Memory Database Store for Contract Manufacturing Tests
const createInMemoryStore = () => {
  let idCounter = 1;
  const generateId = (prefix = 'id') => `${prefix}_${idCounter++}`;

  const state = {
    customerOrders: [],
    customerOrderPayments: [],
    productionOrders: [],
    customers: [],
    products: [],
  };

  const createTableHandlers = (tableName, stateArray, idPrefix) => ({
    findMany: async ({ where = {}, orderBy, include, select } = {}) => {
      let results = stateArray.filter((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (v === undefined) continue;
          if (v && typeof v === 'object' && v.in) {
            if (!v.in.includes(item[k])) return false;
          } else if (v && typeof v === 'object' && v.not) {
            if (item[k] === v.not) return false;
          } else if (v && typeof v === 'object' && v.startsWith) {
            const val = String(item[k] || '');
            if (!val.startsWith(String(v.startsWith))) return false;
          } else if (v && typeof v === 'object' && v.contains) {
            const val = String(item[k] || '').toLowerCase();
            if (!val.includes(String(v.contains).toLowerCase())) return false;
          } else if (item[k] !== v) {
            return false;
          }
        }
        return true;
      });

      if (orderBy) {
        const [field, dir] = Object.entries(orderBy)[0] || [];
        if (field) {
          results.sort((a, b) => {
            const cmp = a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0;
            return dir === 'desc' ? -cmp : cmp;
          });
        }
      }

      return results.map((item) => {
        const copy = { ...item };
        if (include) {
          if (include.orders) {
            copy.orders = state.productionOrders.filter((o) => o.customerOrderId === item.id);
          }
          if (include.payments) {
            copy.payments = state.customerOrderPayments.filter((p) => p.customerOrderId === item.id);
          }
          if (include.customer) {
            copy.customer = state.customers.find((c) => c.id === item.customerId) || null;
          }
          if (include.customerOrder) {
            copy.customerOrder = state.customerOrders.find((co) => co.id === item.customerOrderId) || null;
          }
        }
        if (select) {
          const selected = {};
          for (const field of Object.keys(select)) {
            if (select[field]) selected[field] = copy[field];
          }
          return selected;
        }
        return copy;
      });
    },

    findFirst: async ({ where = {}, orderBy, include, select } = {}) => {
      const items = await createTableHandlers(tableName, stateArray, idPrefix).findMany({ where, orderBy, include, select });
      return items[0] || null;
    },

    findUnique: async ({ where = {}, include, select } = {}) => {
      return createTableHandlers(tableName, stateArray, idPrefix).findFirst({ where, include, select });
    },

    create: async ({ data, include }) => {
      const item = { id: generateId(idPrefix), createdAt: new Date(), updatedAt: new Date(), ...data };
      stateArray.push(item);
      const copy = { ...item };
      if (include) {
        if (include.orders) {
          copy.orders = state.productionOrders.filter((o) => o.customerOrderId === item.id);
        }
        if (include.payments) {
          copy.payments = state.customerOrderPayments.filter((p) => p.customerOrderId === item.id);
        }
        if (include.customer) {
          copy.customer = state.customers.find((c) => c.id === item.customerId) || null;
        }
      }
      return copy;
    },

    update: async ({ where = {}, data }) => {
      const index = stateArray.findIndex((it) => it.id === where.id);
      if (index === -1) throw new Error(`Record not found in ${tableName}`);
      stateArray[index] = { ...stateArray[index], ...data, updatedAt: new Date() };
      return { ...stateArray[index] };
    },

    delete: async ({ where = {} }) => {
      const index = stateArray.findIndex((it) => it.id === where.id);
      if (index === -1) throw new Error(`Record not found in ${tableName}`);
      const deleted = stateArray.splice(index, 1)[0];
      return deleted;
    },

    deleteMany: async ({ where = {} } = {}) => {
      let count = 0;
      for (let i = stateArray.length - 1; i >= 0; i--) {
        const item = stateArray[i];
        let matches = true;
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) {
            matches = false;
            break;
          }
        }
        if (matches) {
          stateArray.splice(i, 1);
          count++;
        }
      }
      return { count };
    },

    count: async ({ where = {} } = {}) => {
      const items = await createTableHandlers(tableName, stateArray, idPrefix).findMany({ where });
      return items.length;
    },
  });

  const prisma = {
    $executeRawUnsafe: jest.fn().mockResolvedValue(0),
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    $transaction: async (fn) => (typeof fn === 'function' ? fn(prisma) : fn),
    customerOrder: createTableHandlers('customerOrder', state.customerOrders, 'co'),
    customerOrderPayment: createTableHandlers('customerOrderPayment', state.customerOrderPayments, 'cop'),
    productionOrder: createTableHandlers('productionOrder', state.productionOrders, 'po'),
    customer: createTableHandlers('customer', state.customers, 'cust'),
    product: createTableHandlers('product', state.products, 'prod'),
  };

  return { prisma, state };
};

describe('Contract Manufacturing (Wave 1) Test Suite', () => {
  let mock;
  const companyA = 'comp_alpha';
  const companyB = 'comp_beta';
  const userAdmin = { id: 'usr_admin', role: 'COMPANY_ADMIN', companyId: companyA };
  const userOperator = { id: 'usr_op', role: 'EMPLOYEE', companyId: companyA };

  beforeEach(() => {
    mock = createInMemoryStore();
    currentPrisma = mock.prisma;
    global.__testPrisma = mock.prisma;
  });

  afterEach(() => {
    currentPrisma = null;
    global.__testPrisma = null;
    jest.clearAllMocks();
  });

  test('1. CustomerOrder creation generates sequential CO-YYYY-XXXXX number', async () => {
    const customer = await mock.prisma.customer.create({
      data: { companyId: companyA, name: 'Brand X Retail', phone: '0100000001' },
    });

    const order1 = await ManufacturingContractService.createCustomerOrder(
      companyA,
      {
        customerId: customer.id,
        brandName: 'Brand X',
        customerCountry: 'Egypt',
        notes: 'Winter 2026 Collection',
      },
      userAdmin.id
    );

    const orderYear = new Date().getFullYear();
    expect(order1.orderNumber).toBe(`CO-${orderYear}-00001`);
    expect(order1.status).toBe('DRAFT');
    expect(order1.brandName).toBe('Brand X');

    const order2 = await ManufacturingContractService.createCustomerOrder(
      companyA,
      {
        customerId: customer.id,
        brandName: 'Brand X Premium',
      },
      userAdmin.id
    );

    expect(order2.orderNumber).toBe(`CO-${orderYear}-00002`);
  });

  test('2. Child Production Orders (WO Split) compute contract values correctly', async () => {
    const customer = await mock.prisma.customer.create({
      data: { companyId: companyA, name: 'Brand X Fashion' },
    });

    const customerOrder = await ManufacturingContractService.createCustomerOrder(
      companyA,
      {
        customerId: customer.id,
        brandName: 'Brand X',
        customerCountry: 'Egypt',
        expectedDelivery: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
      userAdmin.id
    );

    // Confirm customer order
    await ManufacturingContractService.updateCustomerOrder(companyA, customerOrder.id, { status: 'CONFIRMED' });

    // Link child order 1: 400 pcs @ 150 EGP, FULL_PACKAGE
    await mock.prisma.productionOrder.create({
      data: {
        companyId: companyA,
        orderNumber: 'MO-2026-00010',
        orderType: 'FULL_PACKAGE',
        customerOrderId: customerOrder.id,
        customerId: customer.id,
        plannedQuantity: 400,
        salePricePerUnit: 150,
        status: 'PLANNED',
      },
    });

    // Link child order 2: 600 pcs @ 200 EGP, CMT
    await mock.prisma.productionOrder.create({
      data: {
        companyId: companyA,
        orderNumber: 'MO-2026-00011',
        orderType: 'CMT',
        customerOrderId: customerOrder.id,
        customerId: customer.id,
        plannedQuantity: 600,
        salePricePerUnit: 200,
        status: 'PLANNED',
      },
    });

    const detail = await ManufacturingContractService.getCustomerOrderById(companyA, customerOrder.id);
    expect(detail.ordersCount).toBe(2);
    expect(detail.plannedQuantity).toBe(1000);
    // 400 * 150 = 60,000; 600 * 200 = 120,000 => Total = 180,000
    expect(detail.totalAmount).toBe(180000);
    expect(detail.paidAmount).toBe(0);
    expect(detail.remainingAmount).toBe(180000);
  });

  test('3. Generates 70/20/10 Payment Schedule and handles PAID transitions', async () => {
    const customerOrder = await ManufacturingContractService.createCustomerOrder(
      companyA,
      { brandName: 'Brand X' },
      userAdmin.id
    );

    // Add child production orders totaling 100,000 EGP
    await mock.prisma.productionOrder.create({
      data: {
        companyId: companyA,
        orderNumber: 'MO-2026-00012',
        customerOrderId: customerOrder.id,
        plannedQuantity: 500,
        salePricePerUnit: 200, // 500 * 200 = 100,000
        status: 'PLANNED',
      },
    });

    // Generate default payments (70% - 20% - 10%)
    const payments = await ManufacturingContractService.generateDefaultPayments(companyA, customerOrder.id, userAdmin);
    expect(payments).toHaveLength(3);

    // 70% of 100,000 = 70,000 (ON_CONFIRMATION)
    expect(payments[0].kind).toBe('DEPOSIT');
    expect(payments[0].percent).toBe(70);
    expect(payments[0].amount).toBe(70000);
    expect(payments[0].dueTrigger).toBe('ON_CONFIRMATION');
    expect(payments[0].status).toBe('PENDING');

    // 20% of 100,000 = 20,000 (ON_START)
    expect(payments[1].kind).toBe('INSTALLMENT');
    expect(payments[1].percent).toBe(20);
    expect(payments[1].amount).toBe(20000);
    expect(payments[1].dueTrigger).toBe('ON_START');

    // 10% of 100,000 = 10,000 (ON_DELIVERY)
    expect(payments[2].kind).toBe('FINAL');
    expect(payments[2].percent).toBe(10);
    expect(payments[2].amount).toBe(10000);
    expect(payments[2].dueTrigger).toBe('ON_DELIVERY');

    // Operator marks first payment as PAID
    const { payment: paidPayment, customerOrder: updatedOrder } = await ManufacturingContractService.updateCustomerOrderPayment(
      companyA,
      customerOrder.id,
      payments[0].id,
      {
        status: 'PAID',
        paidAmount: 70000,
        method: 'BANK_TRANSFER',
      },
      userOperator
    );

    expect(paidPayment.status).toBe('PAID');
    expect(paidPayment.paidAmount).toBe(70000);
    expect(paidPayment.paidAt).toBeDefined();

    // Verify customer order totals update
    expect(updatedOrder.paidAmount).toBe(70000);
    expect(updatedOrder.remainingAmount).toBe(30000);
  });

  test('4. RBAC policy enforcement: operator cannot modify payment amount or percent', async () => {
    const customerOrder = await ManufacturingContractService.createCustomerOrder(
      companyA,
      { brandName: 'Brand X' },
      userAdmin.id
    );

    const payment = await mock.prisma.customerOrderPayment.create({
      data: {
        companyId: companyA,
        customerOrderId: customerOrder.id,
        amount: 50000,
        percent: 50,
        status: 'PENDING',
      },
    });

    // Operator attempting to change amount should throw 403 Forbidden
    await expect(
      ManufacturingContractService.updateCustomerOrderPayment(
        companyA,
        customerOrder.id,
        payment.id,
        { amount: 40000 },
        userOperator
      )
    ).rejects.toThrow(/المالك فقط/);

    // Admin can modify amount successfully
    const { payment: updated } = await ManufacturingContractService.updateCustomerOrderPayment(
      companyA,
      customerOrder.id,
      payment.id,
      { amount: 45000 },
      userAdmin
    );
    expect(updated.amount).toBe(45000);
  });

  test('5. Multi-tenant isolation: Company B cannot view or modify Company A contracts', async () => {
    const customerOrderA = await ManufacturingContractService.createCustomerOrder(
      companyA,
      { brandName: 'Alpha Secret Brand' },
      userAdmin.id
    );

    // Company B lists orders -> must NOT see Company A's order
    const listB = await ManufacturingContractService.listCustomerOrders(companyB);
    expect(listB.items).toHaveLength(0);

    // Company B tries to fetch by ID -> throws not found
    await expect(
      ManufacturingContractService.getCustomerOrderById(companyB, customerOrderA.id)
    ).rejects.toThrow(/غير موجود/);

    // Company B tries to update Company A's order -> throws not found
    await expect(
      ManufacturingContractService.updateCustomerOrder(companyB, customerOrderA.id, { brandName: 'Hacked' })
    ).rejects.toThrow(/غير موجود/);
  });
});
