const mockPrisma = {
  order: {
    findFirst: jest.fn(),
  },
  guestOrder: {
    findFirst: jest.fn(),
  },
  academyCourse: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  academyEnrollment: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  orderStatusHistory: {
    create: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const academyService = require('../../services/academyService');
const notificationService = require('../../services/notificationService');

describe('🎓 Academy Course Auto-Enrollment & Notification Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('✅ Should auto-enroll student and create notification for regular order linked to storeProductId', async () => {
    const mockOrder = {
      id: 'ord-123',
      orderNumber: 'ORD-123-001',
      companyId: 'company-swan',
      customerName: 'طالب تجريبي',
      customerPhone: '01000000099',
      customerEmail: 'student@example.com',
      orderItems: [
        {
          id: 'item-1',
          productId: 'prod-crs-001',
        },
      ],
    };

    const mockCourse = {
      id: 'course-maxp-01',
      companyId: 'company-swan',
      title: 'كورس MaxP — من أول إعلان لأول نظام',
      price: 500,
      subscriptionDays: null,
      storeProductId: 'prod-crs-001',
    };

    const mockEnrollment = {
      id: 'enr-999',
      courseId: mockCourse.id,
      companyId: 'company-swan',
      status: 'ACTIVE',
      studentName: 'طالب تجريبي',
      studentPhone: '01000000099',
    };

    mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
    mockPrisma.academyCourse.findMany.mockResolvedValue([mockCourse]);
    mockPrisma.academyCourse.findFirst.mockResolvedValue(mockCourse);
    mockPrisma.academyEnrollment.findFirst
      .mockResolvedValueOnce(null) // check alreadyForOrder
      .mockResolvedValueOnce(null); // check duplicate student
    mockPrisma.academyEnrollment.create.mockResolvedValue(mockEnrollment);
    mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
    mockPrisma.orderStatusHistory.create.mockResolvedValue({ id: 'hist-1' });

    const result = await academyService.processOrderAutoEnrollment({
      orderId: 'ord-123',
      companyId: 'company-swan',
      changedBy: 'TEST_SUITE',
    });

    expect(result.success).toBe(true);
    expect(result.enrolled).toBe(1);
    expect(mockPrisma.academyEnrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          courseId: mockCourse.id,
          orderId: mockOrder.id,
          studentName: 'طالب تجريبي',
          status: 'ACTIVE',
        }),
      })
    );
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'ACADEMY_ENROLLMENT',
          title: expect.stringContaining(mockCourse.title),
        }),
      })
    );
    expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: mockOrder.id,
          reason: expect.stringContaining(mockCourse.title),
        }),
      })
    );
  });

  test('✅ Should handle guestOrder with stringified items JSON correctly', async () => {
    const mockGuestOrder = {
      id: 'guest-ord-456',
      orderNumber: 'ORD-GUEST-456',
      companyId: 'company-swan',
      guestName: 'طالب زائر',
      guestPhone: '01111111199',
      guestEmail: 'guest@example.com',
      items: JSON.stringify([
        {
          productId: 'prod-crs-001',
          name: 'كورس MaxP — من أول إعلان لأول نظام',
          quantity: 1,
        },
      ]),
    };

    const mockCourse = {
      id: 'course-maxp-01',
      companyId: 'company-swan',
      title: 'كورس MaxP — من أول إعلان لأول نظام',
      price: 500,
      subscriptionDays: null,
      storeProductId: 'prod-crs-001',
    };

    mockPrisma.order.findFirst.mockResolvedValue(null);
    mockPrisma.guestOrder.findFirst.mockResolvedValue(mockGuestOrder);
    mockPrisma.academyCourse.findMany.mockResolvedValue([mockCourse]);
    mockPrisma.academyCourse.findFirst.mockResolvedValue(mockCourse);
    mockPrisma.academyEnrollment.findFirst.mockResolvedValue(null);
    mockPrisma.academyEnrollment.create.mockResolvedValue({
      id: 'enr-guest-1',
      courseId: mockCourse.id,
      status: 'ACTIVE',
    });
    mockPrisma.notification.create.mockResolvedValue({ id: 'notif-2' });
    mockPrisma.orderStatusHistory.create.mockResolvedValue({ id: 'hist-2' });

    const result = await academyService.processOrderAutoEnrollment({
      orderNumber: 'ORD-GUEST-456',
      companyId: 'company-swan',
    });

    expect(result.success).toBe(true);
    expect(result.enrolled).toBe(1);
    expect(mockPrisma.academyEnrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          courseId: mockCourse.id,
          orderId: mockGuestOrder.id,
          studentName: 'طالب زائر',
          studentPhone: '01111111199',
        }),
      })
    );
    expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          guestOrderId: mockGuestOrder.id,
          orderId: null,
        }),
      })
    );
  });

  test('🛡️ IDEMPOTENCY: Should skip enrollment if order is already enrolled in course', async () => {
    const mockOrder = {
      id: 'ord-dup-1',
      orderNumber: 'ORD-DUP-01',
      companyId: 'company-swan',
      orderItems: [{ productId: 'prod-crs-001' }],
    };

    const mockCourse = {
      id: 'course-maxp-01',
      companyId: 'company-swan',
      title: 'كورس MaxP',
      storeProductId: 'prod-crs-001',
    };

    const existingEnrollment = {
      id: 'enr-existing',
      courseId: mockCourse.id,
      orderId: mockOrder.id,
      status: 'ACTIVE',
    };

    mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
    mockPrisma.academyCourse.findMany.mockResolvedValue([mockCourse]);
    mockPrisma.academyEnrollment.findFirst.mockResolvedValueOnce(existingEnrollment);

    const result = await academyService.processOrderAutoEnrollment({
      orderId: 'ord-dup-1',
      companyId: 'company-swan',
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.academyEnrollment.create).not.toHaveBeenCalled();
  });
});
