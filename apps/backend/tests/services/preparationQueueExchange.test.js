/**
 * Regression tests — exchange (replacement) orders are NORMAL preparation orders.
 *
 * Task 69cc5d36: the temporary exception from 4b5b8635 (an EXCHANGED row carrying
 * metadata.requestType=exchange / originalOrderId was surfaced as PENDING_PREPARATION)
 * is gone. Every replacement row was migrated to status = PENDING_PREPARATION, so it
 * walks WAITING → PREPARING → QUALITY_CHECK → PACKAGED → READY_TO_SHIP like any other
 * order, and «استبدال» is only a work type (metadata), not a status.
 *
 * The ORIGINAL order stays EXCHANGED and must never show up in the queue.
 */

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const fs = require('fs');
const path = require('path');

const {
  getEffectivePreparationStatus,
  normalizePreparationStage,
  mapRegularOrderToSimple,
} = require('../../services/preparationQueueService');

const {
  buildOpenExchangeVerdict,
  findOpenExchange,
} = require('../../services/exchangeChainGuard');

const readSource = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '../..', relativePath), 'utf8');

const REPLACEMENT_METADATA = {
  requestType: 'exchange',
  originalOrderId: 'orig-1',
  originalOrderNumber: 'ORD-000001-111',
};

describe('preparation queue — replacement order walks the full cycle (task 69cc5d36)', () => {
  it('starts in WAITING as PENDING_PREPARATION', () => {
    const effective = getEffectivePreparationStatus('PENDING_PREPARATION', REPLACEMENT_METADATA);

    expect(effective).toBe('PENDING_PREPARATION');
    expect(normalizePreparationStage(effective)).toBe('WAITING');
  });

  it('stays visible in every later stage after the queue writes preparationStatus', () => {
    // updatePreparationOrderStatus() stores the stage in metadata.preparationStatus and
    // maps order.status to PROCESSING for the rest of the system.
    const cycle = [
      ['PREPARING', 'PREPARING'],
      ['QUALITY_CHECK', 'QUALITY_CHECK'],
      ['PACKAGED', 'PACKAGED'],
      ['READY_TO_SHIP', 'READY_TO_SHIP'],
    ];

    for (const [preparationStatus, expectedStage] of cycle) {
      const effective = getEffectivePreparationStatus('PROCESSING', {
        ...REPLACEMENT_METADATA,
        preparationStatus,
      });

      expect(effective).toBe(preparationStatus);
      expect(normalizePreparationStage(effective)).toBe(expectedStage);
    }
  });

  it('never returns a stage the queue drops (no null stage while in flight)', () => {
    const statuses = [
      getEffectivePreparationStatus('PENDING_PREPARATION', REPLACEMENT_METADATA),
      getEffectivePreparationStatus('PROCESSING', { ...REPLACEMENT_METADATA, preparationStatus: 'PREPARING' }),
      getEffectivePreparationStatus('PROCESSING', { ...REPLACEMENT_METADATA, preparationStatus: 'PACKAGED' }),
      getEffectivePreparationStatus('READY_TO_SHIP', { ...REPLACEMENT_METADATA, preparationStatus: 'READY_TO_SHIP' }),
    ];

    for (const status of statuses) {
      expect(normalizePreparationStage(status)).toBeTruthy();
    }
  });

  it('keeps the ORIGINAL order terminal: EXCHANGED is no longer admitted to preparation', () => {
    // The exception used to turn these rows into PENDING_PREPARATION. It is removed:
    // originals and (should one ever reappear) unmigrated rows stay out of the queue.
    expect(getEffectivePreparationStatus('EXCHANGED', {})).toBe('EXCHANGED');
    expect(getEffectivePreparationStatus('EXCHANGED', REPLACEMENT_METADATA)).toBe('EXCHANGED');
    expect(normalizePreparationStage('EXCHANGED')).toBeNull();
  });

  it('leaves every other terminal status untouched', () => {
    for (const status of ['DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED']) {
      expect(getEffectivePreparationStatus(status, REPLACEMENT_METADATA)).toBe(status);
    }
  });
});

describe('preparation queue row — «استبدال» as a work type, not a status (task 69cc5d36)', () => {
  const buildRow = (metadata) =>
    mapRegularOrderToSimple({
      orderNumber: 'ORD-000002-222',
      status: 'PENDING_PREPARATION',
      metadata,
      customer: { name: 'عميل', phone: '01000000000' },
      items: [],
      shipments: [],
    });

  it('exposes workType=exchange + requestType + the original order link', () => {
    const mapped = buildRow(REPLACEMENT_METADATA);

    expect(mapped.workType).toBe('exchange');
    expect(mapped.requestType).toBe('exchange');
    expect(mapped.originalOrderId).toBe('orig-1');
    expect(mapped.originalOrderNumber).toBe('ORD-000001-111');
  });

  it('treats a legacy row identified only by originalOrderId as an exchange too', () => {
    const mapped = buildRow({ originalOrderId: 'orig-1' });

    expect(mapped.workType).toBe('exchange');
  });

  it('marks a normal order as workType=normal', () => {
    const mapped = buildRow({});

    expect(mapped.workType).toBe('normal');
    expect(mapped.requestType).toBeNull();
  });
});

describe('exchange duplicate guard survives the migration (task 69cc5d36)', () => {
  it('rejects a second open exchange with OPEN_EXCHANGE_ALREADY_EXISTS', () => {
    const verdict = buildOpenExchangeVerdict([
      { id: 'order-2', orderNumber: 'ORD-000002-222', status: 'PENDING_PREPARATION' },
    ]);

    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe('OPEN_EXCHANGE_ALREADY_EXISTS');
  });

  it('finds the migrated replacement as an open exchange (only terminal statuses are excluded)', async () => {
    let capturedSql = '';
    const prisma = {
      $queryRawUnsafe: async (sql) => {
        capturedSql = sql;
        return [{ id: 'order-2', orderNumber: 'ORD-000002-222', status: 'PENDING_PREPARATION' }];
      },
    };

    const rows = await findOpenExchange(prisma, 'company-1', 'orig-1', 'ORD-000001-111');

    expect(rows).toHaveLength(1);
    expect(capturedSql).toContain("o.\"status\"::text NOT IN ('DELIVERED', 'CANCELLED', 'LOST')");
    expect(capturedSql).not.toContain('EXCHANGED');
  });

  it('maps the verdict to HTTP 400 in both creation paths', () => {
    for (const relativePath of ['routes/enhancedOrders.js', 'services/enhancedOrderService.js']) {
      const source = readSource(relativePath);
      const index = source.indexOf('code: openExchangeVerdict.code');

      expect(index).toBeGreaterThan(-1);
      // 400 sits either before (service result) or after (route res.status) the code.
      const context = source.slice(Math.max(0, index - 200), index + 200);
      expect(context).toMatch(/statusCode:\s*400|res\.status\(400\)/);
    }
  });
});

describe('the temporary exchange exception is gone from the code (task 69cc5d36)', () => {
  const source = readSource('services/preparationQueueService.js');

  it('has no exchangeExceptionSql / isExchangeReplacement identifiers', () => {
    expect(source).not.toMatch(/exchangeException/i);
    expect(source).not.toMatch(/isExchangeReplacement/);
  });

  it('has no SQL branch that ORs EXCHANGED into the preparation candidate/stage query', () => {
    expect(source).not.toMatch(/"status"::text\s*=\s*'EXCHANGED'/);
    expect(source).not.toMatch(/OR\s+[^;]{0,160}'EXCHANGED'/);
  });

  it('still treats EXCHANGED as a terminal preparation status', () => {
    // The status must stay in the terminal list — the ORIGINAL order relies on it.
    expect(source).toMatch(/'EXCHANGED'/);
  });
});
