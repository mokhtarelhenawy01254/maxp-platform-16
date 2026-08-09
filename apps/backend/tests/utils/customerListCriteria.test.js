const {
  buildCustomerListWhere,
  buildEffectiveCustomerListWhere,
  criteriaToSummary,
  extractAggregates,
  resolveAggregateCustomerIds,
  applyContactExclusion,
  PRESETS,
  ORDER_STATUSES,
  RETURN_STATUSES,
  PAYMENT_STATUSES,
  CUSTOMER_RATINGS,
} = require('../../utils/customerListCriteria');

describe('buildCustomerListWhere', () => {
  const companyId = 'comp_1';

  test('all → عملاء نشطون فقط', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'all' });
    expect(where).toEqual({ companyId, status: 'ACTIVE' });
  });

  test('all من غير معايير → نفس السلوك', () => {
    const { where } = buildCustomerListWhere(companyId, null);
    expect(where).toEqual({ companyId, status: 'ACTIVE' });
  });

  test('active → فلترة رسائل العملاء خلال ساعات', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'active', hours: 24 });
    expect(where.companyId).toBe(companyId);
    expect(where.conversations.some.status).toBe('ACTIVE');
    expect(where.conversations.some.messages.some.isFromCustomer).toBe(true);
    expect(where.conversations.some.messages.some.createdAt.gte).toBeInstanceOf(Date);
  });

  test('active يدعم حقل lastActivity القديم', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'active', lastActivity: 12 });
    expect(where.conversations.some.messages.some.createdAt.gte).toBeInstanceOf(Date);
  });

  test('inactive → لا توجد محادثات محدّثة مؤخراً', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'inactive', days: 7 });
    expect(where.conversations.none.updatedAt.gte).toBeInstanceOf(Date);
  });

  test('tag → contains للوسم', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'tag', tag: 'VIP' });
    expect(where.tags.contains).toBe('"VIP"');
  });

  test('tag فارغ → يرجع جميع النشطين', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'tag', tag: '' });
    expect(where).toEqual({ companyId, status: 'ACTIVE' });
  });

  test('orderStatus → orders.some بحالة وفترة', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'orderStatus', status: 'DELIVERED', days: 30 });
    expect(where.orders.some.status).toBe('DELIVERED');
    expect(where.orders.some.createdAt.gte).toBeInstanceOf(Date);
  });

  test('orderStatus بدون أيام → بدون قيد زمني', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'orderStatus', status: 'RETURNED' });
    expect(where.orders.some.status).toBe('RETURNED');
    expect(where.orders.some.createdAt).toBeUndefined();
  });

  test('returnRequest → returnRequests.some', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'returnRequest', status: 'APPROVED', days: 14 });
    expect(where.returnRequests.some.status).toBe('APPROVED');
    expect(where.returnRequests.some.createdAt.gte).toBeInstanceOf(Date);
  });

  test('paymentStatus → orders.some بحالة دفع', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'paymentStatus', status: 'COMPLETED' });
    expect(where.orders.some.paymentStatus).toBe('COMPLETED');
  });

  test('city → orders.some بالمدينة', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'city', city: 'القاهرة' });
    expect(where.orders.some.city).toBe('القاهرة');
  });

  test('customerRating → rating مباشرة', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'customerRating', rating: 'EXCELLENT' });
    expect(where.customerRating).toBe('EXCELLENT');
  });

  test('latest → ترتيب تنازلي مع take', () => {
    const { where, orderBy, take } = buildCustomerListWhere(companyId, { type: 'latest', limit: 50 });
    expect(orderBy.createdAt).toBe('desc');
    expect(take).toBe(50);
    expect(where.companyId).toBe(companyId);
  });

  test('oldest → ترتيب تصاعدي مع take', () => {
    const { orderBy, take } = buildCustomerListWhere(companyId, { type: 'oldest', limit: 20 });
    expect(orderBy.createdAt).toBe('asc');
    expect(take).toBe(20);
  });

  test('minTotalSpent → علامة خاصة للتجميع', () => {
    const { _minTotalSpent } = buildCustomerListWhere(companyId, { type: 'minTotalSpent', amount: 500 });
    expect(_minTotalSpent).toBe(500);
  });

  test('minOrdersCount → علامة خاصة للتجميع', () => {
    const { _minOrdersCount } = buildCustomerListWhere(companyId, { type: 'minOrdersCount', count: 3 });
    expect(_minOrdersCount).toBe(3);
  });

  test('combo → AND لشروط متعددة', () => {
    const { where } = buildCustomerListWhere(companyId, {
      type: 'combo',
      conditions: [
        { type: 'active', hours: 24 },
        { type: 'customerRating', rating: 'EXCELLENT' },
      ],
    });
    expect(Array.isArray(where.AND)).toBe(true);
    expect(where.AND).toHaveLength(2);
  });

  test('نوع غير معروف → جميع النشطين', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'unknown_xyz' });
    expect(where).toEqual({ companyId, status: 'ACTIVE' });
  });

  test('criteria كـ JSON string يُحلل', () => {
    const { where } = buildCustomerListWhere(companyId, JSON.stringify({ type: 'all' }));
    expect(where).toEqual({ companyId, status: 'ACTIVE' });
  });
});

describe('criteriaToSummary', () => {
  test('نصوص عربية لكل نوع', () => {
    expect(criteriaToSummary({ type: 'all' })).toBe('جميع العملاء النشطين');
    expect(criteriaToSummary({ type: 'active', hours: 12 })).toContain('12 ساعة');
    expect(criteriaToSummary({ type: 'inactive', days: 5 })).toContain('5 يوم');
    expect(criteriaToSummary({ type: 'tag', tag: 'VIP' })).toBe('يحمل وسم: VIP');
    expect(criteriaToSummary({ type: 'orderStatus', status: 'DELIVERED', days: 30 })).toContain('30 يوم');
    expect(criteriaToSummary({ type: 'latest', limit: 100 })).toBe('أحدث 100 عميل');
    expect(criteriaToSummary({ type: 'oldest', limit: 25 })).toBe('أقدم 25 عميل');
    expect(criteriaToSummary({ type: 'minTotalSpent', amount: 1000 })).toContain('1000');
    expect(criteriaToSummary({ type: 'combo' })).toBe('قائمة مخصّصة (شروط متعددة)');
  });
});

describe('قوائم الثوابت', () => {
  test('حالات الطلبات تشمل المطلوبة', () => {
    expect(ORDER_STATUSES).toContain('DELIVERED');
    expect(ORDER_STATUSES).toContain('RETURNED');
    expect(ORDER_STATUSES).toContain('PARTIALLY_RETURNED');
    expect(ORDER_STATUSES).toContain('OUT_FOR_DELIVERY');
  });
  test('حالات المرتجعات', () => {
    expect(RETURN_STATUSES).toEqual(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']);
  });
  test('حالات الدفع', () => {
    expect(PAYMENT_STATUSES).toContain('COMPLETED');
    expect(PAYMENT_STATUSES).toContain('REFUNDED');
  });
  test('التقييمات', () => {
    expect(CUSTOMER_RATINGS).toContain('EXCELLENT');
  });
});

describe('PRESETS — قوالب RFM الجاهزة', () => {
  test('champions تحتوي الإنفاق + عدد الطلبات', () => {
    expect(PRESETS.champions).toBeDefined();
    const aggs = extractAggregates(PRESETS.champions.criteria);
    expect(aggs).toEqual(expect.arrayContaining([
      { type: 'minTotalSpent', value: 2000 },
      { type: 'minOrdersCount', value: 3 },
    ]));
  });

  test('loyal تحتوي حد عدد الطلبات', () => {
    const aggs = extractAggregates(PRESETS.loyal.criteria);
    expect(aggs).toContainEqual({ type: 'minOrdersCount', value: 5 });
  });

  test('atRisk تجمع غير نشط + طلبات تم تسليمها', () => {
    const { where } = buildCustomerListWhere('comp_1', { type: 'preset', preset: 'atRisk' });
    expect(where.AND).toBeDefined();
  });

  test('new → أحدث 100', () => {
    const { orderBy, take } = buildCustomerListWhere('comp_1', { type: 'preset', preset: 'new' });
    expect(orderBy.createdAt).toBe('desc');
    expect(take).toBe(100);
  });

  test('preset غير معروف → جميع النشطين', () => {
    const { where } = buildCustomerListWhere('comp_1', { type: 'preset', preset: 'nope' });
    expect(where).toEqual({ companyId: 'comp_1', status: 'ACTIVE' });
  });
});

describe('extractAggregates', () => {
  test('يستخرج aggregation واحدة', () => {
    expect(extractAggregates({ type: 'minTotalSpent', amount: 500 }))
      .toEqual([{ type: 'minTotalSpent', value: 500 }]);
  });

  test('يستخرج aggregations متداخلة في combo', () => {
    const aggs = extractAggregates({
      type: 'combo',
      conditions: [
        { type: 'all' },
        { type: 'minTotalSpent', amount: 1000 },
        { type: 'minOrdersCount', count: 4 },
      ],
    });
    expect(aggs).toEqual([
      { type: 'minTotalSpent', value: 1000 },
      { type: 'minOrdersCount', value: 4 },
    ]);
  });

  test('يستخرج من preset عبر التوسيع', () => {
    const aggs = extractAggregates({ type: 'preset', preset: 'champions' });
    expect(aggs.length).toBeGreaterThanOrEqual(1);
  });

  test('criteria بلا aggregation → مصفوفة فارغة', () => {
    expect(extractAggregates({ type: 'all' })).toEqual([]);
  });
});

describe('resolveAggregateCustomerIds', () => {
  const prisma = {
    order: {
      groupBy: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('يعيد تقاطع شروط aggregation (AND)', async () => {
    prisma.order.groupBy.mockResolvedValue([
      { customerId: 'c1', _sum: { total: 5000 }, _count: { customerId: 5 } },
      { customerId: 'c2', _sum: { total: 1000 }, _count: { customerId: 2 } },
      { customerId: 'c3', _sum: { total: 3000 }, _count: { customerId: 4 } },
    ]);

    const ids = await resolveAggregateCustomerIds(prisma, 'comp_1', {
      type: 'combo',
      conditions: [
        { type: 'minTotalSpent', amount: 2000 },
        { type: 'minOrdersCount', count: 3 },
      ],
    });

    // c1 (5000 + 5) و c3 (3000 + 4) يمرّان، c2 لا
    expect(ids).toEqual(['c1', 'c3']);
  });

  test('بلا aggregations → null', async () => {
    const ids = await resolveAggregateCustomerIds(prisma, 'comp_1', { type: 'all' });
    expect(ids).toBeNull();
  });

  test('لا يجري استعلام عند عدم وجود aggregations', async () => {
    await resolveAggregateCustomerIds(prisma, 'comp_1', { type: 'tag', tag: 'VIP' });
    expect(prisma.order.groupBy).not.toHaveBeenCalled();
  });
});

describe('criteriaToSummary للقوالب', () => {
  test('يترجم preset للاسم العربي', () => {
    expect(criteriaToSummary({ type: 'preset', preset: 'champions' })).toBe('أفضل العملاء');
    expect(criteriaToSummary({ type: 'preset', preset: 'loyal' })).toBe('العملاء الأوفياء');
  });
});

describe('applyContactExclusion — استثناء المراسَلين', () => {
  test('يضيف NOT على الرسائل خلال الفترة', () => {
    const base = { companyId: 'c1', status: 'ACTIVE' };
    const out = applyContactExclusion(base, { excludeContactedInDays: 7 });
    expect(out.NOT).toBeDefined();
    expect(out.NOT.conversations.some.messages.some.createdAt.gte).toBeInstanceOf(Date);
    expect(out.status).toBe('ACTIVE');
  });

  test('بدون قيمة → يعيد الـ where كما هو', () => {
    const base = { companyId: 'c1' };
    expect(applyContactExclusion(base, {})).toEqual(base);
  });

  test('يدمج مع NOT موجودة كمصفوفة AND', () => {
    const base = { companyId: 'c1', NOT: { tags: { contains: 'x' } } };
    const out = applyContactExclusion(base, { excludeContactedInDays: 3 });
    expect(Array.isArray(out.NOT)).toBe(true);
    expect(out.NOT).toHaveLength(2);
  });

  test('buildEffectiveCustomerListWhere يطبّق الاستثناء', async () => {
    const prisma = { order: { groupBy: jest.fn().mockResolvedValue([]) } };
    const { where } = await buildEffectiveCustomerListWhere(prisma, 'c1', {
      type: 'all',
      excludeContactedInDays: 7,
    });
    expect(where.NOT).toBeDefined();
  });

  test('criteriaToSummary يضيف نص الاستثناء', () => {
    expect(criteriaToSummary({ type: 'all', excludeContactedInDays: 14 }))
      .toContain('بدون مراسلة خلال آخر 14 يوم');
  });
});
