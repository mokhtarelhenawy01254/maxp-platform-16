/**
 * Manufacturing WhatsApp Notification Service Test Suite (T01)
 *
 * Verifies:
 * 1. Multi-recipient fan-out for SAMPLE_CONVERTED (CUSTOMER + FACTORY) -> SENT rows
 * 2. Idempotent deduplication via unique constraint (companyId, dedupKey) -> DUPLICATE status & 0 extra rows
 * 3. Event disabled toggle -> skipped:'event_disabled' & 0 calls
 * 4. Error handling when WhatsApp session is unavailable -> FAILED status & reason='no_session'
 * 5. Recipient without phone number -> SKIPPED status & reason='no_phone' (no external call)
 * 6. Compliance with central WhatsApp rules -> category='SYSTEM' & persistedEventType='ANNOUNCEMENT'
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

const mockSendNotification = jest.fn();

jest.mock('../services/whatsapp/WhatsAppNotificationService', () => ({
  sendNotification: (...args) => mockSendNotification(...args),
}));

const ManufacturingNotificationService = require('../services/manufacturingNotificationService');

function createInMemoryStore() {
  const store = {
    notificationLogs: new Map(),
    settings: new Map(),
    customers: new Map(),
    factories: new Map(),
    stages: new Map(),
    companies: new Map(),
    counter: 0,
  };

  return {
    $executeRawUnsafe: async () => {},
    manufacturingNotificationLog: {
      create: async ({ data }) => {
        for (const row of store.notificationLogs.values()) {
          if (row.companyId === data.companyId && row.dedupKey === data.dedupKey) {
            const err = new Error('Unique constraint failed on (companyId, dedupKey)');
            err.code = 'P2002';
            throw err;
          }
        }
        const id = `notif-log-${++store.counter}`;
        const record = {
          id,
          ...data,
          status: data.status || 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.notificationLogs.set(id, record);
        return record;
      },
      findFirst: async ({ where } = {}) => {
        let items = Array.from(store.notificationLogs.values());
        if (where?.id) items = items.filter((x) => x.id === where.id);
        if (where?.companyId) items = items.filter((x) => x.companyId === where.companyId);
        return items[0] || null;
      },
      findMany: async ({ where, skip = 0, take = 50 } = {}) => {
        let items = Array.from(store.notificationLogs.values());
        if (where?.companyId) items = items.filter((x) => x.companyId === where.companyId);
        if (where?.eventKey && where.eventKey !== 'ALL') items = items.filter((x) => x.eventKey === where.eventKey);
        if (where?.status && where.status !== 'ALL') items = items.filter((x) => x.status === where.status);
        return items.slice(skip, skip + take);
      },
      count: async ({ where } = {}) => {
        let items = Array.from(store.notificationLogs.values());
        if (where?.companyId) items = items.filter((x) => x.companyId === where.companyId);
        if (where?.dedupKey?.startsWith) {
          items = items.filter((x) => x.dedupKey.startsWith(where.dedupKey.startsWith));
        }
        return items.length;
      },
      update: async ({ where, data }) => {
        const existing = store.notificationLogs.get(where.id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        store.notificationLogs.set(where.id, updated);
        return updated;
      },
    },
    manufacturingSettings: {
      findUnique: async ({ where }) => store.settings.get(where.companyId) || null,
      upsert: async ({ where, create, update }) => {
        const existing = store.settings.get(where.companyId);
        const record = existing ? { ...existing, ...update } : { ...create };
        store.settings.set(where.companyId, record);
        return record;
      },
    },
    customer: {
      findFirst: async ({ where }) => {
        let items = Array.from(store.customers.values());
        if (where?.id) items = items.filter((x) => x.id === where.id);
        if (where?.companyId) items = items.filter((x) => x.companyId === where.companyId);
        return items[0] || null;
      },
    },
    partnerFactory: {
      findFirst: async ({ where }) => {
        let items = Array.from(store.factories.values());
        if (where?.id) items = items.filter((x) => x.id === where.id);
        if (where?.companyId) items = items.filter((x) => x.companyId === where.companyId);
        return items[0] || null;
      },
    },
    productionStage: {
      findFirst: async ({ where }) => {
        let items = Array.from(store.stages.values());
        if (where?.id) items = items.filter((x) => x.id === where.id);
        if (where?.orderId && where?.partnerFactoryId?.not === null) {
          items = items.filter((x) => x.orderId === where.orderId && x.partnerFactoryId);
        }
        return items[0] || null;
      },
    },
    company: {
      findFirst: async ({ where }) => {
        let items = Array.from(store.companies.values());
        if (where?.id) items = items.filter((x) => x.id === where.id);
        return items[0] || null;
      },
    },
    _store: store,
  };
}

describe('Manufacturing WhatsApp Notifications (T01)', () => {
  const companyId = 'qa-lab-company';
  let inMemoryPrisma;

  beforeEach(() => {
    inMemoryPrisma = createInMemoryStore();
    currentPrisma = inMemoryPrisma;
    global.__testPrisma = inMemoryPrisma;
    mockSendNotification.mockReset();
    mockSendNotification.mockImplementation(async (o) => ({
      success: true,
      notificationId: `wl-${Date.now()}`,
      _to: o.recipientPhone,
    }));
  });

  afterEach(() => {
    global.__testPrisma = null;
  });

  test('1. SAMPLE_CONVERTED fan-out to CUSTOMER and FACTORY -> sendNotification called twice, rows SENT', async () => {
    // Seed customer & partner factory
    inMemoryPrisma._store.customers.set('cust-1', {
      id: 'cust-1',
      companyId,
      firstName: 'إيمان',
      lastName: 'أحمد',
      phone: '01000891646',
    });

    inMemoryPrisma._store.factories.set('fac-1', {
      id: 'fac-1',
      companyId,
      name: 'مصنع الأمل الحديث',
      phone: '01000000222',
      isActive: true,
    });

    // Configure settings: only CUSTOMER and FACTORY enabled for this test
    await ManufacturingNotificationService.updateNotificationSettings(companyId, {
      isEnabled: true,
      events: {
        SAMPLE_CONVERTED: {
          enabled: true,
          recipients: { CUSTOMER: true, FACTORY: true, TEAM: false },
        },
      },
    });

    const ctx = {
      companyId,
      sampleOrder: {
        id: 'smp-100',
        sampleNumber: 'SMP-1001',
        productName: 'تيشرت بولو',
        customerId: 'cust-1',
        partnerFactoryId: 'fac-1',
      },
      productionOrder: {
        id: 'po-200',
        orderNumber: 'PO-1001',
        plannedQuantity: 100,
        dueDate: '2026-11-15T00:00:00Z',
      },
    };

    const res = await ManufacturingNotificationService.emit('SAMPLE_CONVERTED', ctx);

    expect(res.success).toBe(true);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);

    const logs = await inMemoryPrisma.manufacturingNotificationLog.findMany({ where: { companyId } });
    expect(logs.length).toBe(2);

    const customerLog = logs.find((l) => l.recipientType === 'CUSTOMER');
    const factoryLog = logs.find((l) => l.recipientType === 'FACTORY');

    expect(customerLog).toBeTruthy();
    expect(customerLog.status).toBe('SENT');
    expect(customerLog.recipientPhone).toBe('01000891646');

    expect(factoryLog).toBeTruthy();
    expect(factoryLog.status).toBe('SENT');
    expect(factoryLog.recipientPhone).toBe('01000000222');
  });

  test('2. Deduplication check: duplicate event emits DUPLICATE and keeps log count unchanged', async () => {
    inMemoryPrisma._store.customers.set('cust-1', {
      id: 'cust-1',
      companyId,
      firstName: 'إيمان',
      phone: '01000891646',
    });

    await ManufacturingNotificationService.updateNotificationSettings(companyId, {
      isEnabled: true,
      events: {
        SAMPLE_APPROVED: {
          enabled: true,
          recipients: { CUSTOMER: true, FACTORY: false, TEAM: false },
        },
      },
    });

    const ctx = {
      companyId,
      sampleOrder: {
        id: 'smp-200',
        sampleNumber: 'SMP-1002',
        productName: 'هودي أوفر سايز',
        customerId: 'cust-1',
      },
    };

    // First emission
    const firstRes = await ManufacturingNotificationService.emit('SAMPLE_APPROVED', ctx);
    expect(firstRes.success).toBe(true);
    expect(firstRes.fanout[0].status).toBe('SENT');

    const countAfterFirst = await inMemoryPrisma.manufacturingNotificationLog.count({ where: { companyId } });
    expect(countAfterFirst).toBe(1);

    // Second emission (identical)
    const secondRes = await ManufacturingNotificationService.emit('SAMPLE_APPROVED', ctx);
    expect(secondRes.success).toBe(true);
    expect(secondRes.fanout[0].status).toBe('DUPLICATE');

    const countAfterSecond = await inMemoryPrisma.manufacturingNotificationLog.count({ where: { companyId } });
    expect(countAfterSecond).toBe(1); // 0 duplicates added to DB
  });

  test('3. Event disabled toggle -> skipped:"event_disabled" and zero calls', async () => {
    await ManufacturingNotificationService.updateNotificationSettings(companyId, {
      isEnabled: true,
      events: {
        SAMPLE_REJECTED: { enabled: false },
      },
    });

    const ctx = {
      companyId,
      sampleOrder: {
        id: 'smp-300',
        sampleNumber: 'SMP-1003',
        customerId: 'cust-1',
      },
    };

    const res = await ManufacturingNotificationService.emit('SAMPLE_REJECTED', ctx);
    expect(res.success).toBe(true);
    expect(res.skipped).toBe('event_disabled');
    expect(mockSendNotification).toHaveBeenCalledTimes(0);
  });

  test('4. WhatsApp session unavailable -> status FAILED with reason "no_session"', async () => {
    inMemoryPrisma._store.customers.set('cust-1', {
      id: 'cust-1',
      companyId,
      firstName: 'إيمان',
      phone: '01000891646',
    });

    await ManufacturingNotificationService.updateNotificationSettings(companyId, {
      isEnabled: true,
      events: {
        SAMPLE_CREATED: {
          enabled: true,
          recipients: { CUSTOMER: true, FACTORY: false, TEAM: false },
        },
      },
    });

    // Mock failure with no_session
    mockSendNotification.mockResolvedValueOnce({
      success: false,
      reason: 'no_session',
      errorCode: 'SESSION_LOGGED_OUT',
    });

    const ctx = {
      companyId,
      sampleOrder: {
        id: 'smp-400',
        sampleNumber: 'SMP-1004',
        productName: 'بنطلون جينز',
        customerId: 'cust-1',
      },
    };

    const res = await ManufacturingNotificationService.emit('SAMPLE_CREATED', ctx);
    expect(res.success).toBe(true);
    expect(res.fanout[0].status).toBe('FAILED');
    expect(res.fanout[0].reason).toBe('no_session');

    const log = await inMemoryPrisma.manufacturingNotificationLog.findFirst({ where: { companyId } });
    expect(log.status).toBe('FAILED');
    expect(log.reason).toBe('no_session');
    expect(log.errorCode).toBe('SESSION_LOGGED_OUT');
  });

  test('5. Recipient without phone number -> status SKIPPED with reason "no_phone", no external call', async () => {
    // Customer with null phone
    inMemoryPrisma._store.customers.set('cust-no-phone', {
      id: 'cust-no-phone',
      companyId,
      firstName: 'عميل بدون رقم',
      phone: null,
      phoneNormalized: null,
    });

    await ManufacturingNotificationService.updateNotificationSettings(companyId, {
      isEnabled: true,
      events: {
        SAMPLE_CREATED: {
          enabled: true,
          recipients: { CUSTOMER: true, FACTORY: false, TEAM: false },
        },
      },
    });

    const ctx = {
      companyId,
      sampleOrder: {
        id: 'smp-500',
        sampleNumber: 'SMP-1005',
        productName: 'شورت قطن',
        customerId: 'cust-no-phone',
      },
    };

    const res = await ManufacturingNotificationService.emit('SAMPLE_CREATED', ctx);
    expect(res.success).toBe(true);
    expect(res.fanout[0].status).toBe('SKIPPED');
    expect(res.fanout[0].reason).toBe('no_phone');
    expect(mockSendNotification).toHaveBeenCalledTimes(0);

    const log = await inMemoryPrisma.manufacturingNotificationLog.findFirst({ where: { companyId } });
    expect(log.status).toBe('SKIPPED');
    expect(log.reason).toBe('no_phone');
  });

  test('6. WhatsApp parameters verification: category is SYSTEM, persistedEventType is ANNOUNCEMENT', async () => {
    inMemoryPrisma._store.customers.set('cust-1', {
      id: 'cust-1',
      companyId,
      firstName: 'إيمان',
      phone: '01000891646',
    });

    await ManufacturingNotificationService.updateNotificationSettings(companyId, {
      isEnabled: true,
      events: {
        PRODUCTION_ORDER_COMPLETED: {
          enabled: true,
          recipients: { CUSTOMER: true, FACTORY: false, TEAM: false },
        },
      },
    });

    const ctx = {
      companyId,
      productionOrder: {
        id: 'po-300',
        orderNumber: 'PO-3001',
        productName: 'قميص كتان',
        plannedQuantity: 50,
        customerId: 'cust-1',
      },
    };

    await ManufacturingNotificationService.emit('PRODUCTION_ORDER_COMPLETED', ctx);

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const callArgs = mockSendNotification.mock.calls[0][0];

    expect(callArgs.category).toBe('SYSTEM');
    expect(callArgs.persistedEventType).toBe('ANNOUNCEMENT');
    expect(callArgs.eventType).toBe('MFG_PRODUCTION_ORDER_COMPLETED');
    expect(callArgs.rawEventType).toBe('MFG_PRODUCTION_ORDER_COMPLETED');
    expect(callArgs.recipientType).toBe('CUSTOMER');
    expect(callArgs.recipientPhone).toBe('01000891646');
    expect(callArgs.variables).toHaveProperty('orderNumber', 'PO-3001');
    expect(callArgs.variables).toHaveProperty('productName', 'قميص كتان');
  });

  test('7. MFG_EVENTS key count is 10 and includes MATERIAL_SHORTAGE', () => {
    const settings = ManufacturingNotificationService.normalizeSettings(null);
    const keys = Object.keys(settings.events);
    expect(keys.length).toBe(10);
    expect(keys).toContain('MATERIAL_SHORTAGE');
    expect(settings.events.MATERIAL_SHORTAGE.recipients.FACTORY).toBe(true);
    expect(settings.events.MATERIAL_SHORTAGE.recipients.TEAM).toBe(true);
    expect(settings.events.MATERIAL_SHORTAGE.recipients.CUSTOMER).toBe(false);
  });

  test('8. MATERIAL_SHORTAGE fan-out to FACTORY and TEAM when enabled -> exactly one row per recipient, eventKey=MATERIAL_SHORTAGE', async () => {
    inMemoryPrisma._store.factories.set('fac-1', {
      id: 'fac-1',
      companyId,
      name: 'مصنع النصر للملابس',
      phone: '01011112222',
      isActive: true,
    });
    inMemoryPrisma._store.companies.set(companyId, {
      id: companyId,
      name: 'شركة التجربة',
      phone: '01033334444',
    });

    await ManufacturingNotificationService.updateNotificationSettings(companyId, {
      isEnabled: true,
      events: {
        MATERIAL_SHORTAGE: {
          enabled: true,
          recipients: { FACTORY: true, TEAM: true, CUSTOMER: false },
        },
      },
    });

    const ctx = {
      companyId,
      productionOrder: {
        id: 'po-shortage-1',
        orderNumber: 'PO-SHORT-001',
        productName: 'قميص صيفي',
        partnerFactoryId: 'fac-1',
      },
      shortages: [
        { name: 'قماش كتان', required: 100, available: 40, unit: 'متر' },
        { name: 'أزرار صدف', required: 500, available: 200, unit: 'قطعة' },
      ],
    };

    const res = await ManufacturingNotificationService.emit('MATERIAL_SHORTAGE', ctx);
    expect(res.success).toBe(true);
    expect(res.fanout.length).toBe(2);
    expect(res.fanout[0].status).toBe('SENT');
    expect(res.fanout[1].status).toBe('SENT');

    const logs = await inMemoryPrisma.manufacturingNotificationLog.findMany({
      where: { companyId, eventKey: 'MATERIAL_SHORTAGE' },
    });
    expect(logs.length).toBe(2);

    const factoryLog = logs.find((l) => l.recipientType === 'FACTORY');
    const teamLog = logs.find((l) => l.recipientType === 'TEAM');

    expect(factoryLog).toBeTruthy();
    expect(factoryLog.status).toBe('SENT');
    expect(factoryLog.eventKey).toBe('MATERIAL_SHORTAGE');
    expect(factoryLog.recipientPhone).toBe('01011112222');
    expect(factoryLog.payload.vars.shortages).toContain('قماش كتان');
    expect(factoryLog.payload.vars.shortageLines).toContain('أزرار صدف');

    expect(teamLog).toBeTruthy();
    expect(teamLog.status).toBe('SENT');
    expect(teamLog.eventKey).toBe('MATERIAL_SHORTAGE');
    expect(teamLog.recipientPhone).toBe('01033334444');
  });

  test('9. MATERIAL_SHORTAGE deduplication: second emit same order+day emits DUPLICATE and keeps row count unchanged', async () => {
    inMemoryPrisma._store.factories.set('fac-1', {
      id: 'fac-1',
      companyId,
      name: 'مصنع النصر',
      phone: '01011112222',
      isActive: true,
    });

    await ManufacturingNotificationService.updateNotificationSettings(companyId, {
      isEnabled: true,
      events: {
        MATERIAL_SHORTAGE: {
          enabled: true,
          recipients: { FACTORY: true, TEAM: false, CUSTOMER: false },
        },
      },
    });

    const ctx = {
      companyId,
      productionOrder: {
        id: 'po-shortage-2',
        orderNumber: 'PO-SHORT-002',
        partnerFactoryId: 'fac-1',
      },
      shortages: [{ name: 'خيط أبيض', required: 50, available: 10, unit: 'بكرة' }],
    };

    // First emission
    const firstRes = await ManufacturingNotificationService.emit('MATERIAL_SHORTAGE', ctx);
    expect(firstRes.success).toBe(true);
    expect(firstRes.fanout[0].status).toBe('SENT');

    const countAfterFirst = await inMemoryPrisma.manufacturingNotificationLog.count({ where: { companyId } });
    expect(countAfterFirst).toBe(1);

    // Second emission same order and day
    const secondRes = await ManufacturingNotificationService.emit('MATERIAL_SHORTAGE', ctx);
    expect(secondRes.success).toBe(true);
    expect(secondRes.fanout[0].status).toBe('DUPLICATE');

    const countAfterSecond = await inMemoryPrisma.manufacturingNotificationLog.count({ where: { companyId } });
    expect(countAfterSecond).toBe(1); // row count unchanged
  });

  test('10. MATERIAL_SHORTAGE disabled in settings -> 0 rows, emit returns skipped:"event_disabled"', async () => {
    await ManufacturingNotificationService.updateNotificationSettings(companyId, {
      isEnabled: true,
      events: {
        MATERIAL_SHORTAGE: { enabled: false },
      },
    });

    const ctx = {
      companyId,
      productionOrder: {
        id: 'po-shortage-3',
        orderNumber: 'PO-SHORT-003',
      },
      shortages: [{ name: 'سوستة معدن', required: 100, available: 0, unit: 'قطعة' }],
    };

    const res = await ManufacturingNotificationService.emit('MATERIAL_SHORTAGE', ctx);
    expect(res.success).toBe(true);
    expect(res.skipped).toBe('event_disabled');
    expect(mockSendNotification).toHaveBeenCalledTimes(0);

    const count = await inMemoryPrisma.manufacturingNotificationLog.count({ where: { companyId } });
    expect(count).toBe(0);
  });

  test('11. MATERIAL_SHORTAGE send failure (e.g. outside 24h window) -> FAILED status and non-null reason recorded, never silent', async () => {
    inMemoryPrisma._store.factories.set('fac-1', {
      id: 'fac-1',
      companyId,
      name: 'مصنع النصر',
      phone: '01011112222',
      isActive: true,
    });

    await ManufacturingNotificationService.updateNotificationSettings(companyId, {
      isEnabled: true,
      events: {
        MATERIAL_SHORTAGE: {
          enabled: true,
          recipients: { FACTORY: true, TEAM: false, CUSTOMER: false },
        },
      },
    });

    mockSendNotification.mockResolvedValueOnce({
      success: false,
      reason: 'outside_24h_window',
      errorCode: 'META_WINDOW_EXPIRED',
    });

    const ctx = {
      companyId,
      productionOrder: {
        id: 'po-shortage-4',
        orderNumber: 'PO-SHORT-004',
        partnerFactoryId: 'fac-1',
      },
      shortages: [{ name: 'قماش صوف', required: 80, available: 20, unit: 'متر' }],
    };

    const res = await ManufacturingNotificationService.emit('MATERIAL_SHORTAGE', ctx);
    expect(res.success).toBe(true);
    expect(res.fanout[0].status).toBe('FAILED');
    expect(res.fanout[0].reason).toBe('outside_24h_window');

    const log = await inMemoryPrisma.manufacturingNotificationLog.findFirst({
      where: { companyId, eventKey: 'MATERIAL_SHORTAGE' },
    });
    expect(log).toBeTruthy();
    expect(log.status).toBe('FAILED');
    expect(log.reason).toBe('outside_24h_window');
    expect(log.reason).not.toBeNull();
    expect(log.errorCode).toBe('META_WINDOW_EXPIRED');
  });
});
