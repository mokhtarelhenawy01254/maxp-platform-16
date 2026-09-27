const { bulkSearchOrders, getPhoneVariations, transformGuestOrder, transformRegularOrder } = require('../../controller/bulkSearchController');

describe('bulkSearchController - Unit & Integration Tests', () => {
    describe('getPhoneVariations', () => {
        it('should generate expected Egyptian phone variations for 010... number', () => {
            const variations = getPhoneVariations('01012345678');
            expect(variations).toContain('01012345678');
            expect(variations).toContain('1012345678');
            expect(variations).toContain('+201012345678');
            expect(variations).toContain('201012345678');
        });

        it('should handle Arabic/Indic numerals cleanly', () => {
            const variations = getPhoneVariations('٠١٠١٢٣٤٥٦٧٨');
            expect(variations).toContain('01012345678');
            expect(variations).toContain('1012345678');
        });

        it('should return empty array for empty inputs', () => {
            expect(getPhoneVariations('')).toEqual([]);
            expect(getPhoneVariations(null)).toEqual([]);
        });
    });

    describe('transformGuestOrder', () => {
        it('should correctly format guest order and flag it as storefront', () => {
            const rawGuest = {
                id: 'guest-123',
                orderNumber: 'ORD-208431-574',
                guestName: 'سارة أحمد',
                guestPhone: '01012345678',
                guestEmail: 'sara@example.com',
                items: JSON.stringify([{ productId: 'p-1', name: 'فستان صيفي', price: 250, quantity: 2 }]),
                total: 500,
                shippingCost: 50,
                discountAmount: 20,
                finalTotal: 530,
                status: 'pending',
                companyId: 'company-swan',
                createdAt: new Date('2026-09-20T10:00:00Z'),
                updatedAt: new Date('2026-09-20T10:00:00Z')
            };

            const transformed = transformGuestOrder(rawGuest);
            expect(transformed.orderNumber).toBe('ORD-208431-574');
            expect(transformed.isStorefront).toBe(true);
            expect(transformed.isGuestOrder).toBe(true);
            expect(transformed.sourceType).toBe('storefront');
            expect(transformed.orderSource).toBe('STOREFRONT');
            expect(transformed.customerName).toBe('سارة أحمد');
            expect(transformed.customer.firstName).toBe('سارة');
            expect(transformed.customer.lastName).toBe('أحمد');
            expect(transformed.total).toBe(530);
            expect(transformed.orderItems).toHaveLength(1);
            expect(transformed.orderItems[0].product.name).toBe('فستان صيفي');
            expect(transformed.orderItems[0].total).toBe(500);
        });
    });

    describe('transformRegularOrder', () => {
        it('should detect storefront source from metadata or guest twin flag', () => {
            const rawOrder = {
                id: 'order-1',
                orderNumber: 'ORD-REG-1',
                companyId: 'company-swan',
                total: '350.00',
                subtotal: '300.00',
                shipping: '50.00',
                status: 'PROCESSING',
                customerName: 'محمد علي',
                customerPhone: '01122334455',
                metadata: JSON.stringify({ source: 'storefront' }),
                createdAt: new Date()
            };

            const transformed = transformRegularOrder(rawOrder, false);
            expect(transformed.isStorefront).toBe(true);
            expect(transformed.total).toBe(350);

            const nonStorefrontOrder = {
                ...rawOrder,
                metadata: null,
                sourceType: 'manual'
            };
            const normalTransformed = transformRegularOrder(nonStorefrontOrder, false);
            expect(normalTransformed.isStorefront).toBe(false);

            const twinTransformed = transformRegularOrder(nonStorefrontOrder, true);
            expect(twinTransformed.isStorefront).toBe(true);
        });
    });

    describe('bulkSearchOrders handler execution', () => {
        let mockPrisma;
        let originalSharedDb;

        beforeEach(() => {
            mockPrisma = {
                order: {
                    findMany: jest.fn()
                },
                guestOrder: {
                    findMany: jest.fn()
                }
            };
            const sharedDb = require('../../services/sharedDatabase');
            originalSharedDb = sharedDb.getSharedPrismaClient;
            sharedDb.getSharedPrismaClient = () => mockPrisma;
        });

        afterEach(() => {
            const sharedDb = require('../../services/sharedDatabase');
            sharedDb.getSharedPrismaClient = originalSharedDb;
        });

        it('should reject request without companyId with 403', async () => {
            const req = { body: { searchType: 'orderNumber', values: ['ORD-1'] }, user: {} };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            await bulkSearchOrders(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        });

        it('should search both tables, deduplicate twin orders, and include standalone guest orders', async () => {
            const req = {
                body: {
                    searchType: 'orderNumber',
                    values: ['ORD-REG-100', 'ORD-208431-574', 'ORD-TWIN-999', 'ORD-NON-EXISTENT']
                },
                user: { companyId: 'swan-company-id' }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            // Regular order table has:
            // 1. ORD-REG-100 (only in orders table)
            // 2. ORD-TWIN-999 (also exists in guestOrder table!)
            mockPrisma.order.findMany.mockResolvedValue([
                {
                    id: 'reg-1',
                    orderNumber: 'ORD-REG-100',
                    companyId: 'swan-company-id',
                    status: 'DELIVERED',
                    total: 100,
                    createdAt: new Date('2026-09-21T10:00:00Z'),
                    customer: { firstName: 'Ali', lastName: 'Hassan', phone: '01000000001' },
                    orderItems: []
                },
                {
                    id: 'reg-2',
                    orderNumber: 'ORD-TWIN-999',
                    companyId: 'swan-company-id',
                    status: 'CONFIRMED',
                    total: 200,
                    createdAt: new Date('2026-09-22T10:00:00Z'),
                    customer: { firstName: 'Twin', lastName: 'Customer', phone: '01000000002' },
                    orderItems: []
                }
            ]);

            // Guest order table has:
            // 1. ORD-208431-574 (guest/storefront order that does NOT have a regular order)
            // 2. ORD-TWIN-999 (twin of reg-2 in regular orders)
            mockPrisma.guestOrder.findMany.mockResolvedValue([
                {
                    id: 'guest-1',
                    orderNumber: 'ORD-208431-574',
                    companyId: 'swan-company-id',
                    guestName: 'سوان كستمر',
                    guestPhone: '01099887766',
                    guestEmail: 'swan@guest.com',
                    total: 350,
                    shippingCost: 30,
                    discountAmount: 0,
                    finalTotal: 380,
                    status: 'pending',
                    createdAt: new Date('2026-09-23T10:00:00Z'),
                    items: JSON.stringify([{ name: 'منتج سوان', price: 350, quantity: 1 }])
                },
                {
                    id: 'guest-twin',
                    orderNumber: 'ORD-TWIN-999',
                    companyId: 'swan-company-id',
                    guestName: 'Twin Customer',
                    guestPhone: '01000000002',
                    total: 200,
                    finalTotal: 200,
                    status: 'pending',
                    createdAt: new Date('2026-09-22T09:00:00Z')
                }
            ]);

            await bulkSearchOrders(req, res);

            expect(res.json).toHaveBeenCalled();
            const responseData = res.json.mock.calls[0][0];

            expect(responseData.success).toBe(true);
            const { orders, notFoundValues, stats } = responseData.data;

            // Verification of Deduplication:
            // There were 2 regular + 2 guest, but ORD-TWIN-999 was present in BOTH tables.
            // Deduplicated total count MUST BE EXACTLY 3!
            expect(orders).toHaveLength(3);

            const orderNumbers = orders.map(o => o.orderNumber);
            expect(orderNumbers).toContain('ORD-REG-100');
            expect(orderNumbers).toContain('ORD-208431-574');
            expect(orderNumbers).toContain('ORD-TWIN-999');

            // Twin order must appear only once
            expect(orderNumbers.filter(num => num === 'ORD-TWIN-999')).toHaveLength(1);

            // Storefront identification:
            const swanGuestOrder = orders.find(o => o.orderNumber === 'ORD-208431-574');
            expect(swanGuestOrder.isStorefront).toBe(true);
            expect(swanGuestOrder.isGuestOrder).toBe(true);
            expect(swanGuestOrder.sourceType).toBe('storefront');

            const twinOrder = orders.find(o => o.orderNumber === 'ORD-TWIN-999');
            expect(twinOrder.isStorefront).toBe(true);

            // Found / Not Found accuracy:
            expect(notFoundValues).toEqual(['ORD-NON-EXISTENT']);
            expect(stats.total).toBe(4);
            expect(stats.found).toBe(3);
            expect(stats.notFound).toBe(1);
            expect(stats.ordersCount).toBe(3);
            expect(stats.storefrontCount).toBe(2); // ORD-208431-574 and ORD-TWIN-999
        });

        it('should correctly search by phone across Order and GuestOrder tables', async () => {
            const req = {
                body: {
                    searchType: 'phone',
                    values: ['01011112222', '01033334444', '01099999999']
                },
                user: { companyId: 'swan-company-id' }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            // Order has 01011112222
            mockPrisma.order.findMany.mockResolvedValue([
                {
                    id: 'reg-phone',
                    orderNumber: 'ORD-PHONE-1',
                    companyId: 'swan-company-id',
                    status: 'SHIPPED',
                    total: 150,
                    createdAt: new Date(),
                    customerPhone: '01011112222',
                    orderItems: []
                }
            ]);

            // GuestOrder has 01033334444
            mockPrisma.guestOrder.findMany.mockResolvedValue([
                {
                    id: 'guest-phone',
                    orderNumber: 'ORD-PHONE-GUEST',
                    companyId: 'swan-company-id',
                    guestName: 'عميل المتجر',
                    guestPhone: '01033334444',
                    total: 250,
                    finalTotal: 250,
                    status: 'pending',
                    createdAt: new Date()
                }
            ]);

            await bulkSearchOrders(req, res);

            const responseData = res.json.mock.calls[0][0];
            expect(responseData.success).toBe(true);
            const { orders, notFoundValues, stats } = responseData.data;

            expect(orders).toHaveLength(2);
            expect(notFoundValues).toEqual(['01099999999']);
            expect(stats.found).toBe(2);
            expect(stats.notFound).toBe(1);
            expect(stats.ordersCount).toBe(2);
        });
    });
});
