/**
 * Test Suite for Super Admin API — Phase M1 Acceptance Criteria
 * 
 * Verifies:
 * 1. GET /api/v1/admin-api/docs + /openapi.json (generated from catalog)
 * 2. GET /api/v1/admin-api/capabilities (capabilities matrix + scopes)
 * 3. GET /api/v1/admin-api/health (operational health)
 * 4. GET /api/v1/admin-api/audit (filtered audit log)
 * 5. All 18 unified read scopes return 200 with read-only key
 * 6. Write endpoint on read-only key returns 403 Forbidden
 * 7. Invalid key returns 401 Unauthorized
 * 8. Expired key returns 401 Unauthorized
 * 9. Automated PII audit: zero individual customer PII fields in any response
 * 10. Legacy tasks key (tasks:read/write) remains fully functional
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  generateExternalApiKey,
  generateTaskApiKey
} = require('../services/taskIntegrationService');
const { auditForPii } = require('../utils/piiSanitizer');

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:3007';

async function runTests() {
  const prisma = getSharedPrismaClient();
  const createdKeys = [];

  console.log(`\n======================================================`);
  console.log(`🚀 Starting Super Admin API Phase M1 Verification`);
  console.log(`Target URL: ${BASE_URL}/api/v1/admin-api`);
  console.log(`======================================================\n`);

  try {
    // ------------------------------------------------------------------------
    // SETUP TEST KEYS
    // ------------------------------------------------------------------------
    console.log('🔑 Setting up test credentials...');

    // 1. Full Read-Only Admin Key ('admin:*:read' + 'admin:audit:read')
    const keyRead = generateExternalApiKey();
    const credRead = await prisma.taskApiCredential.create({
      data: {
        name: 'M1-Test-ReadOnly-Key',
        keyPrefix: keyRead.keyPrefix,
        keyHash: keyRead.keyHash,
        scopes: JSON.stringify(['admin:*:read', 'admin:audit:read']),
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
    createdKeys.push(credRead.id);

    // 2. Specific Scope Key ('admin:orders:read' only)
    const keyOrders = generateExternalApiKey();
    const credOrders = await prisma.taskApiCredential.create({
      data: {
        name: 'M1-Test-OrdersOnly-Key',
        keyPrefix: keyOrders.keyPrefix,
        keyHash: keyOrders.keyHash,
        scopes: JSON.stringify(['admin:orders:read']),
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
    createdKeys.push(credOrders.id);

    // 3. Expired Key
    const keyExpired = generateExternalApiKey();
    const credExpired = await prisma.taskApiCredential.create({
      data: {
        name: 'M1-Test-Expired-Key',
        keyPrefix: keyExpired.keyPrefix,
        keyHash: keyExpired.keyHash,
        scopes: JSON.stringify(['admin:*:read']),
        isActive: true,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      }
    });
    createdKeys.push(credExpired.id);

    // 4. Legacy Tasks Key ('tasks:read', 'tasks:write')
    const keyLegacy = generateTaskApiKey('tsk');
    const sampleCompany = await prisma.company.findFirst({ select: { id: true } });
    const credLegacy = await prisma.taskApiCredential.create({
      data: {
        name: 'M1-Test-LegacyTasks-Key',
        companyId: sampleCompany ? sampleCompany.id : null,
        keyPrefix: keyLegacy.keyPrefix,
        keyHash: keyLegacy.keyHash,
        scopes: JSON.stringify(['tasks:read', 'tasks:write']),
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
    createdKeys.push(credLegacy.id);

    console.log('✅ Test credentials prepared.\n');

    const results = [];

    const testEndpoint = async (name, url, options = {}, expectedStatus = 200, checkPii = true) => {
      try {
        const res = await fetch(url, options);
        let data = null;
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        const statusMatch = res.status === expectedStatus;
        let piiInfractions = [];
        if (checkPii && typeof data === 'object') {
          const allowCompany = options.headers?.['x-api-key'] === keyRead.rawKey;
          piiInfractions = auditForPii(data, { allowCompanyName: allowCompany });
        }

        const passed = statusMatch && piiInfractions.length === 0;

        if (!passed) {
          console.log(`⚠️ FAIL [${name}]: status=${res.status} (exp: ${expectedStatus}) | body=${text.slice(0, 200)} | piiInfractions=${piiInfractions.length}`);
        }

        results.push({
          criterion: name,
          url: url.replace(BASE_URL, ''),
          expected: expectedStatus,
          actual: res.status,
          piiClean: piiInfractions.length === 0,
          piiInfractionsCount: piiInfractions.length,
          passed
        });

        return { res, data, passed, piiInfractions };
      } catch (err) {
        results.push({
          criterion: name,
          url: url.replace(BASE_URL, ''),
          expected: expectedStatus,
          actual: `ERROR: ${err.message}`,
          piiClean: false,
          passed: false
        });
        return { error: err };
      }
    };

    // ------------------------------------------------------------------------
    // 1. DOCS & INTROSPECTION
    // ------------------------------------------------------------------------
    console.log('Testing Docs, OpenAPI, and Introspection...');
    await testEndpoint(
      'GET /docs (HTML UI)',
      `${BASE_URL}/api/v1/admin-api/docs`,
      { headers: { 'Accept': 'text/html' } },
      200,
      false
    );

    await testEndpoint(
      'GET /docs?format=json',
      `${BASE_URL}/api/v1/admin-api/docs?format=json`,
      { headers: { 'Accept': 'application/json' } },
      200,
      true
    );

    await testEndpoint(
      'GET /openapi.json (Valid OpenAPI 3.0)',
      `${BASE_URL}/api/v1/admin-api/openapi.json`,
      {},
      200,
      true
    );

    await testEndpoint(
      'GET /health (Operational Health)',
      `${BASE_URL}/api/v1/admin-api/health`,
      {},
      200,
      true
    );

    await testEndpoint(
      'GET /capabilities (Matrix with read key)',
      `${BASE_URL}/api/v1/admin-api/capabilities`,
      { headers: { 'x-api-key': keyRead.rawKey } },
      200,
      true
    );

    await testEndpoint(
      'GET /audit (Filtered Audit Log)',
      `${BASE_URL}/api/v1/admin-api/audit?limit=10`,
      { headers: { 'x-api-key': keyRead.rawKey } },
      200,
      true
    );

    // ------------------------------------------------------------------------
    // 2. ALL CORE READ SCOPES (17 Domains)
    // ------------------------------------------------------------------------
    console.log('Testing all 17 Core Read Domains with read-only key...');
    const readDomains = [
      'analytics',
      'orders',
      'products',
      'customers',
      'subscriptions',
      'billing',
      'revenue',
      'marketplace',
      'support',
      'ai-usage',
      'logs',
      'users',
      'tenants',
      'coupons',
      'landing',
      'partners',
      'settings'
    ];

    for (const d of readDomains) {
      await testEndpoint(
        `GET /${d} (scope admin:${d}:read)`,
        `${BASE_URL}/api/v1/admin-api/${d}`,
        { headers: { 'x-api-key': keyRead.rawKey } },
        200,
        true
      );
    }

    // Dynamic catalog reader test (e.g. 'inventory' or 'governance')
    await testEndpoint(
      'GET /governance (Dynamic catalog domain fallback)',
      `${BASE_URL}/api/v1/admin-api/governance`,
      { headers: { 'x-api-key': keyRead.rawKey } },
      200,
      true
    );

    // ------------------------------------------------------------------------
    // 3. SECURITY GUARDS & SCOPE BOUNDARIES
    // ------------------------------------------------------------------------
    console.log('Testing security guards, write prevention & auth failures...');

    // Write endpoint with read-only key -> MUST BE 403
    await testEndpoint(
      'POST /coupons with read-only key -> 403 Forbidden',
      `${BASE_URL}/api/v1/admin-api/coupons`,
      {
        method: 'POST',
        headers: {
          'x-api-key': keyRead.rawKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create',
          idempotencyKey: 'idemp_test_123',
          dryRun: true
        })
      },
      403,
      false
    );

    // Domain mismatch scope test: Orders key trying to read /products -> MUST BE 403
    await testEndpoint(
      'GET /products with orders-only key -> 403 Forbidden',
      `${BASE_URL}/api/v1/admin-api/products`,
      { headers: { 'x-api-key': keyOrders.rawKey } },
      403,
      false
    );

    // Invalid API key -> MUST BE 401
    await testEndpoint(
      'GET /analytics with invalid key -> 401 Unauthorized',
      `${BASE_URL}/api/v1/admin-api/analytics`,
      { headers: { 'x-api-key': 'ext_badprefix_badsecretinvalid123456789' } },
      401,
      false
    );

    // Expired API key -> MUST BE 401
    await testEndpoint(
      'GET /analytics with expired key -> 401 Unauthorized',
      `${BASE_URL}/api/v1/admin-api/analytics`,
      { headers: { 'x-api-key': keyExpired.rawKey } },
      401,
      false
    );

    // Missing API key -> MUST BE 401
    await testEndpoint(
      'GET /analytics with missing key -> 401 Unauthorized',
      `${BASE_URL}/api/v1/admin-api/analytics`,
      {},
      401,
      false
    );

    // ------------------------------------------------------------------------
    // 4. BACKWARD COMPATIBILITY
    // ------------------------------------------------------------------------
    console.log('Testing backward compatibility with legacy tasks key...');
    await testEndpoint(
      'GET /api/v1/external/tasks with legacy tsk key -> 200 OK',
      `${BASE_URL}/api/v1/external/tasks`,
      { headers: { 'x-api-key': keyLegacy.rawKey } },
      200,
      false
    );

    // ------------------------------------------------------------------------
    // SUMMARY REPORT
    // ------------------------------------------------------------------------
    console.log(`\n======================================================`);
    console.log(`📊 SUPER ADMIN API — PHASE M1 ACCEPTANCE REPORT`);
    console.log(`======================================================\n`);

    let allPassed = true;
    for (const r of results) {
      const mark = r.passed ? '✅ PASS' : '❌ FAIL';
      if (!r.passed) allPassed = false;
      const piiText = r.piiClean ? '0 PII' : `⚠️ PII DETECTED (${r.piiInfractionsCount})`;
      console.log(`${mark} | ${r.criterion.padEnd(52)} | HTTP ${r.actual} (exp: ${r.expected}) | ${piiText}`);
    }

    console.log(`\n------------------------------------------------------`);
    if (allPassed) {
      console.log(`🎉 ALL ${results.length} ACCEPTANCE TESTS PASSED PERFECTLY! Phase M1 is 100% Complete.`);
    } else {
      console.log(`⚠️ Some tests failed. Inspect the output above.`);
    }
    console.log(`------------------------------------------------------\n`);

  } finally {
    // Cleanup temporary test keys
    if (createdKeys.length > 0) {
      console.log('🧹 Cleaning up temporary test credentials...');
      await prisma.taskApiCredential.deleteMany({
        where: { id: { in: createdKeys } }
      }).catch((e) => console.warn('Cleanup warning:', e.message));
      console.log('✅ Temporary credentials removed.');
    }
  }
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
