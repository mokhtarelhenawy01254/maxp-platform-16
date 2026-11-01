/**
 * Regression tests for GET /api/v1/voice/logs/:orderNumber (getOrderCallLogs).
 *
 * Bug (Oct 31, 2026): the controller selected `name: true` on the `User` relation,
 * but the Prisma `User` model has no `name` column — only firstName/lastName.
 * Prisma rejected the query before reaching the DB, so the Order-Call-Logs tab 500'd.
 * Fix: 7a4ae4896 — select firstName/lastName and build `user.name` in the response.
 *
 * These tests fail on the pre-fix code in two different ways:
 *  - the select-contract test asserts `name` is NOT in the user select, and
 *  - the response test asserts `user.name` is composed from firstName + lastName.
 */

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/voice/voiceCallService', () => ({
  dispatchOrderConfirmationCall: jest.fn(),
}));

jest.mock('../../services/orderConfirmationService', () => ({}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getOrderCallLogs } = require('../../controller/voiceCallController');

const createResponse = () => {
  const res = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((payload) => {
      res.payload = payload;
      return res;
    }),
  };
  return res;
};

const createRequest = (orderNumber) => ({
  params: { orderId: orderNumber },
  user: { id: 'user-1', companyId: 'company-1' },
  headers: {},
});

const buildPrismaMock = (rows) => ({
  callAttemptLog: {
    findMany: jest.fn().mockResolvedValue(rows),
  },
});

describe('getOrderCallLogs — voice call logs tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with an empty list for an order that has no calls', async () => {
    const prisma = buildPrismaMock([]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const req = createRequest('ORD-812620-424');
    const res = createResponse();

    await getOrderCallLogs(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.payload).toEqual({ success: true, data: [] });
  });

  it('never selects a non-existent `name` field on User (the production 500)', async () => {
    const prisma = buildPrismaMock([]);
    getSharedPrismaClient.mockReturnValue(prisma);

    await getOrderCallLogs(createRequest('ORD-1'), createResponse());

    expect(prisma.callAttemptLog.findMany).toHaveBeenCalledTimes(1);
    const args = prisma.callAttemptLog.findMany.mock.calls[0][0];
    const userSelect = args?.include?.user?.select || {};

    expect(userSelect).not.toHaveProperty('name');
    expect(userSelect).toEqual(
      expect.objectContaining({ id: true, firstName: true, lastName: true })
    );
  });

  it('returns rows with a readable user.name composed from firstName + lastName', async () => {
    const prisma = buildPrismaMock([
      {
        id: 'log-1',
        result: 'confirmed',
        notes: 'تم التأكيد',
        createdAt: new Date('2026-10-31T10:27:00Z'),
        user: { id: 'u1', email: 'shady@maxp.test', firstName: 'شادي', lastName: 'بهاء' },
        order: { id: 'o1', orderNumber: 'ORD-812620-424', status: 'CONFIRMED' },
        guestOrder: null,
      },
    ]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await getOrderCallLogs(createRequest('ORD-812620-424'), res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toHaveLength(1);
    expect(res.payload.data[0].user.name).toBe('شادي بهاء');
    expect(res.payload.data[0].user).not.toHaveProperty('password');
  });

  it('falls back to email, then a placeholder, when both name parts are empty', async () => {
    const prisma = buildPrismaMock([
      {
        id: 'log-2',
        result: 'unreached',
        user: { id: 'u2', email: 'agent@maxp.test', firstName: '', lastName: '' },
        order: { id: 'o2', orderNumber: 'ORD-2', status: 'PENDING' },
        guestOrder: null,
      },
    ]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await getOrderCallLogs(createRequest('ORD-2'), res);

    expect(res.payload.data[0].user.name).toBe('agent@maxp.test');
  });

  it('keeps user null when the call attempt has no linked user', async () => {
    const prisma = buildPrismaMock([
      {
        id: 'log-3',
        result: 'no_answer',
        user: null,
        order: { id: 'o3', orderNumber: 'ORD-3', status: 'PENDING' },
        guestOrder: null,
      },
    ]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await getOrderCallLogs(createRequest('ORD-3'), res);

    expect(res.payload.data[0].user).toBeNull();
  });

  it('returns 400 when the company or order id is missing', async () => {
    const res = createResponse();
    await getOrderCallLogs({ params: {}, user: {}, headers: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.payload.success).toBe(false);
  });
});
