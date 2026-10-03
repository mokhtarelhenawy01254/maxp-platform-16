/**
 * 🧪 Order Activity Log Comprehensive Test Suite
 * Tests all 11 requirements and acceptance criteria for Order Activity Log
 */

const orderWorkflowService = require('../../services/orderWorkflowService');

describe('Order Activity Log - Comprehensive Requirement Tests', () => {
    const mockCompanyId = 'company_test_123';

    // Mock Prisma client for unit testing orderWorkflowService
    let originalPrisma;
    let mockPrisma;

    beforeEach(() => {
        originalPrisma = Object.getOwnPropertyDescriptor(orderWorkflowService, 'prisma');

        mockPrisma = {
            orderStatusDefinition: {
                findMany: jest.fn().mockResolvedValue([
                    { id: 'def_1', code: 'CONFIRMED', name: 'مؤكد', color: '#2563EB' },
                    { id: 'def_2', code: 'PROCESSING', name: 'قيد التجهيز', color: '#4F46E5' },
                    { id: 'def_custom', code: 'CUSTOM_COMPANY_CODE', name: 'حالة مخصصة للشركة', color: '#10B981' }
                ])
            },
            orderStatusHistory: {
                count: jest.fn().mockImplementation(({ where }) => {
                    // Reflect where filters in count
                    if (where?.AND) {
                        const andList = JSON.stringify(where.AND);
                        if (andList.includes('CANCELLED')) return Promise.resolve(36492);
                        if (andList.includes('SYSTEM_WHATSAPP')) return Promise.resolve(891);
                        if (andList.includes('bulk')) return Promise.resolve(120);
                    }
                    return Promise.resolve(117281);
                }),
                findMany: jest.fn().mockImplementation((query) => {
                    const whereStr = JSON.stringify(query.where || {});
                    if (whereStr.includes('CANCELLED')) {
                        return Promise.resolve([
                            {
                                id: 'log_c1',
                                orderId: 'ord_c1',
                                status: 'CANCELLED',
                                oldStatus: 'CONFIRMED',
                                changedBy: 'cm_user_1',
                                userName: 'أحمد علي',
                                reason: 'طلب العميل إلغاء الأوردر',
                                createdAt: new Date('2026-10-01T12:00:00Z'),
                                order: { id: 'ord_c1', orderNumber: 'ORD-CANCEL-1', total: 500, customerName: 'محمود', customerPhone: '0101111' }
                            }
                        ]);
                    }
                    if (whereStr.includes('SYSTEM_WHATSAPP')) {
                        return Promise.resolve([
                            {
                                id: 'log_w1',
                                orderId: 'ord_w1',
                                status: 'CONFIRMED',
                                oldStatus: 'PENDING',
                                changedBy: 'SYSTEM_WHATSAPP',
                                userName: 'WhatsApp Bot',
                                reason: 'تم التأكيد عبر محادثة واتساب',
                                createdAt: new Date('2026-10-01T12:05:00Z'),
                                order: { id: 'ord_w1', orderNumber: 'ORD-WA-1', total: 750, customerName: 'سارة', customerPhone: '0102222' }
                            }
                        ]);
                    }
                    if (whereStr.includes('bulk')) {
                        return Promise.resolve([
                            {
                                id: 'log_b1',
                                orderId: 'ord_b1',
                                status: 'READY_TO_SHIP',
                                oldStatus: 'PROCESSING',
                                changedBy: 'cm_user_2',
                                userName: 'كريم',
                                reason: 'bulk update batch 44',
                                createdAt: new Date('2026-10-01T12:10:00Z'),
                                order: { id: 'ord_b1', orderNumber: 'ORD-BULK-1', total: 300, customerName: 'خالد', customerPhone: '0103333' }
                            }
                        ]);
                    }

                    // Default sample rows
                    return Promise.resolve([
                        {
                            id: 'log_def_1',
                            orderId: 'ord_def_1',
                            status: 'CONFIRMED',
                            oldStatus: 'PENDING',
                            changedBy: 'cm_user_1',
                            userName: 'أحمد علي',
                            reason: 'تأكيد عادي',
                            createdAt: new Date('2026-10-01T12:00:00Z'),
                            order: { id: 'ord_def_1', orderNumber: 'ORD-101', total: 200, customerName: 'عميل 1', customerPhone: '0100001' }
                        }
                    ]);
                })
            },
            orderWorkflowAuditLog: {
                count: jest.fn().mockResolvedValue(15),
                findMany: jest.fn().mockResolvedValue([
                    {
                        id: 'audit_ov_1',
                        orderId: 'ord_ov_1',
                        companyId: mockCompanyId,
                        fromStatusId: 'def_1',
                        toStatusId: 'def_2',
                        changedBy: 'cm_user_manager',
                        changeType: 'override',
                        reason: 'تجاوز بصلاحية المدير العام لتعديل الحالة استثنائياً',
                        approvedBy: 'cm_user_manager',
                        createdAt: new Date('2026-10-01T14:00:00Z'),
                        fromStatus: { code: 'CONFIRMED', name: 'مؤكد', color: '#2563EB' },
                        toStatus: { code: 'PROCESSING', name: 'قيد التجهيز', color: '#4F46E5' },
                        order: { id: 'ord_ov_1', orderNumber: 'ORD-OVERRIDE-1', total: 1200, customerName: 'عميل مميز', customerPhone: '0109999' },
                        user: { id: 'cm_user_manager', firstName: 'أشرف', lastName: 'المدير', email: 'ashraf@company.com' },
                        approver: { id: 'cm_user_manager', firstName: 'أشرف', lastName: 'المدير' }
                    }
                ])
            },
            returnActivityLog: {
                count: jest.fn().mockResolvedValue(2814),
                findMany: jest.fn().mockResolvedValue([
                    {
                        id: 'ret_act_1',
                        returnRequestId: 'ret_req_1',
                        userId: 'cm_user_return_agent',
                        action: 'RECEIVED',
                        details: 'تم استلام المنتج المرتجع بحالة جيدة في المخزن',
                        createdAt: new Date('2026-10-01T15:00:00Z'),
                        returnRequest: {
                            id: 'ret_req_1',
                            orderId: 'ord_ret_1',
                            order: { id: 'ord_ret_1', orderNumber: 'ORD-RET-1', total: 600, customerName: 'عميل مرتجع', customerPhone: '0108888' }
                        },
                        user: { id: 'cm_user_return_agent', firstName: 'وائل', lastName: 'مسؤول المرتجعات', email: 'wael@returns.com' }
                    }
                ])
            },
            user: {
                findMany: jest.fn().mockResolvedValue([
                    { id: 'cm_user_1', firstName: 'أحمد', lastName: 'علي', email: 'ahmed@company.com' },
                    { id: 'cm_user_2', firstName: 'كريم', lastName: 'حسن', email: 'karim@company.com' },
                    { id: 'cm_user_manager', firstName: 'أشرف', lastName: 'المدير', email: 'ashraf@company.com' }
                ])
            },
            $queryRawUnsafe: jest.fn().mockImplementation((query) => {
                if (query.includes('COUNT(*)::int as count')) {
                    return Promise.resolve([{ count: 4358 }]);
                }
                return Promise.resolve([{ id: 'log_data_1' }, { id: 'log_data_2' }]);
            })
        };

        Object.defineProperty(orderWorkflowService, 'prisma', {
            get: () => mockPrisma,
            configurable: true
        });
    });

    afterEach(() => {
        if (originalPrisma) {
            Object.defineProperty(orderWorkflowService, 'prisma', originalPrisma);
        }
    });

    // -------------------------------------------------------------------------
    // Requirement 1 & 2: changeType condition in Prisma where + matching total
    // -------------------------------------------------------------------------
    describe('Requirements 1 & 2: DB-level Filter by changeType & Accurate Total Count', () => {
        test('Filter cancelled: passes condition to Prisma WHERE before take/skip, returns exact total 36,492', async () => {
            const res = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0, {
                changeType: 'cancelled'
            });

            expect(res.logs.length).toBeGreaterThan(0);
            expect(res.logs[0].changeType).toBe('cancelled');
            expect(res.total).toBe(36492);
            expect(res.stats.total).toBe(36492);

            // Verify count & findMany where clause has CANCELLED
            const countCall = mockPrisma.orderStatusHistory.count.mock.calls[0][0];
            const findManyCall = mockPrisma.orderStatusHistory.findMany.mock.calls[0][0];

            expect(JSON.stringify(countCall.where)).toContain('CANCELLED');
            expect(JSON.stringify(findManyCall.where)).toContain('CANCELLED');
        });

        test('Filter bot_whatsapp: passes condition to Prisma WHERE, returns exact total 891', async () => {
            const res = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0, {
                changeType: 'bot_whatsapp'
            });

            expect(res.logs.length).toBeGreaterThan(0);
            expect(res.logs[0].changeType).toBe('bot_whatsapp');
            expect(res.total).toBe(891);

            const countCall = mockPrisma.orderStatusHistory.count.mock.calls[0][0];
            expect(JSON.stringify(countCall.where)).toContain('SYSTEM_WHATSAPP');
        });

        test('Filter bulk_update: passes bulk condition to Prisma WHERE', async () => {
            const res = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0, {
                changeType: 'bulk_update'
            });

            expect(res.logs.length).toBeGreaterThan(0);
            expect(res.logs[0].changeType).toBe('bulk_update');
            expect(res.total).toBe(120);
        });
    });

    // -------------------------------------------------------------------------
    // Requirement 3: «تجاوز بصلاحية» from order_workflow_audit_logs
    // -------------------------------------------------------------------------
    describe('Requirement 3: «تجاوز بصلاحية» (override) source mapping', () => {
        test('Filter override: queries orderWorkflowAuditLog and returns real records with approver', async () => {
            const res = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0, {
                changeType: 'override'
            });

            expect(mockPrisma.orderWorkflowAuditLog.findMany).toHaveBeenCalled();
            expect(res.logs.length).toBe(1);
            expect(res.logs[0].changeType).toBe('override');
            expect(res.logs[0].order.orderNumber).toBe('ORD-OVERRIDE-1');
            expect(res.logs[0].approver).toBeDefined();
            expect(res.logs[0].approver.name).toBe('أشرف المدير');
            expect(res.total).toBe(15);
        });
    });

    // -------------------------------------------------------------------------
    // Requirement 4: Exclude import noise (changedBy='user' / userName='User')
    // -------------------------------------------------------------------------
    describe('Requirement 4: Isolate import noise (80,662 rows) and no actor named "User"', () => {
        test('OrderStatusHistory queries strictly exclude changedBy=user & userName=User', async () => {
            await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0);

            const findCall = mockPrisma.orderStatusHistory.findMany.mock.calls[0][0];
            const notCondition = findCall.where.AND.find(c => c.NOT);
            expect(notCondition).toBeDefined();
            const notEntries = JSON.stringify(notCondition.NOT);
            expect(notEntries).toContain('user');
            expect(notEntries).toContain('User');
        });

        test('getAuditActors excludes noise actors and never returns an actor named "User"', async () => {
            mockPrisma.orderStatusHistory.findMany.mockResolvedValueOnce([
                { changedBy: 'user', userName: 'User' },
                { changedBy: 'User', userName: 'User' },
                { changedBy: 'cm_user_1', userName: 'أحمد علي' }
            ]);

            const actors = await orderWorkflowService.getAuditActors(mockCompanyId);
            expect(actors.some(a => a.name === 'User' || a.id === 'user')).toBe(false);
            expect(actors.some(a => a.name === 'أحمد علي')).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // Requirement 5: oldStatus = status is classified as data_update
    // -------------------------------------------------------------------------
    describe('Requirement 5: Data update classification for oldStatus = status', () => {
        test('Rows where oldStatus = status are classified as data_update with clean label', async () => {
            mockPrisma.orderStatusHistory.findMany.mockResolvedValueOnce([
                {
                    id: 'sh_mod_1',
                    orderId: 'ord_mod_1',
                    status: 'CONFIRMED',
                    oldStatus: 'CONFIRMED',
                    changedBy: 'cm_user_1',
                    userName: 'أحمد علي',
                    reason: 'تعديل بيانات العميل والشحن:\n• تعديل رقم الهاتف',
                    createdAt: new Date('2026-10-01T12:00:00Z'),
                    order: { id: 'ord_mod_1', orderNumber: 'ORD-MOD-1', total: 350, customerName: 'سامح' }
                }
            ]);

            const res = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0, { changeType: 'ALL' });
            expect(res.logs[0].changeType).toBe('data_update');
        });

        test('Filtering specifically by changeType=data_update returns SQL count and rows', async () => {
            mockPrisma.orderStatusHistory.findMany.mockResolvedValueOnce([
                {
                    id: 'log_data_1',
                    orderId: 'ord_data_1',
                    status: 'CONFIRMED',
                    oldStatus: 'CONFIRMED',
                    changedBy: 'cm_user_1',
                    reason: 'تعديل منتجات الطلب',
                    createdAt: new Date(),
                    order: { id: 'ord_data_1', orderNumber: 'ORD-DATA-1', total: 100 }
                }
            ]);

            const res = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0, { changeType: 'data_update' });
            expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
            expect(res.total).toBe(4358);
            expect(res.logs[0].changeType).toBe('data_update');
        });
    });

    // -------------------------------------------------------------------------
    // Requirement 6: Empty reasons are replaced with informative text
    // -------------------------------------------------------------------------
    describe('Requirement 6: Never return empty reason line', () => {
        test('When reason is null or whitespace, generates informative explanation from transition', async () => {
            mockPrisma.orderStatusHistory.findMany.mockResolvedValueOnce([
                {
                    id: 'sh_empty_1',
                    orderId: 'ord_1',
                    status: 'DELIVERED',
                    oldStatus: 'SHIPPED',
                    changedBy: 'cm_user_1',
                    userName: 'كابتن الشحن',
                    reason: null, // empty in 3,352 historical rows
                    createdAt: new Date(),
                    order: { id: 'ord_1', orderNumber: 'ORD-NO-REASON' }
                }
            ]);

            const res = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0, { changeType: 'ALL' });
            expect(res.logs[0].reason).toBeTruthy();
            expect(res.logs[0].reason).toContain('تم الشحن');
            expect(res.logs[0].reason).toContain('تم التسليم');
        });
    });

    // -------------------------------------------------------------------------
    // Requirement 7: return_activity_logs (Returns)
    // -------------------------------------------------------------------------
    describe('Requirement 7: Returns activity source (return_activity_logs)', () => {
        test('Filter return: queries returnActivityLog and returns 2,814 total', async () => {
            const res = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0, {
                changeType: 'return'
            });

            expect(mockPrisma.returnActivityLog.findMany).toHaveBeenCalled();
            expect(res.logs.length).toBe(1);
            expect(res.logs[0].changeType).toBe('return');
            expect(res.logs[0].toStatus.name).toBe('استلام المرتجع بالمخزن');
            expect(res.total).toBe(2814);
        });
    });

    // -------------------------------------------------------------------------
    // Requirement 8: Guest Orders (688 rows where orderId is null)
    // -------------------------------------------------------------------------
    describe('Requirement 8: Guest orders inclusion & company isolation', () => {
        test('Company isolation condition queries both regular order and guestOrder', async () => {
            await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0);

            const findCall = mockPrisma.orderStatusHistory.findMany.mock.calls[0][0];
            const orCondition = findCall.where.OR;
            expect(orCondition).toEqual([
                { order: { companyId: mockCompanyId } },
                { guestOrder: { companyId: mockCompanyId } }
            ]);
        });

        test('Guest order rows are normalized with customerName and isGuest=true', async () => {
            mockPrisma.orderStatusHistory.findMany.mockResolvedValueOnce([
                {
                    id: 'sh_guest_1',
                    orderId: null,
                    guestOrderId: 'guest_1',
                    status: 'CONFIRMED',
                    oldStatus: 'PENDING',
                    changedBy: 'cm_user_1',
                    userName: 'موظف مبيعات',
                    reason: 'تأكيد طلب زائر',
                    createdAt: new Date(),
                    order: null,
                    guestOrder: {
                        id: 'guest_1',
                        orderNumber: 'GST-999',
                        total: 450,
                        guestName: 'زائر تجريبي',
                        guestPhone: '0105555'
                    }
                }
            ]);

            const res = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0);
            expect(res.logs[0].order).toBeDefined();
            expect(res.logs[0].order.orderNumber).toBe('GST-999');
            expect(res.logs[0].order.customerName).toBe('زائر تجريبي');
            expect(res.logs[0].order.isGuest).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // Requirement 9: Status names & colors for the 14 extended codes
    // -------------------------------------------------------------------------
    describe('Requirement 9: Arabic status names & neutral fallback colors', () => {
        test.each([
            ['BDONKODTERBO', 'بدون كود تيربو'],
            ['DELAYED-WITH-CAPTAIN', 'مؤجل مع المندوب'],
            ['DELAYED_WITH_CAPTAIN', 'مؤجل مع المندوب'],
            ['ON_HOLD_PREP', 'معلق في التجهيز'],
            ['STOCK_SHORTAGE', 'نقص في المخزون'],
            ['PENDING_PREPARATION', 'بانتظار التجهيز'],
            ['DUPLICATE_ORDER', 'طلب مكرر'],
            ['TRASH', 'سلة المحذوفات'],
            ['REFUNDED', 'مسترد'],
            ['SHORTAGE_FAILED', 'فشل نقص المخزون'],
            ['PARTIALLY_REFUNDED', 'مسترد جزئياً'],
            ['LOST', 'مفقود']
        ])('Status %s displays Arabic name %s with neutral/defined color (not bright blue)', async (code, expectedArabic) => {
            mockPrisma.orderStatusHistory.findMany.mockResolvedValueOnce([
                {
                    id: `log_${code}`,
                    orderId: 'ord_1',
                    status: code,
                    oldStatus: 'NEW',
                    changedBy: 'cm_user_1',
                    userName: 'موظف',
                    createdAt: new Date(),
                    order: { id: 'ord_1', orderNumber: 'ORD-TEST' }
                }
            ]);

            const res = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0);
            expect(res.logs[0].toStatus.name).toBe(expectedArabic);
            expect(res.logs[0].toStatus.color).not.toBe('#3B82F6'); // Not the default blue
        });

        test('Reads custom company status definitions first', async () => {
            mockPrisma.orderStatusHistory.findMany.mockResolvedValueOnce([
                {
                    id: 'log_custom',
                    orderId: 'ord_1',
                    status: 'CUSTOM_COMPANY_CODE',
                    oldStatus: 'NEW',
                    changedBy: 'cm_user_1',
                    createdAt: new Date(),
                    order: { id: 'ord_1', orderNumber: 'ORD-TEST' }
                }
            ]);

            const res = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0);
            expect(res.logs[0].toStatus.name).toBe('حالة مخصصة للشركة');
            expect(res.logs[0].toStatus.color).toBe('#10B981');
        });
    });

    // -------------------------------------------------------------------------
    // Requirement 10: Deterministic tiebreaker and pagination across 3 pages
    // -------------------------------------------------------------------------
    describe('Requirement 10: Deterministic ordering (createdAt + id) and cursor pagination', () => {
        test('Query uses deterministic tiebreaker: orderBy [ { createdAt: desc }, { id: desc } ]', async () => {
            await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0);

            const findCall = mockPrisma.orderStatusHistory.findMany.mock.calls[0][0];
            expect(findCall.orderBy).toEqual([
                { createdAt: 'desc' },
                { id: 'desc' }
            ]);
        });

        test('Paginating across 3 consecutive pages produces zero duplicates and zero missing items', async () => {
            // Create 60 mock records, multiple with exact same millisecond timestamp
            const sameTimestamp = new Date('2026-10-01T12:00:00.023Z');
            const all60Records = Array.from({ length: 60 }, (_, i) => ({
                id: `rec_${String(i).padStart(3, '0')}`,
                orderId: `ord_${i}`,
                status: 'CONFIRMED',
                oldStatus: 'PENDING',
                changedBy: 'cm_user_1',
                userName: 'موظف',
                createdAt: i < 30 ? sameTimestamp : new Date(sameTimestamp.getTime() - i * 1000),
                order: { id: `ord_${i}`, orderNumber: `ORD-${i}` }
            }));

            // Mock database returning 20 per page
            mockPrisma.orderStatusHistory.findMany
                .mockImplementationOnce(({ skip, take }) => Promise.resolve(all60Records.slice(skip, skip + take)))
                .mockImplementationOnce(({ skip, take }) => Promise.resolve(all60Records.slice(skip, skip + take)))
                .mockImplementationOnce(({ skip, take }) => Promise.resolve(all60Records.slice(skip, skip + take)));

            // Page 1 (offset = 0)
            const page1 = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 0);
            // Page 2 (offset = 20)
            const page2 = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 20);
            // Page 3 (offset = 40)
            const page3 = await orderWorkflowService.getGlobalAuditLogs(mockCompanyId, 20, 40);

            expect(page1.logs.length).toBe(20);
            expect(page2.logs.length).toBe(20);
            expect(page3.logs.length).toBe(20);

            const allIds = [
                ...page1.logs.map(l => l.id),
                ...page2.logs.map(l => l.id),
                ...page3.logs.map(l => l.id)
            ];

            // Verify exactly 60 unique IDs — no duplicate, no omission
            const uniqueIds = new Set(allIds);
            expect(uniqueIds.size).toBe(60);
        });
    });
});
