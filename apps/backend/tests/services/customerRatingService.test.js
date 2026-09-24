const { calculateCustomerScore, recalculateCustomerRating } = require('../../services/customerRatingService');

describe('customerRatingService - Automated Classification Engine', () => {
    const companyId = 'company-test-123';
    const customerId = 'cust-123';

    const baseCustomer = {
        id: customerId,
        companyId,
        phone: '01012345678',
        phoneNormalized: '+201012345678',
    };

    const buildMockPrisma = (customer = baseCustomer, orders = [], settings = null) => {
        return {
            customer: {
                findFirst: jest.fn().mockResolvedValue(customer),
                update: jest.fn().mockResolvedValue({ ...customer, ...orders }),
            },
            order: {
                findMany: jest.fn().mockResolvedValue(orders),
            },
            returnSettings: {
                findUnique: jest.fn().mockResolvedValue(settings),
            },
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('1. عميل جديد بدون أي طلبات منتهية -> UNKNOWN ونسبة 0%', async () => {
        const prisma = buildMockPrisma(baseCustomer, []);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        expect(result).toEqual({
            customerId,
            deliveryRate: 0,
            totalDelivered: 0,
            totalFailed: 0,
            totalAttempts: 0,
            rating: 'UNKNOWN',
        });

        expect(prisma.customer.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: customerId },
            data: {
                deliveryRate: 0,
                totalDelivered: 0,
                totalOrdersCount: 0,
                customerRating: 'UNKNOWN',
                successScore: 0,
            },
        }));
    });

    test('2. عميل بطلب واحد مستلم -> GOOD بنسبة استلام 100%', async () => {
        const orders = [
            {
                id: 'ord-1',
                orderNumber: '1001',
                status: 'DELIVERED',
                returnRequests: [],
                statusHistory: [{ status: 'DELIVERED' }],
            },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        expect(result.rating).toBe('GOOD');
        expect(result.deliveryRate).toBe(100);
        expect(result.totalDelivered).toBe(1);
        expect(result.totalAttempts).toBe(1);
        expect(result.totalFailed).toBe(0);
    });

    test('3. عميل بطلبين مستلمين -> EXCELLENT (استلام 100% لطلبين)', async () => {
        const orders = [
            { id: 'ord-1', orderNumber: '1001', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-2', orderNumber: '1002', status: 'DELIVERED', returnRequests: [] },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        expect(result.rating).toBe('EXCELLENT');
        expect(result.deliveryRate).toBe(100);
        expect(result.totalDelivered).toBe(2);
        expect(result.totalAttempts).toBe(2);
    });

    test('4. عميل بـ 5 طلبات (4 مستلمة و 1 مرتجع) -> GOOD (نسبة 80%)', async () => {
        const orders = [
            { id: 'ord-1', orderNumber: '1001', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-2', orderNumber: '1002', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-3', orderNumber: '1003', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-4', orderNumber: '1004', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-5', orderNumber: '1005', status: 'RETURNED', returnRequests: [] },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        expect(result.rating).toBe('GOOD');
        expect(result.deliveryRate).toBe(80);
        expect(result.totalDelivered).toBe(4);
        expect(result.totalAttempts).toBe(5);
        expect(result.totalFailed).toBe(1);
    });

    test('5. عميل بـ 6 طلبات (5 مستلمة و 1 مرتجع) -> EXCELLENT (نسبة 83.3% لا تكفي، لكن 90% تكفي)', async () => {
        // 5 من 6 = 83.3% (< 85%) -> GOOD
        const orders = [
            { id: 'ord-1', orderNumber: '1001', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-2', orderNumber: '1002', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-3', orderNumber: '1003', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-4', orderNumber: '1004', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-5', orderNumber: '1005', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-6', orderNumber: '1006', status: 'RETURNED', returnRequests: [] },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);
        expect(result.deliveryRate).toBe(83.3);
        expect(result.rating).toBe('GOOD');
    });

    test('6. عميل بـ 7 طلبات (6 مستلمة و 1 مرتجع) -> EXCELLENT (نسبة 85.7% >= 85%)', async () => {
        // 6 من 7 = 85.7% (>= 85% و >= 3 طلبات) -> EXCELLENT
        const orders = [
            { id: 'ord-1', orderNumber: '1001', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-2', orderNumber: '1002', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-3', orderNumber: '1003', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-4', orderNumber: '1004', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-5', orderNumber: '1005', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-6', orderNumber: '1006', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-7', orderNumber: '1007', status: 'RETURNED', returnRequests: [] },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);
        expect(result.deliveryRate).toBe(85.7);
        expect(result.rating).toBe('EXCELLENT');
    });

    test('7. عميل بنسبة استلام متدنية (1 مستلم و 3 مرتجع) -> POOR (نسبة 25%)', async () => {
        const orders = [
            { id: 'ord-1', orderNumber: '1001', status: 'DELIVERED', returnRequests: [] },
            { id: 'ord-2', orderNumber: '1002', status: 'RETURNED', returnRequests: [] },
            { id: 'ord-3', orderNumber: '1003', status: 'RETURNED', returnRequests: [] },
            { id: 'ord-4', orderNumber: '1004', status: 'RETURNED', returnRequests: [] },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        expect(result.rating).toBe('POOR');
        expect(result.deliveryRate).toBe(25);
        expect(result.totalDelivered).toBe(1);
        expect(result.totalFailed).toBe(3);
    });

    test('8. عميل ألغى بعد الشحن (رفض عند الباب) -> يُحسب كفشل استلام', async () => {
        const orders = [
            {
                id: 'ord-1',
                orderNumber: '1001',
                status: 'CANCELLED',
                returnRequests: [],
                statusHistory: [{ status: 'OUT_FOR_DELIVERY' }, { status: 'CANCELLED' }],
            },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        expect(result.rating).toBe('POOR');
        expect(result.deliveryRate).toBe(0);
        expect(result.totalFailed).toBe(1);
    });

    test('9. عميل ألغى قبل الشحن بدون خروج الشحنة -> لا يُظلم ولا يُحسب كفشل استلام', async () => {
        const orders = [
            {
                id: 'ord-1',
                orderNumber: '1001',
                status: 'CANCELLED',
                returnRequests: [],
                statusHistory: [{ status: 'PENDING' }, { status: 'CANCELLED' }],
            },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        expect(result.rating).toBe('UNKNOWN');
        expect(result.deliveryRate).toBe(0);
        expect(result.totalAttempts).toBe(0);
    });

    test('10. احترام إعدادات الشركة المخصصة من returnSettings (إعدادات الطلبات -> تقييم العملاء)', async () => {
        // الشركة رفعت حد الامتياز إلى 95% والحد الأدنى للطلبات إلى 5
        const customSettings = {
            excellentThreshold: 95,
            goodThreshold: 85,
            averageThreshold: 70,
            minOrdersForRating: 5,
        };

        // عميل بـ 5 طلبات (4 مستلم و 1 مرتجع) = 80% استلام
        // في الإعدادات العادية (good: 70%) كان ليصنف GOOD
        // لكن مع إعدادات الشركة الحالية (good: 85%, avg: 70%) سيصنف AVERAGE
        const orders = [
            ...Array(4).fill(null).map((_, i) => ({
                id: `ord-del-${i}`,
                orderNumber: `DEL-${i}`,
                status: 'DELIVERED',
                returnRequests: [],
            })),
            {
                id: 'ord-ret-1',
                orderNumber: 'RET-1',
                status: 'RETURNED',
                returnRequests: [],
            }
        ];

        const prisma = buildMockPrisma(baseCustomer, orders, customSettings);
        const result = await calculateCustomerScore(customerId, companyId, prisma);

        expect(result.totalAttempts).toBe(5);
        expect(result.deliveryRate).toBe(80);
        expect(result.rating).toBe('AVERAGE');
    });
});
