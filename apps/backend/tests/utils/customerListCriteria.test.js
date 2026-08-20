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

  test('all ΓåÆ ╪╣┘à┘ä╪º╪í ┘å╪┤╪╖┘ê┘å ┘ü┘é╪╖', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'all' });
    expect(where).toEqual({ companyId, status: 'ACTIVE' });
  });

  test('all ┘à┘å ╪║┘è╪▒ ┘à╪╣╪º┘è┘è╪▒ ΓåÆ ┘å┘ü╪│ ╪º┘ä╪│┘ä┘ê┘â', () => {
    const { where } = buildCustomerListWhere(companyId, null);
    expect(where).toEqual({ companyId, status: 'ACTIVE' });
  });

  test('active ΓåÆ ┘ü┘ä╪¬╪▒╪⌐ ╪▒╪│╪º╪ª┘ä ╪º┘ä╪╣┘à┘ä╪º╪í ╪«┘ä╪º┘ä ╪│╪º╪╣╪º╪¬', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'active', hours: 24 });
    expect(where.companyId).toBe(companyId);
    expect(where.conversations.some.status).toBe('ACTIVE');
    expect(where.conversations.some.messages.some.isFromCustomer).toBe(true);
    expect(where.conversations.some.messages.some.createdAt.gte).toBeInstanceOf(Date);
  });

  test('active ┘è╪»╪╣┘à ╪¡┘é┘ä lastActivity ╪º┘ä┘é╪»┘è┘à', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'active', lastActivity: 12 });
    expect(where.conversations.some.messages.some.createdAt.gte).toBeInstanceOf(Date);
  });

  test('inactive ΓåÆ ┘ä╪º ╪¬┘ê╪¼╪» ┘à╪¡╪º╪»╪½╪º╪¬ ┘à╪¡╪»┘æ╪½╪⌐ ┘à╪ñ╪«╪▒╪º┘ï', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'inactive', days: 7 });
    expect(where.conversations.none.updatedAt.gte).toBeInstanceOf(Date);
  });

  test('tag ΓåÆ contains ┘ä┘ä┘ê╪│┘à', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'tag', tag: 'VIP' });
    expect(where.tags.contains).toBe('"VIP"');
  });

  test('tag ┘ü╪º╪▒╪║ ΓåÆ ┘è╪▒╪¼╪╣ ╪¼┘à┘è╪╣ ╪º┘ä┘å╪┤╪╖┘è┘å', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'tag', tag: '' });
    expect(where).toEqual({ companyId, status: 'ACTIVE' });
  });

  test('orderStatus ΓåÆ orders.some ╪¿╪¡╪º┘ä╪⌐ ┘ê┘ü╪¬╪▒╪⌐', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'orderStatus', status: 'DELIVERED', days: 30 });
    expect(where.orders.some.status).toBe('DELIVERED');
    expect(where.orders.some.createdAt.gte).toBeInstanceOf(Date);
  });

  test('orderStatus ╪¿╪»┘ê┘å ╪ú┘è╪º┘à ΓåÆ ╪¿╪»┘ê┘å ┘é┘è╪» ╪▓┘à┘å┘è', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'orderStatus', status: 'RETURNED' });
    expect(where.orders.some.status).toBe('RETURNED');
    expect(where.orders.some.createdAt).toBeUndefined();
  });

  test('returnRequest ΓåÆ returnRequests.some', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'returnRequest', status: 'APPROVED', days: 14 });
    expect(where.returnRequests.some.status).toBe('APPROVED');
    expect(where.returnRequests.some.createdAt.gte).toBeInstanceOf(Date);
  });

  test('paymentStatus ΓåÆ orders.some ╪¿╪¡╪º┘ä╪⌐ ╪»┘ü╪╣', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'paymentStatus', status: 'COMPLETED' });
    expect(where.orders.some.paymentStatus).toBe('COMPLETED');
  });

  test('city ΓåÆ orders.some ╪¿╪º┘ä┘à╪»┘è┘å╪⌐', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'city', city: '╪º┘ä┘é╪º┘ç╪▒╪⌐' });
    expect(where.orders.some.city).toBe('╪º┘ä┘é╪º┘ç╪▒╪⌐');
  });

  test('customerRating ΓåÆ rating ┘à╪¿╪º╪┤╪▒╪⌐', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'customerRating', rating: 'EXCELLENT' });
    expect(where.customerRating).toBe('EXCELLENT');
  });

  test('latest ΓåÆ ╪¬╪▒╪¬┘è╪¿ ╪¬┘å╪º╪▓┘ä┘è ┘à╪╣ take', () => {
    const { where, orderBy, take } = buildCustomerListWhere(companyId, { type: 'latest', limit: 50 });
    expect(orderBy.createdAt).toBe('desc');
    expect(take).toBe(50);
    expect(where.companyId).toBe(companyId);
  });

  test('oldest ΓåÆ ╪¬╪▒╪¬┘è╪¿ ╪¬╪╡╪º╪╣╪»┘è ┘à╪╣ take', () => {
    const { orderBy, take } = buildCustomerListWhere(companyId, { type: 'oldest', limit: 20 });
    expect(orderBy.createdAt).toBe('asc');
    expect(take).toBe(20);
  });

  test('minTotalSpent ΓåÆ ╪╣┘ä╪º┘à╪⌐ ╪«╪º╪╡╪⌐ ┘ä┘ä╪¬╪¼┘à┘è╪╣', () => {
    const { _minTotalSpent } = buildCustomerListWhere(companyId, { type: 'minTotalSpent', amount: 500 });
    expect(_minTotalSpent).toBe(500);
  });

  test('minOrdersCount ΓåÆ ╪╣┘ä╪º┘à╪⌐ ╪«╪º╪╡╪⌐ ┘ä┘ä╪¬╪¼┘à┘è╪╣', () => {
    const { _minOrdersCount } = buildCustomerListWhere(companyId, { type: 'minOrdersCount', count: 3 });
    expect(_minOrdersCount).toBe(3);
  });

  test('combo ΓåÆ AND ┘ä╪┤╪▒┘ê╪╖ ┘à╪¬╪╣╪»╪»╪⌐', () => {
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

  test('┘å┘ê╪╣ ╪║┘è╪▒ ┘à╪╣╪▒┘ê┘ü ΓåÆ ╪¼┘à┘è╪╣ ╪º┘ä┘å╪┤╪╖┘è┘å', () => {
    const { where } = buildCustomerListWhere(companyId, { type: 'unknown_xyz' });
    expect(where).toEqual({ companyId, status: 'ACTIVE' });
  });

  test('criteria ┘â┘Ç JSON string ┘è┘Å╪¡┘ä┘ä', () => {
    const { where } = buildCustomerListWhere(companyId, JSON.stringify({ type: 'all' }));
    expect(where).toEqual({ companyId, status: 'ACTIVE' });
  });
});

describe('criteriaToSummary', () => {
  test('┘å╪╡┘ê╪╡ ╪╣╪▒╪¿┘è╪⌐ ┘ä┘â┘ä ┘å┘ê╪╣', () => {
    expect(criteriaToSummary({ type: 'all' })).toBe('╪¼┘à┘è╪╣ ╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä┘å╪┤╪╖┘è┘å');
    expect(criteriaToSummary({ type: 'active', hours: 12 })).toContain('12 ╪│╪º╪╣╪⌐');
    expect(criteriaToSummary({ type: 'inactive', days: 5 })).toContain('5 ┘è┘ê┘à');
    expect(criteriaToSummary({ type: 'tag', tag: 'VIP' })).toBe('┘è╪¡┘à┘ä ┘ê╪│┘à: VIP');
    expect(criteriaToSummary({ type: 'orderStatus', status: 'DELIVERED', days: 30 })).toContain('30 ┘è┘ê┘à');
    expect(criteriaToSummary({ type: 'latest', limit: 100 })).toBe('╪ú╪¡╪»╪½ 100 ╪╣┘à┘è┘ä');
    expect(criteriaToSummary({ type: 'oldest', limit: 25 })).toBe('╪ú┘é╪»┘à 25 ╪╣┘à┘è┘ä');
    expect(criteriaToSummary({ type: 'minTotalSpent', amount: 1000 })).toContain('1000');
    expect(criteriaToSummary({ type: 'combo' })).toBe('┘é╪º╪ª┘à╪⌐ ┘à╪«╪╡┘æ╪╡╪⌐ (╪┤╪▒┘ê╪╖ ┘à╪¬╪╣╪»╪»╪⌐)');
  });
});

describe('┘é┘ê╪º╪ª┘à ╪º┘ä╪½┘ê╪º╪¿╪¬', () => {
  test('╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪¬╪┤┘à┘ä ╪º┘ä┘à╪╖┘ä┘ê╪¿╪⌐', () => {
    expect(ORDER_STATUSES).toContain('DELIVERED');
    expect(ORDER_STATUSES).toContain('RETURNED');
    expect(ORDER_STATUSES).toContain('PARTIALLY_RETURNED');
    expect(ORDER_STATUSES).toContain('OUT_FOR_DELIVERY');
  });
  test('╪¡╪º┘ä╪º╪¬ ╪º┘ä┘à╪▒╪¬╪¼╪╣╪º╪¬', () => {
    expect(RETURN_STATUSES).toEqual(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']);
  });
  test('╪¡╪º┘ä╪º╪¬ ╪º┘ä╪»┘ü╪╣', () => {
    expect(PAYMENT_STATUSES).toContain('COMPLETED');
    expect(PAYMENT_STATUSES).toContain('REFUNDED');
  });
  test('╪º┘ä╪¬┘é┘è┘è┘à╪º╪¬', () => {
    expect(CUSTOMER_RATINGS).toContain('EXCELLENT');
  });
});

describe('PRESETS ΓÇö ┘é┘ê╪º┘ä╪¿ RFM ╪º┘ä╪¼╪º┘ç╪▓╪⌐', () => {
  test('champions ╪¬╪¡╪¬┘ê┘è ╪º┘ä╪Ñ┘å┘ü╪º┘é + ╪╣╪»╪» ╪º┘ä╪╖┘ä╪¿╪º╪¬', () => {
    expect(PRESETS.champions).toBeDefined();
    const aggs = extractAggregates(PRESETS.champions.criteria);
    expect(aggs).toEqual(expect.arrayContaining([
      { type: 'minTotalSpent', value: 2000 },
      { type: 'minOrdersCount', value: 3 },
    ]));
  });

  test('loyal ╪¬╪¡╪¬┘ê┘è ╪¡╪» ╪╣╪»╪» ╪º┘ä╪╖┘ä╪¿╪º╪¬', () => {
    const aggs = extractAggregates(PRESETS.loyal.criteria);
    expect(aggs).toContainEqual({ type: 'minOrdersCount', value: 5 });
  });

  test('atRisk ╪¬╪¼┘à╪╣ ╪║┘è╪▒ ┘å╪┤╪╖ + ╪╖┘ä╪¿╪º╪¬ ╪¬┘à ╪¬╪│┘ä┘è┘à┘ç╪º', () => {
    const { where } = buildCustomerListWhere('comp_1', { type: 'preset', preset: 'atRisk' });
    expect(where.AND).toBeDefined();
  });

  test('new ΓåÆ ╪ú╪¡╪»╪½ 100', () => {
    const { orderBy, take } = buildCustomerListWhere('comp_1', { type: 'preset', preset: 'new' });
    expect(orderBy.createdAt).toBe('desc');
    expect(take).toBe(100);
  });

  test('preset ╪║┘è╪▒ ┘à╪╣╪▒┘ê┘ü ΓåÆ ╪¼┘à┘è╪╣ ╪º┘ä┘å╪┤╪╖┘è┘å', () => {
    const { where } = buildCustomerListWhere('comp_1', { type: 'preset', preset: 'nope' });
    expect(where).toEqual({ companyId: 'comp_1', status: 'ACTIVE' });
  });
});

describe('extractAggregates', () => {
  test('┘è╪│╪¬╪«╪▒╪¼ aggregation ┘ê╪º╪¡╪»╪⌐', () => {
    expect(extractAggregates({ type: 'minTotalSpent', amount: 500 }))
      .toEqual([{ type: 'minTotalSpent', value: 500 }]);
  });

  test('┘è╪│╪¬╪«╪▒╪¼ aggregations ┘à╪¬╪»╪º╪«┘ä╪⌐ ┘ü┘è combo', () => {
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

  test('┘è╪│╪¬╪«╪▒╪¼ ┘à┘å preset ╪╣╪¿╪▒ ╪º┘ä╪¬┘ê╪│┘è╪╣', () => {
    const aggs = extractAggregates({ type: 'preset', preset: 'champions' });
    expect(aggs.length).toBeGreaterThanOrEqual(1);
  });

  test('criteria ╪¿┘ä╪º aggregation ΓåÆ ┘à╪╡┘ü┘ê┘ü╪⌐ ┘ü╪º╪▒╪║╪⌐', () => {
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

  test('┘è╪╣┘è╪» ╪¬┘é╪º╪╖╪╣ ╪┤╪▒┘ê╪╖ aggregation (AND)', async () => {
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

    // c1 (5000 + 5) ┘ê c3 (3000 + 4) ┘è┘à╪▒┘æ╪º┘å╪î c2 ┘ä╪º
    expect(ids).toEqual(['c1', 'c3']);
  });

  test('╪¿┘ä╪º aggregations ΓåÆ null', async () => {
    const ids = await resolveAggregateCustomerIds(prisma, 'comp_1', { type: 'all' });
    expect(ids).toBeNull();
  });

  test('┘ä╪º ┘è╪¼╪▒┘è ╪º╪│╪¬╪╣┘ä╪º┘à ╪╣┘å╪» ╪╣╪»┘à ┘ê╪¼┘ê╪» aggregations', async () => {
    await resolveAggregateCustomerIds(prisma, 'comp_1', { type: 'tag', tag: 'VIP' });
    expect(prisma.order.groupBy).not.toHaveBeenCalled();
  });
});

describe('criteriaToSummary ┘ä┘ä┘é┘ê╪º┘ä╪¿', () => {
  test('┘è╪¬╪▒╪¼┘à preset ┘ä┘ä╪º╪│┘à ╪º┘ä╪╣╪▒╪¿┘è', () => {
    expect(criteriaToSummary({ type: 'preset', preset: 'champions' })).toBe('╪ú┘ü╪╢┘ä ╪º┘ä╪╣┘à┘ä╪º╪í');
    expect(criteriaToSummary({ type: 'preset', preset: 'loyal' })).toBe('╪º┘ä╪╣┘à┘ä╪º╪í ╪º┘ä╪ú┘ê┘ü┘è╪º╪í');
  });
});

describe('applyContactExclusion ΓÇö ╪º╪│╪¬╪½┘å╪º╪í ╪º┘ä┘à╪▒╪º╪│┘Ä┘ä┘è┘å', () => {
  test('┘è╪╢┘è┘ü NOT ╪╣┘ä┘ë ╪º┘ä╪▒╪│╪º╪ª┘ä ╪«┘ä╪º┘ä ╪º┘ä┘ü╪¬╪▒╪⌐', () => {
    const base = { companyId: 'c1', status: 'ACTIVE' };
    const out = applyContactExclusion(base, { excludeContactedInDays: 7 });
    expect(out.NOT).toBeDefined();
    expect(out.NOT.conversations.some.messages.some.createdAt.gte).toBeInstanceOf(Date);
    expect(out.status).toBe('ACTIVE');
  });

  test('╪¿╪»┘ê┘å ┘é┘è┘à╪⌐ ΓåÆ ┘è╪╣┘è╪» ╪º┘ä┘Ç where ┘â┘à╪º ┘ç┘ê', () => {
    const base = { companyId: 'c1' };
    expect(applyContactExclusion(base, {})).toEqual(base);
  });

  test('┘è╪»┘à╪¼ ┘à╪╣ NOT ┘à┘ê╪¼┘ê╪»╪⌐ ┘â┘à╪╡┘ü┘ê┘ü╪⌐ AND', () => {
    const base = { companyId: 'c1', NOT: { tags: { contains: 'x' } } };
    const out = applyContactExclusion(base, { excludeContactedInDays: 3 });
    expect(Array.isArray(out.NOT)).toBe(true);
    expect(out.NOT).toHaveLength(2);
  });

  test('buildEffectiveCustomerListWhere ┘è╪╖╪¿┘æ┘é ╪º┘ä╪º╪│╪¬╪½┘å╪º╪í', async () => {
    const prisma = { order: { groupBy: jest.fn().mockResolvedValue([]) } };
    const { where } = await buildEffectiveCustomerListWhere(prisma, 'c1', {
      type: 'all',
      excludeContactedInDays: 7,
    });
    expect(where.NOT).toBeDefined();
  });

  test('criteriaToSummary ┘è╪╢┘è┘ü ┘å╪╡ ╪º┘ä╪º╪│╪¬╪½┘å╪º╪í', () => {
    expect(criteriaToSummary({ type: 'all', excludeContactedInDays: 14 }))
      .toContain('╪¿╪»┘ê┘å ┘à╪▒╪º╪│┘ä╪⌐ ╪«┘ä╪º┘ä ╪ó╪«╪▒ 14 ┘è┘ê┘à');
  });
});
