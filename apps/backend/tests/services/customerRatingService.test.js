const {
    calculateCustomerScore,
    recalculateCustomerRating,
    validateRatingSettings,
    batchRecalculateCompanyCustomers,
    getCustomerRatingHealth,
    CURRENT_RULES_VERSION
} = require('../../services/customerRatingService');

describe('customerRatingService - Automated Classification Engine (2026 Standards)', () => {
    const companyId = 'company-test-123';
    const customerId = 'cust-123';

    const baseCustomer = {
        id: customerId,
        companyId,
        phone: '01012345678',
        phoneNormalized: '+201012345678',
        metadata: JSON.stringify({ ratingMetadata: { ratingVersion: 1 } })
    };

    const buildMockPrisma = (customer = baseCustomer, orders = [], settings = null) => {
        let currentCust = { ...customer };
        return {
            customer: {
                findFirst: jest.fn().mockImplementation(async () => ({ ...currentCust })),
                update: jest.fn().mockImplementation(async ({ data }) => {
                    currentCust = { ...currentCust, ...data };
                    return currentCust;
                }),
                count: jest.fn().mockResolvedValue(10),
                groupBy: jest.fn().mockResolvedValue([
                    { customerRating: 'EXCELLENT', _count: { id: 3 } },
                    { customerRating: 'GOOD', _count: { id: 4 } },
                    { customerRating: 'AVERAGE', _count: { id: 1 } },
                    { customerRating: 'POOR', _count: { id: 1 } },
                    { customerRating: 'UNKNOWN', _count: { id: 1 } }
                ]),
                findMany: jest.fn().mockImplementation(async ({ skip, cursor, take }) => {
                    const all = Array.from({ length: 5 }, (_, i) => ({ id: `cust-${i + 1}` }));
                    if (cursor) {
                        const idx = all.findIndex(c => c.id === cursor.id);
                        return all.slice(idx + 1, idx + 1 + take);
                    }
                    return all.slice(0, take);
                })
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

        expect(result.rating).toBe('UNKNOWN');
        expect(result.deliveryRate).toBe(0);
        expect(result.totalDelivered).toBe(0);
        expect(result.totalFailed).toBe(0);
        expect(result.totalAttempts).toBe(0);
        expect(result.rulesVersion).toBe(CURRENT_RULES_VERSION);
    });

    test('2. عميل بطلبين ناجحين فقط -> لا يمكن أن يكون EXCELLENT (أقل من 3 محاولات = UNKNOWN)', async () => {
        const orders = [
            { id: 'ord-1', orderNumber: '1001', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-01') },
            { id: 'ord-2', orderNumber: '1002', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-02') },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        // Crucial bug fix verification: 2 delivered orders MUST NOT qualify as EXCELLENT!
        expect(result.totalAttempts).toBe(2);
        expect(result.deliveryRate).toBe(100);
        expect(result.rating).toBe('UNKNOWN');
    });

    test('3. عميل بـ 3 طلبات (2 مستلم و 1 مرتجع) = 66.7% (>= 50% و >= 3 طلبات) -> AVERAGE (متوسط)', async () => {
        const orders = [
            { id: 'ord-1', orderNumber: '1001', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-01') },
            { id: 'ord-2', orderNumber: '1002', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-02') },
            { id: 'ord-3', orderNumber: '1003', status: 'RETURNED', returnRequests: [], createdAt: new Date('2026-01-03') },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        expect(result.totalAttempts).toBe(3);
        expect(result.deliveryRate).toBe(66.7);
        expect(result.rating).toBe('AVERAGE');
    });

    test('4. عميل بـ 5 طلبات (4 مستلمة و 1 مرتجع) = 80% (>= 75% و >= 5 طلبات) -> GOOD (جيد)', async () => {
        const orders = [
            { id: 'ord-1', orderNumber: '1001', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-01') },
            { id: 'ord-2', orderNumber: '1002', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-02') },
            { id: 'ord-3', orderNumber: '1003', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-03') },
            { id: 'ord-4', orderNumber: '1004', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-04') },
            { id: 'ord-5', orderNumber: '1005', status: 'RETURNED', returnRequests: [], createdAt: new Date('2026-01-05') },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        expect(result.totalAttempts).toBe(5);
        expect(result.deliveryRate).toBe(80);
        expect(result.rating).toBe('GOOD');
    });

    test('5. عميل بـ 10 طلبات (9 مستلمة و 1 مرتجع) = 90% (>= 90% و >= 10 طلبات) -> EXCELLENT (ممتاز)', async () => {
        const orders = [
            ...Array.from({ length: 9 }, (_, i) => ({
                id: `ord-${i + 1}`,
                orderNumber: `DEL-${i + 1}`,
                status: 'DELIVERED',
                returnRequests: [],
                createdAt: new Date(`2026-01-${String(i + 1).padStart(2, '0')}`)
            })),
            { id: 'ord-10', orderNumber: 'RET-1', status: 'RETURNED', returnRequests: [], createdAt: new Date('2026-01-10') }
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        expect(result.totalAttempts).toBe(10);
        expect(result.deliveryRate).toBe(90);
        expect(result.rating).toBe('EXCELLENT');
    });

    test('6. طلب جزئي (PARTIALLY_DELIVERED) يُوزن نسبياً (0.5 مستلم و 0.5 فاشل)', async () => {
        const orders = [
            { id: 'ord-1', orderNumber: '1001', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-01') },
            { id: 'ord-2', orderNumber: '1002', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-02') },
            { id: 'ord-3', orderNumber: '1003', status: 'PARTIALLY_DELIVERED', returnRequests: [], createdAt: new Date('2026-01-03') },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        // 2 full + 0.5 = 2.5 delivered; 0.5 failed; total = 3.0 attempts
        // deliveryRate = 2.5 / 3.0 = 83.3%
        expect(result.totalAttempts).toBe(3);
        expect(result.totalDelivered).toBe(2.5);
        expect(result.totalFailed).toBe(0.5);
        expect(result.deliveryRate).toBe(83.3);
        // Since attempts = 3 (< 5 for GOOD), it qualifies for AVERAGE
        expect(result.rating).toBe('AVERAGE');
    });

    test('7. طلبات LOST و REFUNDED لا تُخصم من العميل افتراضياً', async () => {
        const orders = [
            { id: 'ord-1', orderNumber: '1001', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-01') },
            { id: 'ord-2', orderNumber: '1002', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-02') },
            { id: 'ord-3', orderNumber: '1003', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-03') },
            { id: 'ord-4', orderNumber: '1004', status: 'LOST', returnRequests: [], createdAt: new Date('2026-01-04') }, // ضياع شركة الشحن
            { id: 'ord-5', orderNumber: '1005', status: 'REFUNDED', returnRequests: [], createdAt: new Date('2026-01-05') }, // استرجاع متجر
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        // LOST and REFUNDED are neutral and not added to failedWeight
        expect(result.totalDelivered).toBe(3);
        expect(result.totalFailed).toBe(0);
        expect(result.totalAttempts).toBe(3);
        expect(result.deliveryRate).toBe(100);
        expect(result.rating).toBe('AVERAGE'); // 3 attempts >= 3 and 100% >= 50%
    });

    test('8. مرتجع معتمد بخطأ العميل الصريح (responsibleParty=CUSTOMER) يُحسب كفشل', async () => {
        const orders = [
            { id: 'ord-1', orderNumber: '1001', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-01') },
            { id: 'ord-2', orderNumber: '1002', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-02') },
            {
                id: 'ord-3',
                orderNumber: '1003',
                status: 'RETURNED',
                returnRequests: [{ id: 'ret-1', status: 'APPROVED', responsibleParty: 'CUSTOMER' }],
                createdAt: new Date('2026-01-03')
            },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);

        const result = await calculateCustomerScore(customerId, companyId, prisma);

        expect(result.totalDelivered).toBe(2);
        expect(result.totalFailed).toBe(1);
        expect(result.totalAttempts).toBe(3);
        expect(result.deliveryRate).toBe(66.7);
        expect(result.rating).toBe('AVERAGE');
    });

    test('9. اختبار الحتمية (Determinism): إعادة الحساب مرتين على نفس البيانات تُعطي نفس النتيجة بالحرف', async () => {
        const orders = [
            { id: 'ord-1', orderNumber: '1001', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-01') },
            { id: 'ord-2', orderNumber: '1002', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-02') },
            { id: 'ord-3', orderNumber: '1003', status: 'RETURNED', returnRequests: [], createdAt: new Date('2026-01-03') },
            { id: 'ord-4', orderNumber: '1004', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-04') },
            { id: 'ord-5', orderNumber: '1005', status: 'DELIVERED', returnRequests: [], createdAt: new Date('2026-01-05') },
        ];
        const prisma = buildMockPrisma(baseCustomer, orders);
        const fixedAsOf = '2026-09-30T12:00:00.000Z';

        const run1 = await calculateCustomerScore(customerId, companyId, prisma, { asOf: fixedAsOf });
        const run2 = await calculateCustomerScore(customerId, companyId, prisma, { asOf: fixedAsOf });

        expect(run1.deliveryRate).toBe(run2.deliveryRate);
        expect(run1.rating).toBe(run2.rating);
        expect(run1.totalDelivered).toBe(run2.totalDelivered);
        expect(run1.totalFailed).toBe(run2.totalFailed);
        expect(run1.totalAttempts).toBe(run2.totalAttempts);
        expect(run1.rulesVersion).toBe(run2.rulesVersion);
        expect(run1.asOf).toBe(run2.asOf);
    });

    test('10. تحقق العتبات: إعدادات ملخبطة تُرفض برسالة واضحة', () => {
        // Average >= Good
        const invalidOrder1 = validateRatingSettings({
            excellentThreshold: 90,
            goodThreshold: 60,
            averageThreshold: 70, // invalid (70 > 60)
            minOrdersForRating: 3
        });
        expect(invalidOrder1.valid).toBe(false);
        expect(invalidOrder1.message).toContain('نسبة التقييم المتوسط');

        // Good >= Excellent
        const invalidOrder2 = validateRatingSettings({
            excellentThreshold: 80,
            goodThreshold: 85, // invalid (85 > 80)
            averageThreshold: 50,
            minOrdersForRating: 3
        });
        expect(invalidOrder2.valid).toBe(false);
        expect(invalidOrder2.message).toContain('نسبة التقييم الجيد');

        // Out of bounds
        const invalidBounds = validateRatingSettings({
            excellentThreshold: 110, // > 100
            goodThreshold: 80,
            averageThreshold: 50,
            minOrdersForRating: 3
        });
        expect(invalidBounds.valid).toBe(false);
        expect(invalidBounds.message).toContain('بين 0% و 100%');

        // Valid settings
        const valid = validateRatingSettings({
            excellentThreshold: 90,
            goodThreshold: 75,
            averageThreshold: 50,
            minOrdersForRating: 3
        });
        expect(valid.valid).toBe(true);
    });

    test('11. تقرير صحة التقييم للشركة (Health Report Telemetry)', async () => {
        const prisma = buildMockPrisma(baseCustomer, []);
        const health = await getCustomerRatingHealth(companyId, prisma);

        expect(health.companyId).toBe(companyId);
        expect(health.totalCustomers).toBe(10);
        expect(health.ratedCustomers).toBe(9);
        expect(health.unratedCustomers).toBe(1);
        expect(health.breakdown.EXCELLENT).toBe(3);
        expect(health.breakdown.GOOD).toBe(4);
        expect(health.status).toBe('HEALTHY');
    });

    test('12. التحديث بالترقيم Cursor-Based Batch Recalculation', async () => {
        const prisma = buildMockPrisma(baseCustomer, []);
        const result = await batchRecalculateCompanyCustomers(companyId, 2, prisma);

        expect(result.processed).toBe(5);
        expect(result.successCount).toBe(5);
        expect(result.errorCount).toBe(0);
        expect(result.companyId).toBe(companyId);
    });
});
