const {
  PRISMA_ORDER_STATUS_ENUM,
  PREP_FILTER_STATUSES,
  isTurboStatusCode,
  parseStatusFilter
} = require('../../utils/orderStatusFilter');

// Known codes = enum + a couple of custom DB codes, mirroring the runtime cache.
const KNOWN = new Set([...PRISMA_ORDER_STATUS_ENUM, 'BDONKODTERBO', 'CUSTOM_PENDING']);

describe('orderStatusFilter.parseStatusFilter', () => {
  test('empty / all / missing values produce no real statuses', () => {
    for (const value of [undefined, null, '', 'all']) {
      const result = parseStatusFilter(value, KNOWN);
      expect(result.realStatusList).toEqual([]);
      expect(result.incompleteFilterStatus).toBeNull();
      expect(result.plainEnumStatuses).toEqual([]);
      expect(result.customStatuses).toEqual([]);
      expect(result.turboAliasValues).toEqual([]);
    }
  });

  test('a single plain enum status maps to plainEnumStatuses', () => {
    const result = parseStatusFilter('DELIVERED', KNOWN);
    expect(result.realStatusList).toEqual(['DELIVERED']);
    expect(result.plainEnumStatuses).toEqual(['DELIVERED']);
    expect(result.customStatuses).toEqual([]);
    expect(result.guestStatusValues).toEqual(['DELIVERED', 'delivered']);
  });

  test('multiple plain enum statuses combine in one plainEnumStatuses array', () => {
    const result = parseStatusFilter('SHIPPED,DELIVERED,CANCELLED', KNOWN);
    expect(result.realStatusList).toEqual(['SHIPPED', 'DELIVERED', 'CANCELLED']);
    expect(result.plainEnumStatuses).toEqual(['SHIPPED', 'DELIVERED', 'CANCELLED']);
    expect(result.customStatuses).toEqual([]);
    expect(result.guestStatusValues).toEqual([
      'SHIPPED', 'shipped',
      'DELIVERED', 'delivered',
      'CANCELLED', 'cancelled'
    ]);
  });

  test('lowercase input is normalized to uppercase', () => {
    const result = parseStatusFilter('shipped,delivered', KNOWN);
    expect(result.plainEnumStatuses).toEqual(['SHIPPED', 'DELIVERED']);
  });

  test('whitespace around codes is tolerated', () => {
    const result = parseStatusFilter('  SHIPPED , DELIVERED  ', KNOWN);
    expect(result.plainEnumStatuses).toEqual(['SHIPPED', 'DELIVERED']);
  });

  test('prep statuses go to customStatuses (COALESCE path)', () => {
    const result = parseStatusFilter('PREPARING', KNOWN);
    expect(result.plainEnumStatuses).toEqual([]);
    expect(result.customStatuses).toEqual(['PREPARING']);
  });

  test('known prep statuses (PENDING/CONFIRMED/PROCESSING) use the COALESCE path', () => {
    const result = parseStatusFilter('CONFIRMED,PENDING,PROCESSING', KNOWN);
    expect(result.plainEnumStatuses).toEqual([]);
    expect(result.customStatuses).toEqual(['CONFIRMED', 'PENDING', 'PROCESSING']);
  });

  test('plain enum + prep statuses partition into both groups', () => {
    const result = parseStatusFilter('SHIPPED,PREPARING,DELIVERED', KNOWN);
    expect(result.plainEnumStatuses).toEqual(['SHIPPED', 'DELIVERED']);
    expect(result.customStatuses).toEqual(['PREPARING']);
  });

  test('non-enum turbo statuses map to turboAliasValues', () => {
    const result = parseStatusFilter('remitted,archived', KNOWN);
    expect(result.plainEnumStatuses).toEqual([]);
    expect(result.customStatuses).toEqual([]);
    expect(result.turboAliasValues).toEqual(
      expect.arrayContaining(['remitted', 'status_8', 'status_19', '8', '19'])
    );
    expect(result.turboAliasValues).toEqual(
      expect.arrayContaining(['archived', 'status_9', '9'])
    );
  });

  test('turbo + plain enum mix partitions into both groups', () => {
    const result = parseStatusFilter('CANCELLED,remitted', KNOWN);
    expect(result.plainEnumStatuses).toEqual(['CANCELLED']);
    expect(result.turboAliasValues).toEqual(
      expect.arrayContaining(['remitted', 'status_8', 'status_19', '8', '19'])
    );
    expect(result.guestStatusValues).toEqual(
      expect.arrayContaining(['CANCELLED', 'cancelled', 'REMITTED', 'remitted'])
    );
  });

  test('enum-named turbo codes stay on the enum path (preserved behavior)', () => {
    const result = parseStatusFilter('delivered,processing', KNOWN);
    expect(result.plainEnumStatuses).toEqual(['DELIVERED']);
    expect(result.customStatuses).toEqual(['PROCESSING']);
    expect(result.turboAliasValues).toEqual([]);
  });

  test('custom DB statuses (non-enum) go to customStatuses', () => {
    const result = parseStatusFilter('BDONKODTERBO', KNOWN);
    expect(result.customStatuses).toEqual(['BDONKODTERBO']);
    expect(result.plainEnumStatuses).toEqual([]);
  });

  test('unknown statuses are collected in ignored', () => {
    const result = parseStatusFilter('DELIVERED,NOPE,SHIPPED', KNOWN);
    expect(result.plainEnumStatuses).toEqual(['DELIVERED', 'SHIPPED']);
    expect(result.ignored).toEqual(['NOPE']);
  });

  test('incomplete/lost only work as the sole selection', () => {
    const incomplete = parseStatusFilter('incomplete', KNOWN);
    expect(incomplete.incompleteFilterStatus).toBe('incomplete');
    expect(incomplete.realStatusList).toEqual([]);

    const lost = parseStatusFilter('lost', KNOWN);
    expect(lost.incompleteFilterStatus).toBe('lost');
    expect(lost.realStatusList).toEqual([]);
  });

  test('incomplete combined with real statuses is dropped from the real list', () => {
    const result = parseStatusFilter('incomplete,DELIVERED', KNOWN);
    expect(result.incompleteFilterStatus).toBeNull();
    expect(result.realStatusList).toEqual(['DELIVERED']);
    expect(result.plainEnumStatuses).toEqual(['DELIVERED']);
  });

  test('incomplete mixed with lost is not a sole selection', () => {
    const result = parseStatusFilter('incomplete,lost', KNOWN);
    expect(result.incompleteFilterStatus).toBeNull();
    expect(result.realStatusList).toEqual([]);
  });
});

describe('orderStatusFilter.isTurboStatusCode', () => {
  test.each([
    ['remitted', true],
    ['merchant_preparing', true],
    ['turbo_saved', true],
    ['returned_to_company', true],
    ['archived', true],
    ['not-a-status', false],
    ['shipped', false],
    ['confirmed', false]
  ])('%s -> %s', (code, expected) => {
    expect(isTurboStatusCode(code.toLowerCase())).toBe(expected);
  });
});

describe('orderStatusFilter.PREP_FILTER_STATUSES', () => {
  test('enum prep stages are routed through the COALESCE path', () => {
    for (const code of ['PENDING', 'CONFIRMED', 'SCHEDULED', 'PROCESSING', 'PREPARING', 'READY_TO_SHIP']) {
      expect(PRISMA_ORDER_STATUS_ENUM.has(code)).toBe(true);
      expect(PREP_FILTER_STATUSES.has(code)).toBe(true);
    }
  });
});
