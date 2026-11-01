/**
 * Unit tests — exchange chain guard + open-exchange guard (task 4b5b8635).
 * المرافق: apps/backend/services/exchangeChainGuard.js
 */

describe('exchange guard — OPEN_EXCHANGE_ALREADY_EXISTS (task 4b5b8635)', () => {
  const {
    findOpenExchange,
    buildOpenExchangeVerdict,
  } = require('../../services/exchangeChainGuard');

  it('rejects a second open exchange for the same original order', async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        { id: 'rep-1', orderNumber: 'ORD-000002-222', status: 'PENDING_PREPARATION' },
      ]),
    };

    const rows = await findOpenExchange(prisma, 'company-1', 'orig-1', 'ORD-000001-111');
    const verdict = buildOpenExchangeVerdict(rows);

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe('OPEN_EXCHANGE_ALREADY_EXISTS');
    expect(verdict.openExchange).toEqual(rows[0]);
  });

  it('allows the exchange when no open replacement exists', async () => {
    const prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([]) };

    const rows = await findOpenExchange(prisma, 'company-1', 'orig-1', null);
    const verdict = buildOpenExchangeVerdict(rows);

    expect(verdict.allowed).toBe(true);
    expect(verdict.code).toBeNull();
  });

  it('does not hit the database when there is no original order id', async () => {
    const prisma = { $queryRawUnsafe: jest.fn() };

    const rows = await findOpenExchange(prisma, 'company-1', null, 'ORD-000001-111');
    const verdict = buildOpenExchangeVerdict(rows);

    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(verdict.allowed).toBe(true);
  });

  it('passes companyId, original id and original number to the query', async () => {
    const prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([]) };

    await findOpenExchange(prisma, 'company-9', 'orig-9', 'ORD-9');

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('metadata"::jsonb->>\'originalOrderId\''),
      'company-9',
      'orig-9',
      'ORD-9'
    );
  });
});

describe('exchange guard — circular chain A→B→A (task 4b5b8635)', () => {
  const {
    evaluateExchangeChain,
    assertExchangeChain,
  } = require('../../services/exchangeChainGuard');

  it('allows a first exchange with no ancestors', () => {
    expect(evaluateExchangeChain({ originalOrderId: 'A', chain: [] })).toEqual({
      allowed: true,
      code: null,
      message: null,
    });
  });

  it('detects a direct cycle A→B→A when an ancestor repeats the original', () => {
    const verdict = evaluateExchangeChain({ originalOrderId: 'A', chain: ['A'] });

    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe('EXCHANGE_CYCLE_DETECTED');
  });

  it('detects a cycle deeper in the chain', () => {
    const verdict = evaluateExchangeChain({ originalOrderId: 'A', chain: ['B', 'C', 'B'] });

    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe('EXCHANGE_CYCLE_DETECTED');
  });

  it('allows a legitimate two-step chain with distinct orders', () => {
    const verdict = evaluateExchangeChain({ originalOrderId: 'A', chain: ['B', 'C'] });

    expect(verdict.allowed).toBe(true);
  });

  it('stops runaway chains beyond maxDepth', () => {
    const verdict = evaluateExchangeChain({
      originalOrderId: 'A',
      chain: ['B', 'C', 'D', 'E'],
      maxDepth: 3,
    });

    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe('EXCHANGE_CHAIN_TOO_DEEP');
  });

  it('requires an original order id', () => {
    const verdict = evaluateExchangeChain({ originalOrderId: null, chain: [] });

    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe('EXCHANGE_ORIGINAL_REQUIRED');
  });

  it('assertExchangeChain reads the chain and blocks a cycle coming from the database', async () => {
    // الجدول بيرجّع: الأصلي A + سلفه B + الجذر A تاني => دائرة
    const prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: 'A' }, { id: 'B' }, { id: 'A' }]),
    };

    const verdict = await assertExchangeChain(prisma, 'company-1', 'A');

    expect(verdict.allowed).toBe(false);
    expect(verdict.code).toBe('EXCHANGE_CYCLE_DETECTED');
  });

  it('assertExchangeChain allows a clean chain', async () => {
    const prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: 'A' }]) };

    const verdict = await assertExchangeChain(prisma, 'company-1', 'A');

    expect(verdict.allowed).toBe(true);
  });

  it('assertExchangeChain fails open when the query throws', async () => {
    const prisma = { $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('db down')) };

    const verdict = await assertExchangeChain(prisma, 'company-1', 'A');

    expect(verdict.allowed).toBe(true);
  });
});
