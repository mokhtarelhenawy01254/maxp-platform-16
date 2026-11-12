/**
 * Unit tests for exchange replacements migration runner (Task 69cc5d36).
 *
 * Verifies SQL query contracts, dry-run safety (zero writes), idempotency,
 * transaction execution with audit rows, and drift guard against the reference SQL.
 */

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
}), { virtual: true });

const fs = require('fs');
const path = require('path');

const {
  buildCandidateSql,
  buildPostCheckSql,
  runMigration,
  UPDATE_SQL,
  CHANGED_BY
} = require('../../scripts/one-off/migrate-exchange-replacements-69cc5d36');

const readSource = (relativePath) =>
  fs.readFileSync(path.join(__dirname, '../..', relativePath), 'utf8');

describe('exchange replacement migration (task 69cc5d36)', () => {
  describe('SQL structure & safety guards', () => {
    it('buildCandidateSql contains status, requestType, originalOrderId, empty preparationStatus, and companyId', () => {
      const sql = buildCandidateSql();

      expect(sql).toContain('"status"::text = \'EXCHANGED\'');
      expect(sql).toContain("metadata\"::jsonb->>'requestType' = 'exchange'");
      expect(sql).toContain("metadata\"::jsonb->>'originalOrderId' IS NOT NULL");
      expect(sql).toContain("metadata\"::jsonb->>'preparationStatus' IS NULL");
      expect(sql).toContain("metadata\"::jsonb->>'preparationStatus' = ''");
      expect(sql).toContain('"companyId" =');
    });

    it('never contains UPDATE "orders" without status::text = "EXCHANGED" in the statement', () => {
      const scriptSource = readSource('scripts/one-off/migrate-exchange-replacements-69cc5d36.js');
      const updateMatches = scriptSource.match(/UPDATE\s+"orders"[^;`]*/g) || [];

      expect(updateMatches.length).toBeGreaterThan(0);
      for (const stmt of updateMatches) {
        expect(stmt).toMatch(/status"::text\s*=\s*'EXCHANGED'/);
      }

      expect(UPDATE_SQL).toContain('UPDATE "orders"');
      expect(UPDATE_SQL).toMatch(/status"::text\s*=\s*'EXCHANGED'/);
    });
  });

  describe('dryRun behavior', () => {
    it('executes zero writes and returns migrated: 0 when dryRun=true', async () => {
      const fakePrisma = {
        company: {
          findUnique: jest.fn().mockResolvedValue({ id: 'comp-swan-id', name: 'Swan', slug: 'swan' })
        },
        $queryRawUnsafe: jest.fn().mockResolvedValue([
          { id: 'ord-1', orderNumber: 'ORD-071276-456' },
          { id: 'ord-2', orderNumber: 'ORD-097894-409' },
          { id: 'ord-3', orderNumber: 'ORD-311121-315' },
          { id: 'ord-4', orderNumber: 'ORD-773160-158' }
        ]),
        $executeRawUnsafe: jest.fn(),
        $executeRaw: jest.fn(),
        $transaction: jest.fn()
      };

      const silentLogger = { log: jest.fn(), error: jest.fn() };
      const result = await runMigration({
        prisma: fakePrisma,
        companySlug: 'swan',
        dryRun: true,
        logger: silentLogger
      });

      expect(result.dry_run).toBe(true);
      expect(result.migrated).toBe(0);
      expect(result.selected).toBe(4);
      expect(result.audit_rows).toBe(0);
      expect(result.exitCode).toBe(0);

      expect(fakePrisma.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(fakePrisma.$executeRaw).not.toHaveBeenCalled();
      expect(fakePrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('idempotent execution (0 candidate rows)', () => {
    it('returns audit_rows: 0 and exitCode: 0 when 0 rows match', async () => {
      const fakePrisma = {
        company: {
          findUnique: jest.fn().mockResolvedValue({ id: 'comp-swan-id', name: 'Swan', slug: 'swan' })
        },
        $queryRawUnsafe: jest.fn().mockResolvedValue([]),
        $executeRawUnsafe: jest.fn(),
        $executeRaw: jest.fn(),
        $transaction: jest.fn()
      };

      const silentLogger = { log: jest.fn(), error: jest.fn() };
      const result = await runMigration({
        prisma: fakePrisma,
        companySlug: 'swan',
        dryRun: false,
        logger: silentLogger
      });

      expect(result.exitCode).toBe(0);
      expect(result.selected).toBe(0);
      expect(result.migrated).toBe(0);
      expect(result.audit_rows).toBe(0);
      expect(result.remaining_exchanged_replacements).toBe(0);

      expect(fakePrisma.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(fakePrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('apply mode with 4 candidate rows', () => {
    it('migrates 4 rows with audit_rows: 4 and changedBy="hermes-migration:task-69cc5d36"', async () => {
      const executedAuditWrites = [];
      const executedOrderUpdates = [];

      const mockTx = {
        $executeRawUnsafe: jest.fn(async (sql, ...params) => {
          if (sql.includes('INSERT INTO "OrderStatusHistory"')) {
            executedAuditWrites.push({ sql, params });
            return 1;
          } else if (sql.includes('UPDATE "orders"')) {
            executedOrderUpdates.push({ sql, params });
            return 4;
          }
          return 1;
        })
      };

      const fakePrisma = {
        company: {
          findUnique: jest.fn().mockResolvedValue({ id: 'comp-swan-id', name: 'Swan', slug: 'swan' })
        },
        $queryRawUnsafe: jest.fn()
          .mockResolvedValueOnce([
            { id: 'id-1', orderNumber: 'ORD-071276-456' },
            { id: 'id-2', orderNumber: 'ORD-097894-409' },
            { id: 'id-3', orderNumber: 'ORD-311121-315' },
            { id: 'id-4', orderNumber: 'ORD-773160-158' }
          ])
          .mockResolvedValueOnce([{ count: 0 }]),
        $transaction: jest.fn(async (cb) => cb(mockTx))
      };

      const silentLogger = { log: jest.fn(), error: jest.fn() };
      const result = await runMigration({
        prisma: fakePrisma,
        companySlug: 'swan',
        dryRun: false,
        logger: silentLogger
      });

      expect(result.exitCode).toBe(0);
      expect(result.selected).toBe(4);
      expect(result.migrated).toBe(4);
      expect(result.audit_rows).toBe(4);
      expect(result.remaining_exchanged_replacements).toBe(0);

      expect(fakePrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(executedAuditWrites).toHaveLength(4);
      expect(executedOrderUpdates).toHaveLength(1);

      expect(result.auditRows).toHaveLength(4);
      for (const audit of result.auditRows) {
        expect(audit.changedBy).toBe('hermes-migration:task-69cc5d36');
        expect(audit.status).toBe('PENDING_PREPARATION');
        expect(audit.oldStatus).toBe('EXCHANGED');
        expect(audit.id).toMatch(/^migr_/);
      }
    });
  });

  describe('drift guard vs reference SQL migration', () => {
    it('contains identical condition fragments as 20261102_exchange_replacement_preparation.sql', () => {
      const referenceSql = readSource('scripts/migrations/20261102_exchange_replacement_preparation.sql');

      expect(referenceSql).toMatch(/"status"::text\s*=\s*'EXCHANGED'/);
      expect(referenceSql).toMatch(/metadata"::jsonb->>'requestType'\s*=\s*'exchange'/);
      expect(referenceSql).toMatch(/metadata"::jsonb->>'originalOrderId'\s+IS NOT NULL/);
      expect(referenceSql).toMatch(/metadata"::jsonb->>'preparationStatus'\s+IS NULL/);
    });
  });
});
