const {
  isUnsubscribeText,
  isUnsubscribed,
  recordUnsubscribe,
  removeUnsubscribe,
} = require('../../services/botUnsubscribeService');
const { compareValue, evaluateSegment, parseRules } = require('../../services/botSegmentService');

jest.mock('../../services/sharedDatabase', () => {
  const prisma = {
    botUnsubscribe: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
    },
    botCustomerFieldValue: {
      findMany: jest.fn(),
    },
  };
  return { getSharedPrismaClient: jest.fn(() => prisma) };
});

const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('botUnsubscribeService isUnsubscribeText', () => {
  test('detects English STOP and Arabic variants', () => {
    expect(isUnsubscribeText('STOP')).toBe(true);
    expect(isUnsubscribeText('stop')).toBe(true);
    expect(isUnsubscribeText('╪Ñ┘è┘é╪º┘ü ╪º┘ä╪▒╪│╪º╪ª┘ä')).toBe(true);
    expect(isUnsubscribeText('╪º┘ä╪║╪º╪í ╪º┘ä╪º╪┤╪¬╪▒╪º┘â')).toBe(true);
    expect(isUnsubscribeText('┘à╪┤ ╪╣╪º┘è╪▓ ╪▒╪│╪º┘è┘ä')).toBe(true);
  });

  test('ignores normal text', () => {
    expect(isUnsubscribeText('┘â╪º┘à ╪º┘ä╪│╪╣╪▒')).toBe(false);
    expect(isUnsubscribeText('┘à╪▒╪¡╪¿╪º')).toBe(false);
    expect(isUnsubscribeText('')).toBe(false);
  });
});

describe('botUnsubscribeService record/isUnsubscribed', () => {
  const prisma = getSharedPrismaClient();

  beforeEach(() => jest.clearAllMocks());

  test('records and detects unsubscribe', async () => {
    prisma.botUnsubscribe.upsert.mockResolvedValue({ id: 'u1' });
    prisma.botUnsubscribe.findUnique.mockResolvedValue({ id: 'u1' });
    await recordUnsubscribe('co-1', 'cu-1', 'WHATSAPP', 'STOP');
    expect(prisma.botUnsubscribe.upsert).toHaveBeenCalled();
    expect(await isUnsubscribed('co-1', 'cu-1', 'WHATSAPP')).toBe(true);
  });

  test('removes unsubscribe', async () => {
    prisma.botUnsubscribe.delete.mockResolvedValue({});
    expect(await removeUnsubscribe('co-1', 'cu-1', 'WHATSAPP')).toBe(true);
  });
});

describe('botSegmentService compareValue', () => {
  test('eq and contains work', () => {
    expect(compareValue('╪ú╪¡┘à╪»', '╪ú╪¡┘à╪»', 'eq')).toBe(true);
    expect(compareValue('┘à╪¡┘à╪» ╪ú╪¡┘à╪»', '╪ú╪¡┘à╪»', 'contains')).toBe(true);
    expect(compareValue('┘à╪¡┘à╪»', '╪╣┘ä┘è', 'eq')).toBe(false);
  });

  test('numeric gte/lte work', () => {
    expect(compareValue(5, 3, 'gte')).toBe(true);
    expect(compareValue(2, 3, 'gte')).toBe(false);
    expect(compareValue(2, 3, 'lte')).toBe(true);
  });

  test('null/empty values never match', () => {
    expect(compareValue(null, 'x', 'eq')).toBe(false);
    expect(compareValue('', 'x', 'contains')).toBe(false);
  });
});

describe('botSegmentService evaluateSegment', () => {
  const prisma = getSharedPrismaClient();

  beforeEach(() => jest.clearAllMocks());

  test('matches customers by rule', async () => {
    prisma.customer.findMany.mockResolvedValue([
      { id: 'c1', firstName: '╪ú╪¡┘à╪»', lastName: '╪╣┘ä┘è', phone: '0101', totalOrdersCount: 5, successScore: 0, totalDelivered: 0, status: 'CUSTOMER', createdAt: new Date() },
      { id: 'c2', firstName: '┘à╪¡┘à╪»', lastName: '╪¡╪│┘å', phone: '0102', totalOrdersCount: 1, successScore: 0, totalDelivered: 0, status: 'CUSTOMER', createdAt: new Date() },
    ]);
    prisma.botCustomerFieldValue.findMany.mockResolvedValue([]);

    const segment = { rules: JSON.stringify([{ field: 'totalOrdersCount', op: 'gte', value: '3' }]) };
    const result = await evaluateSegment('co-1', segment);
    expect(result.map((r) => r.customerId)).toEqual(['c1']);
  });

  test('uses custom field values in matching', async () => {
    prisma.customer.findMany.mockResolvedValue([
      { id: 'c1', firstName: '╪ú╪¡┘à╪»', lastName: '╪╣┘ä┘è', phone: '0101', totalOrdersCount: 0, successScore: 0, totalDelivered: 0, status: 'CUSTOMER', createdAt: new Date() },
    ]);
    prisma.botCustomerFieldValue.findMany.mockResolvedValue([
      { customerId: 'c1', fieldKey: 'city', value: '╪º┘ä┘à┘å╪╡┘ê╪▒╪⌐' },
    ]);

    const segment = { rules: JSON.stringify([{ field: 'city', op: 'contains', value: '┘à┘å╪╡┘ê╪▒╪⌐' }]) };
    const result = await evaluateSegment('co-1', segment);
    expect(result).toHaveLength(1);
  });

  test('empty rules returns all customers', async () => {
    prisma.customer.findMany.mockResolvedValue([
      { id: 'c1', firstName: '╪ú╪¡┘à╪»', lastName: '╪╣┘ä┘è', phone: '0101', createdAt: new Date(), totalOrdersCount: 0 },
    ]);
    const result = await evaluateSegment('co-1', { rules: null });
    expect(result).toHaveLength(1);
  });
});
