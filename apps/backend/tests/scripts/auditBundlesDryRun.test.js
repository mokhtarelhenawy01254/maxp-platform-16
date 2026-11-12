/**
 * Unit & streaming/timeout tests — audit-bundles-dry-run.js (Task 621f2800)
 */

const { PassThrough } = require('stream');
const path = require('path');

const {
  DEFAULT_OPTIONS,
  parseOptions,
  resolveDatabaseTarget,
  buildConnectionUrl,
  runAudit,
} = require('../../scripts/one-off/audit-bundles-dry-run');

function createCaptureStream() {
  const chunks = [];
  const stream = new PassThrough();
  stream.on('data', (chunk) => chunks.push(chunk.toString('utf8')));
  return {
    stream,
    getChunks: () => chunks,
    getText: () => chunks.join(''),
  };
}

function createMockPrisma(handlers = {}) {
  const executedSql = [];
  const queryCalls = [];

  const dispatchQuery = async (sql, ...params) => {
    queryCalls.push({ sql, params });
    if (handlers.onQuery) {
      return handlers.onQuery(sql, params);
    }
    if (sql.includes('FROM "app_bundles"')) {
      return [
        { id: 'b1', slug: 'messaging-bundle', name: 'Messaging', isActive: true, appIds: ['unified-inbox'] },
        { id: 'b2', slug: 'orphan-bundle', name: 'Orphan', isActive: true, appIds: ['orphan-app'] },
      ];
    }
    if (sql.includes('GROUP BY 1')) {
      return [
        { status: 'ACTIVE', count: 2 },
        { status: 'TRIAL', count: 1 },
      ];
    }
    if (sql.includes('COUNT(*)::int AS total FROM "platform_subscriptions"')) {
      return [{ total: 3 }];
    }
    if (sql.includes('SELECT DISTINCT "companyId" FROM "platform_subscriptions"')) {
      return [{ companyId: 'comp-1' }, { companyId: 'comp-2' }];
    }
    if (sql.includes('FROM "marketplace_apps"')) {
      return [
        { id: 'app-1', slug: 'unified-inbox' },
        { id: 'app-2', slug: 'orphan-app' },
      ];
    }
    if (sql.includes('FROM "company_apps"')) {
      return [{ companyId: 'comp-1', slug: 'unified-inbox' }];
    }
    if (sql.includes('information_schema.columns')) {
      return [{ column_name: 'bundleSlug' }];
    }
    if (sql.includes('FROM "lp_pages"')) {
      return [{ total: 11, with_bundle: 4 }];
    }
    throw new Error(`Unexpected SQL in mock: ${sql}`);
  };

  const tx = {
    $executeRawUnsafe: jest.fn(async (sql) => {
      executedSql.push(sql);
      return 0;
    }),
    $queryRawUnsafe: jest.fn(dispatchQuery),
  };

  const prisma = {
    $transaction: jest.fn(async (fn, opts) => {
      executedSql.push({ txOpts: opts });
      return fn(tx);
    }),
    $queryRawUnsafe: jest.fn(dispatchQuery),
    $disconnect: jest.fn(async () => {}),
    _executedSql: executedSql,
    _queryCalls: queryCalls,
  };

  return prisma;
}

describe('audit-bundles-dry-run.js', () => {
  const backendRoot = path.resolve(__dirname, '../..');

  describe('parseOptions & database target resolution', () => {
    it('parses defaults, CLI timeout flags, --help, and env overrides', () => {
      expect(parseOptions([], {})).toEqual({ ...DEFAULT_OPTIONS, help: false });

      const fromFlags = parseOptions(
        ['--json', '--quiet', '--timeout-ms=15000', '--query-timeout-ms', '4000', '--lock-timeout-ms=1200', '--connect-timeout-ms=5000'],
        {}
      );
      expect(fromFlags).toEqual({
        json: true,
        ndjson: false,
        quiet: true,
        help: false,
        totalTimeoutMs: 15000,
        queryTimeoutMs: 4000,
        lockTimeoutMs: 1200,
        connectTimeoutMs: 5000,
      });

      expect(parseOptions(['--help'], {}).help).toBe(true);
      expect(parseOptions(['-h'], {}).help).toBe(true);

      const fromEnv = parseOptions([], {
        AUDIT_TIMEOUT_MS: '20000',
        AUDIT_QUERY_TIMEOUT_MS: '6000',
        AUDIT_LOCK_TIMEOUT_MS: '2500',
        AUDIT_CONNECT_TIMEOUT_MS: '8000',
      });
      expect(fromEnv.totalTimeoutMs).toBe(20000);
      expect(fromEnv.queryTimeoutMs).toBe(6000);
      expect(fromEnv.lockTimeoutMs).toBe(2500);
      expect(fromEnv.connectTimeoutMs).toBe(8000);
    });

    it('rejects non-positive, unknown, or mutually exclusive flags (fail-closed)', () => {
      expect(() => parseOptions(['--timeout-ms=0'], {})).toThrow();
      expect(() => parseOptions(['--query-timeout-ms=abc'], {})).toThrow();
      expect(() => parseOptions(['--lock-timeout-ms=-5'], {})).toThrow();
      expect(() => parseOptions(['--connect-timeout-ms'], {})).toThrow();
      expect(() => parseOptions(['--timout-ms=5000'], {})).toThrow();
      expect(() => parseOptions(['--json', '--ndjson'], {})).toThrow();
    });

    it('prefers direct POSTGRES_URL over PG_BOUNCER_URL, supports DATABASE_URL fallback and PG_BOUNCER_PREPARED=1', () => {
      const targetDirect = resolveDatabaseTarget({
        POSTGRES_URL: 'postgresql://u:p@localhost:5432/maxp',
        PG_BOUNCER_URL: 'postgresql://u:p@127.0.0.1:6432/maxp',
      });
      expect(targetDirect.source).toBe('POSTGRES_URL');
      expect(targetDirect.usingPgBouncer).toBe(false);

      const targetDatabaseUrl = resolveDatabaseTarget({
        DATABASE_URL: 'postgresql://u:p@localhost:5432/maxp',
        PG_BOUNCER_URL: 'postgresql://u:p@127.0.0.1:6432/maxp',
      });
      expect(targetDatabaseUrl.source).toBe('DATABASE_URL');
      expect(targetDatabaseUrl.usingPgBouncer).toBe(false);

      const directUrl = new URL(
        buildConnectionUrl(targetDirect.url, { usingPgBouncer: false, connectTimeoutMs: 7500 })
      );
      expect(directUrl.searchParams.get('connection_limit')).toBe('1');
      expect(directUrl.searchParams.get('connect_timeout')).toBe('8');
      expect(directUrl.searchParams.get('pool_timeout')).toBe('8');
      expect(directUrl.searchParams.get('pgbouncer')).toBeNull();

      const targetBouncer = resolveDatabaseTarget({
        PG_BOUNCER_URL: 'postgresql://u:p@127.0.0.1:6432/maxp',
      });
      expect(targetBouncer.source).toBe('PG_BOUNCER_URL');
      expect(targetBouncer.usingPgBouncer).toBe(true);
      const bouncerUrl = new URL(
        buildConnectionUrl(targetBouncer.url, { usingPgBouncer: true, connectTimeoutMs: 5000 })
      );
      expect(bouncerUrl.searchParams.get('pgbouncer')).toBe('true');

      const bouncerPreparedUrl = new URL(
        buildConnectionUrl(targetBouncer.url, { usingPgBouncer: true, connectTimeoutMs: 5000, pgBouncerPrepared: true })
      );
      expect(bouncerPreparedUrl.searchParams.get('pgbouncer')).toBeNull();
    });
  });

  describe('read-only transaction guards, streaming, and timeouts', () => {
    it('runs every query inside a READ ONLY transaction with lock_timeout and statement_timeout', async () => {
      const prisma = createMockPrisma();
      const stdout = createCaptureStream();
      const stderr = createCaptureStream();

      const result = await runAudit({
        prisma,
        backendRoot,
        stdout: stdout.stream,
        stderr: stderr.stream,
        options: {
          json: true,
          lockTimeoutMs: 2222,
          queryTimeoutMs: 7777,
          totalTimeoutMs: 25000,
        },
      });

      expect(result.exitCode).toBe(0);
      expect(prisma.$transaction).toHaveBeenCalledTimes(8);
      expect(prisma._executedSql).toContain('SET TRANSACTION READ ONLY');
      expect(prisma._executedSql).toContain("SET LOCAL lock_timeout = '2222ms'");
      expect(prisma._executedSql).toContain("SET LOCAL statement_timeout = '7777ms'");

      const companyAppsCall = prisma._queryCalls.find((c) => c.sql.includes('FROM "company_apps"'));
      expect(companyAppsCall).toBeDefined();
      expect(companyAppsCall.params).toEqual([['comp-1', 'comp-2']]);

      const parsed = JSON.parse(stdout.getText());
      expect(parsed.bundles.total).toBe(2);
      expect(parsed.verdict.safeToCleanCount).toBe(1);
      expect(stderr.getText()).toContain('[audit] app_bundles OK');
      expect(stderr.getText()).toContain('[audit] lp_pages OK');
    });

    it('streams human-readable output incrementally before later queries complete', async () => {
      const out = createCaptureStream();
      const err = createCaptureStream();
      let sawStep1WhileStep2Pending = false;

      const prisma = createMockPrisma({
        onQuery: async (sql) => {
          if (sql.includes('FROM "app_bundles"')) {
            return [{ id: 'b1', slug: 'messaging-bundle', name: 'Messaging', isActive: true, appIds: ['unified-inbox'] }];
          }
          if (sql.includes('GROUP BY 1')) {
            // At this moment step 1 must already have streamed to stdout
            sawStep1WhileStep2Pending = out.getText().includes('[1/6] الباقات');
            return [{ status: 'ACTIVE', count: 1 }];
          }
          if (sql.includes('COUNT(*)::int AS total FROM "platform_subscriptions"')) return [{ total: 1 }];
          if (sql.includes('SELECT DISTINCT "companyId"')) return [];
          if (sql.includes('FROM "marketplace_apps"')) return [{ id: 'a1', slug: 'unified-inbox' }];
          if (sql.includes('information_schema.columns')) return [];
          return [];
        },
      });

      const result = await runAudit({
        prisma,
        backendRoot,
        stdout: out.stream,
        stderr: err.stream,
        options: { json: false },
      });

      expect(result.exitCode).toBe(0);
      expect(sawStep1WhileStep2Pending).toBe(true);
      expect(out.getText()).toContain('[6/6] صفحات الهبوط');
      expect(out.getText()).toContain('مفيش أي كتابة أو حذف في السكربت ده.');
    });

    it('streams NDJSON events when --ndjson is enabled', async () => {
      const out = createCaptureStream();
      const err = createCaptureStream();
      const prisma = createMockPrisma();

      const result = await runAudit({
        prisma,
        backendRoot,
        stdout: out.stream,
        stderr: err.stream,
        options: { ndjson: true },
      });

      expect(result.exitCode).toBe(0);
      const events = out
        .getText()
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));

      expect(events[0].event).toBe('start');
      expect(events.some((e) => e.event === 'step' && e.step === 'app_bundles')).toBe(true);
      expect(events[events.length - 1].event).toBe('report');
      expect(events[events.length - 1].report.bundles.total).toBe(2);
    });

    it('suppresses stderr progress in --json --quiet mode', async () => {
      const out = createCaptureStream();
      const err = createCaptureStream();
      const prisma = createMockPrisma();

      const result = await runAudit({
        prisma,
        backendRoot,
        stdout: out.stream,
        stderr: err.stream,
        options: { json: true, quiet: true },
      });

      expect(result.exitCode).toBe(0);
      expect(err.getText()).toBe('');
      expect(() => JSON.parse(out.getText())).not.toThrow();
    });

    it('aborts hung $transaction queries on query timeout (fail-closed, exitCode 1)', async () => {
      const out = createCaptureStream();
      const err = createCaptureStream();
      const prisma = {
        $transaction: jest.fn(() => new Promise(() => {})),
      };

      const result = await runAudit({
        prisma,
        backendRoot,
        stdout: out.stream,
        stderr: err.stream,
        options: {
          json: true,
          queryTimeoutMs: 30,
          lockTimeoutMs: 20,
          totalTimeoutMs: 500,
        },
      });

      expect(result.exitCode).toBe(1);
      expect(result.needsForceExit).toBe(true);
      expect(result.report.error).toContain('app_bundles');
      expect(result.report.error).toContain('انتهت المهلة');
      const parsed = JSON.parse(out.getText());
      expect(parsed.error).toContain('انتهت المهلة');
      expect(err.getText()).toContain('ERROR');
    });

    it('enforces overall totalTimeoutMs budget across sequential queries and emits NDJSON error event', async () => {
      const out = createCaptureStream();
      const err = createCaptureStream();
      const prisma = createMockPrisma({
        onQuery: async (sql) => {
          await new Promise((resolve) => setTimeout(resolve, 45));
          if (sql.includes('FROM "app_bundles"')) {
            return [{ id: 'b1', slug: 'messaging-bundle', name: 'Messaging', isActive: true, appIds: ['unified-inbox'] }];
          }
          return [];
        },
      });

      const result = await runAudit({
        prisma,
        backendRoot,
        stdout: out.stream,
        stderr: err.stream,
        options: {
          ndjson: true,
          queryTimeoutMs: 5000,
          lockTimeoutMs: 2000,
          totalTimeoutMs: 50,
        },
      });

      expect(result.exitCode).toBe(1);
      expect(result.needsForceExit).toBe(true);
      const events = out
        .getText()
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      expect(events[0].event).toBe('start');
      expect(events[events.length - 1].event).toBe('error');
      expect(events[events.length - 1].error).toContain('المهلة');
    });

    it('skips company_apps when activeCompanyIds is empty, records missing lp_pages column note, and supports legacy bundle_slug', async () => {
      const outMissing = createCaptureStream();
      const prismaEmpty = createMockPrisma({
        onQuery: async (sql) => {
          if (sql.includes('FROM "app_bundles"')) return [];
          if (sql.includes('GROUP BY 1')) return [];
          if (sql.includes('COUNT(*)::int AS total FROM "platform_subscriptions"')) return [{ total: 0 }];
          if (sql.includes('SELECT DISTINCT "companyId"')) return [];
          if (sql.includes('FROM "marketplace_apps"')) return [];
          if (sql.includes('information_schema.columns')) return [];
          throw new Error(`Should not run query: ${sql}`);
        },
      });

      const resMissing = await runAudit({
        prisma: prismaEmpty,
        backendRoot,
        stdout: outMissing.stream,
        stderr: createCaptureStream().stream,
        options: { json: true, quiet: true },
      });

      expect(resMissing.exitCode).toBe(0);
      expect(prismaEmpty._queryCalls.some((c) => c.sql.includes('FROM "company_apps"'))).toBe(false);
      expect(prismaEmpty._queryCalls.some((c) => c.sql.includes('FROM "lp_pages"'))).toBe(false);
      expect(resMissing.report.landingPages.note).toContain('غير موجود');
      expect(prismaEmpty._queryCalls.find((c) => c.sql.includes('information_schema.columns')).sql).toContain('table_schema = current_schema()');

      const prismaLegacy = createMockPrisma({
        onQuery: async (sql) => {
          if (sql.includes('information_schema.columns')) return [{ column_name: 'bundle_slug' }];
          if (sql.includes('FROM "lp_pages"')) return [{ total: 5, with_bundle: 2 }];
          if (sql.includes('FROM "app_bundles"')) return [];
          if (sql.includes('GROUP BY 1')) return [];
          if (sql.includes('COUNT(*)::int AS total FROM "platform_subscriptions"')) return [{ total: 0 }];
          if (sql.includes('SELECT DISTINCT "companyId"')) return [];
          if (sql.includes('FROM "marketplace_apps"')) return [];
          return [];
        },
      });

      const resLegacy = await runAudit({
        prisma: prismaLegacy,
        backendRoot,
        stdout: createCaptureStream().stream,
        stderr: createCaptureStream().stream,
        options: { json: true, quiet: true },
      });

      expect(resLegacy.exitCode).toBe(0);
      expect(resLegacy.report.landingPages.column).toBe('bundle_slug');
      expect(resLegacy.report.landingPages.total).toBe(5);
      expect(resLegacy.report.landingPages.withBundleSlug).toBe(2);
    });
  });
});
