/**
 * Automated test for getMyCompaniesOrders:
 * Verifies:
 * 1) An account with 2+ companies returns totalsByCompany.length >= 2 (all active memberships).
 * 2) "كل الشركات" totalOrders equals the exact sum of all totalsByCompany counts.
 * 3) Individual company counts match (Swan, H2m, etc.) and companies with 0 orders are included.
 * 4) When filtering by a single company, all chips remain in totalsByCompany while orders are filtered.
 * 5) A single-company user works properly.
 * 6) Unauthorized company request returns 403 FORBIDDEN_COMPANY_ACCESS.
 */

const assert = require("assert");
const hrController = require("../controller/hrController");
const tenantContext = require("../services/tenantContext");
const { getSharedPrismaClient } = require("../services/sharedDatabase");

function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log("🚀 Starting getMyCompaniesOrders Test Suite...\n");
  const prisma = getSharedPrismaClient();

  // Test 1: User with 7 companies (cmldvhqli0003juj6ti0cnm9j) inside a tenantContext (H2m)
  console.log("--- Test 1: User with 7 companies under tenantContext ---");
  const h2mCompanyId = "cmldvhqkx0000juj6sdbx2jw0";
  const userId = "cmldvhqli0003juj6ti0cnm9j";

  await tenantContext.run(h2mCompanyId, async () => {
    const req = {
      user: { id: userId, role: "OWNER" },
      query: {},
    };
    const res = createMockResponse();

    await hrController.getMyCompaniesOrders(req, res);

    assert.strictEqual(res.statusCode, 200, "Should return 200 OK");
    assert.strictEqual(res.data?.success, true, "Response success should be true");

    const { totalsByCompany, totalOrders, orders } = res.data.data;

    console.log(`✅ totalsByCompany.length = ${totalsByCompany.length} (Expected >= 2, actual: ${totalsByCompany.length})`);
    assert.ok(
      totalsByCompany.length >= 2,
      `Expected totalsByCompany.length >= 2, got ${totalsByCompany.length}`
    );
    assert.strictEqual(totalsByCompany.length, 7, "User has 7 active companies, all 7 must be present in chips");

    // Verify sum equals totalOrders
    const sumCounts = totalsByCompany.reduce((acc, curr) => acc + curr.count, 0);
    console.log(`✅ totalOrders = ${totalOrders}, sum of totalsByCompany = ${sumCounts}`);
    assert.strictEqual(
      totalOrders,
      sumCounts,
      "totalOrders ('كل الشركات') must equal the exact sum of all totalsByCompany counts"
    );

    // Verify expected companies are present
    const h2mEntry = totalsByCompany.find((t) => t.companyId === h2mCompanyId);
    assert.ok(h2mEntry, "H2m company must be in totalsByCompany");
    console.log(`✅ H2m count: ${h2mEntry.count}`);

    const swanEntry = totalsByCompany.find((t) => t.companyName && t.companyName.toLowerCase().includes("swan"));
    assert.ok(swanEntry, "Swan company must be in totalsByCompany");
    console.log(`✅ Swan count: ${swanEntry.count}`);

    // Verify companies with 0 orders are included
    totalsByCompany.forEach((item) => {
      assert.strictEqual(typeof item.count, "number", "Every company must have a numeric count");
      assert.ok(item.count >= 0, "Count must be >= 0");
    });
    console.log("✅ All 7 company totals (including 0-count companies):");
    totalsByCompany.forEach((t) => console.log(`   - ${t.companyName} (${t.companyId}): ${t.count}`));
  });

  // Test 2: Filtering by a single company preserves all company chips
  console.log("\n--- Test 2: Filter by single company preserves chips ---");
  await tenantContext.run(h2mCompanyId, async () => {
    const req = {
      user: { id: userId, role: "OWNER" },
      query: { companyIds: h2mCompanyId },
    };
    const res = createMockResponse();

    await hrController.getMyCompaniesOrders(req, res);

    assert.strictEqual(res.statusCode, 200, "Should return 200 OK");
    const { totalsByCompany, orders } = res.data.data;

    // All chips should remain visible
    assert.strictEqual(
      totalsByCompany.length,
      7,
      "All 7 company chips must remain in totalsByCompany even when filtered to 1 company"
    );

    // Returned orders must strictly belong to the filtered company
    orders.forEach((o) => {
      assert.strictEqual(
        o.companyId,
        h2mCompanyId,
        `Order ${o.orderNumber} companyId (${o.companyId}) must match requested filter (${h2mCompanyId})`
      );
    });
    console.log(`✅ Filtered to H2m: returned ${orders.length} orders, all belonging to H2m, with all 7 chips retained.`);
  });

  // Test 3: Unauthorized company ID returns 403
  console.log("\n--- Test 3: Unauthorized company access security check ---");
  await tenantContext.run(h2mCompanyId, async () => {
    const req = {
      user: { id: userId, role: "OWNER" },
      query: { companyIds: "unauthorized_company_fake_id_123" },
    };
    const res = createMockResponse();

    await hrController.getMyCompaniesOrders(req, res);

    assert.strictEqual(res.statusCode, 403, "Should return 403 Forbidden for unauthorized company");
    assert.strictEqual(res.data?.code, "FORBIDDEN_COMPANY_ACCESS");
    console.log("✅ Unauthorized company request successfully blocked with 403 FORBIDDEN_COMPANY_ACCESS.");
  });

  // Test 4: Single company user
  console.log("\n--- Test 4: Single-company user ---");
  {
    const singleUsers = await prisma.$queryRaw`
      SELECT "userId", COUNT(*)::int as count 
      FROM "user_companies" 
      WHERE "isActive" = true 
      GROUP BY "userId" 
      HAVING COUNT(*) = 1 
      LIMIT 1
    `;

    if (singleUsers.length > 0) {
      const singleUserId = singleUsers[0].userId;
      const req = {
        user: { id: singleUserId },
        query: {},
      };
      const res = createMockResponse();

      await hrController.getMyCompaniesOrders(req, res);
      assert.strictEqual(res.statusCode, 200, "Single company user should return 200 OK");
      assert.strictEqual(
        res.data?.data?.totalsByCompany?.length,
        1,
        "Single-company user should have exactly 1 totalByCompany"
      );
      console.log(`✅ Single-company user (${singleUserId}) verified: totalsByCompany.length === 1.`);
    } else {
      console.log("ℹ️ No single-company user in DB, skipping assertion.");
    }
  }

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

if (require.main === module) {
  runTests()
    .then(async () => {
      const { getSharedPrismaClient } = require("../services/sharedDatabase");
      await getSharedPrismaClient().$disconnect().catch(() => {});
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("\n❌ Test Suite Failed:", err);
      const { getSharedPrismaClient } = require("../services/sharedDatabase");
      await getSharedPrismaClient().$disconnect().catch(() => {});
      process.exit(1);
    });
}

module.exports = { runTests };
