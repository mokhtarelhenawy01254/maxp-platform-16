jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/orderService', () => ({
  updateGuestOrderStatus: jest.fn(),
  updateOrderStatus: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const agentWorkspaceController = require('../../controller/agentWorkspaceController');
const orderService = require('../../services/orderService');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    })
  };

  return response;
};

const createOrder = (id, status, overrides = {}) => ({
  id,
  orderNumber: `ORD-${id}`,
  status,
  customerName: 'Workspace Customer',
  customerPhone: '01000000000',
  governorate: 'القاهرة',
  city: 'مدينة نصر',
  total: 120,
  subtotal: 100,
  shipping: 20,
  createdAt: new Date('2026-05-03T09:00:00.000Z'),
  callAttempts: 0,
  lastCallAttemptAt: null,
  followUpDate: null,
  orderItems: [],
  ...overrides
});

const createAssignment = (order) => ({
  assignedAt: new Date('2026-05-03T10:00:00.000Z'),
  order,
  guestOrder: null
});

describe('agentWorkspaceController.getMyOrders', () => {
  const baseReq = {
    user: {
      id: 'user-1',
      effectiveCompanyId: 'company-1'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAssignments = (assignments) => {
    getSharedPrismaClient.mockReturnValue({
      orderAssignment: {
        findMany: jest.fn().mockResolvedValue(assignments)
      }
    });
  };

  test('keeps cancelled assigned orders visible in the default workspace feed', async () => {
    mockAssignments([
      createAssignment(createOrder('pending', 'PENDING')),
      createAssignment(createOrder('cancelled', 'CANCELLED')),
      createAssignment(createOrder('completed', 'COMPLETED')),
      createAssignment(createOrder('trash', 'TRASH')),
      createAssignment(createOrder('deleted', 'DELETED'))
    ]);

    const res = createResponse();
    await agentWorkspaceController.getMyOrders({ ...baseReq, query: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.pagination.total).toBe(2);
    expect(res.payload.data.map((order) => order.status)).toEqual([
      'PENDING',
      'CANCELLED'
    ]);
  });

  test('filters directly by cancellation status for the cancelled tab', async () => {
    mockAssignments([
      createAssignment(createOrder('pending', 'PENDING')),
      createAssignment(createOrder('cancelled', 'CANCELLED')),
      createAssignment(createOrder('completed', 'COMPLETED'))
    ]);

    const res = createResponse();
    await agentWorkspaceController.getMyOrders(
      { ...baseReq, query: { status: 'cancelled' } },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.pagination.total).toBe(1);
    expect(res.payload.data).toHaveLength(1);
    expect(res.payload.data[0].status).toBe('CANCELLED');
  });
});

describe('agentWorkspaceController.quickAction', () => {
  const baseReq = {
    params: { id: 'order-1' },
    user: {
      id: 'user-1',
      firstName: 'Agent',
      lastName: 'One',
      email: 'agent@example.com',
      effectiveCompanyId: 'company-1'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects workspace cancellation without a reason', async () => {
    const res = createResponse();

    await agentWorkspaceController.quickAction({
      ...baseReq,
      body: {
        action: 'cancel',
        type: 'REGULAR',
        notes: '   '
      }
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      success: false,
      error: 'سبب إلغاء الطلب مطلوب عند اختيار حالة ملغي'
    });
    expect(orderService.updateOrderStatus).not.toHaveBeenCalled();
    expect(orderService.updateGuestOrderStatus).not.toHaveBeenCalled();
  });

  test('cancels a regular workspace order with the provided reason', async () => {
    orderService.updateOrderStatus.mockResolvedValue({ status: 'CANCELLED' });
    const res = createResponse();

    await agentWorkspaceController.quickAction({
      ...baseReq,
      body: {
        action: 'cancel',
        type: 'REGULAR',
        notes: 'العميل طلب الإلغاء'
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
      'order-1',
      'company-1',
      'CANCELLED',
      'العميل طلب الإلغاء',
      'user-1',
      'Agent One'
    );
  });

  test('cancels a guest workspace order with the provided reason', async () => {
    orderService.updateGuestOrderStatus.mockResolvedValue({ status: 'CANCELLED' });
    const res = createResponse();

    await agentWorkspaceController.quickAction({
      ...baseReq,
      body: {
        action: 'cancel',
        type: 'GUEST',
        notes: 'رقم العميل غير صحيح'
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data).toEqual({
      orderType: 'guest',
      status: 'CANCELLED'
    });
    expect(orderService.updateGuestOrderStatus).toHaveBeenCalledWith(
      'order-1',
      'company-1',
      'CANCELLED',
      'رقم العميل غير صحيح',
      'user-1',
      'Agent One'
    );
  });
});
