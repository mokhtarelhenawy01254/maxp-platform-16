const assert = require('assert');

// Mock Prisma
let lastCreateData = null;
const mockPrisma = {
  $queryRaw: async () => [{ id: 'cust-test-1', companyId: 'comp-test-1', metadata: '{}' }],
  $queryRawUnsafe: async () => [],
  $executeRaw: async () => 1,
  $executeRawUnsafe: async () => 1,
  customer: {
    findFirst: async () => ({ id: 'cust-test-1', companyId: 'comp-test-1', metadata: '{}' }),
    update: async () => ({ id: 'cust-test-1' }),
  },
  product: {
    findFirst: async () => null,
    findUnique: async () => ({ id: 'prod-test-1', sku: 'SKU-001', price: 299, isActive: true }),
    create: async () => ({ id: 'prod-test-1' }),
  },
  orderInvoiceSettings: {
    findUnique: async () => null,
  },
  conversation: {
    findUnique: async ({ where }) => {
      if (where.id === 'conv-exists-123') {
        return { id: 'conv-exists-123', channel: 'FACEBOOK', metadata: '{}' };
      }
      return null;
    },
  },
  order: {
    findFirst: async () => null,
    findMany: async () => [],
    create: async ({ data }) => {
      lastCreateData = data;
      return {
        id: 'ord-test-created-999',
        orderNumber: data.orderNumber,
        total: data.total,
        companyId: 'comp-test-1',
        status: data.status,
        metadata: data.metadata,
      };
    },
  },
};

const resilientMockPrisma = new Proxy(mockPrisma, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return new Proxy({}, {
      get(t, method) {
        if (method === 'findMany') return async () => [];
        return async () => null;
      }
    });
  }
});

const sharedDb = require('../apps/backend/services/sharedDatabase');
sharedDb.getSharedPrismaClient = () => resilientMockPrisma;
sharedDb.safeQuery = async (fn) => fn();

const orderService = require('../apps/backend/services/orderService');

async function runTests() {
  console.log('🧪 Starting OrderService createOrderFromConversation validation tests...\n');

  // Test 1: Manual order (no conversationId)
  {
    lastCreateData = null;
    const payload = {
      customerId: 'cust-test-1',
      companyId: 'comp-test-1',
      productName: 'تيشيرت قطن كلاسيك',
      productPrice: 299,
      quantity: 1,
      customerName: 'عميل تجريبي',
      customerPhone: '01000000000',
      city: 'القاهرة',
      address: '٥ ش النصر',
    };

    const order = await orderService.createOrderFromConversation(payload);
    assert(order && order.id, 'Order should be created successfully');
    assert(!('conversationId' in lastCreateData), 'FAIL: conversationId scalar must NOT be in prisma.order.create data');
    assert(lastCreateData.conversation === undefined, 'FAIL: conversation relation must NOT be in data when conversationId is omitted');
    assert(lastCreateData.company.connect.id === 'comp-test-1', 'Company relation must be connected');
    assert(lastCreateData.customer.connect.id === 'cust-test-1', 'Customer relation must be connected');
    console.log('✅ Test 1 PASSED: Manual order (no conversationId) does NOT pass conversationId scalar or relation');
  }

  // Test 2: Order with existing conversation
  {
    lastCreateData = null;
    const payload = {
      conversationId: 'conv-exists-123',
      customerId: 'cust-test-1',
      companyId: 'comp-test-1',
      productName: 'تيشيرت قطن كلاسيك',
      productPrice: 299,
      quantity: 1,
      customerName: 'عميل فيسبوك',
      customerPhone: '01000000000',
      city: 'القاهرة',
    };

    const order = await orderService.createOrderFromConversation(payload);
    assert(order && order.id, 'Order should be created successfully');
    assert(!('conversationId' in lastCreateData), 'FAIL: conversationId scalar must NOT be in prisma.order.create data');
    assert(lastCreateData.conversation && lastCreateData.conversation.connect.id === 'conv-exists-123', 'FAIL: conversation relation must be connected to conv-exists-123');
    console.log('✅ Test 2 PASSED: Order with existing conversation connects conversation relation cleanly');
  }

  // Test 3: Order with non-existent conversation (e.g. invalid conversationId)
  {
    lastCreateData = null;
    const payload = {
      conversationId: 'conv-does-not-exist',
      customerId: 'cust-test-1',
      companyId: 'comp-test-1',
      productName: 'تيشيرت قطن كلاسيك',
      productPrice: 299,
      quantity: 1,
      customerName: 'عميل مجهول',
      customerPhone: '01000000000',
      city: 'القاهرة',
    };

    const order = await orderService.createOrderFromConversation(payload);
    assert(order && order.id, 'Order should be created successfully without crashing');
    assert(!('conversationId' in lastCreateData), 'FAIL: conversationId scalar must NOT be in data');
    assert(lastCreateData.conversation === undefined, 'FAIL: conversation relation must NOT be attempted for non-existent record');
    const meta = JSON.parse(lastCreateData.metadata);
    assert(meta.conversationId === 'conv-does-not-exist', 'conversationId must still be retained in metadata');
    console.log('✅ Test 3 PASSED: Order with non-existent conversation does not crash and preserves conversationId in metadata');
  }

  console.log('\n🎉 ALL 3 TESTS PASSED PERFECTLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
