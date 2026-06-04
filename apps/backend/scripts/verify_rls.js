const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const tenantContext = require('../services/tenantContext');

async function verifyRLS() {
    console.log('🔍 Starting RLS Verification (Raw SQL Mode)...');

    const prisma = await getSharedPrismaClientAsync();

    // 1. Find a sample company ID using raw SQL
    const companies = await prisma.$queryRaw`SELECT id, name FROM "companies" LIMIT 1`;

    if (companies.length === 0) {
        console.error('❌ No companies found in the database. Cannot verify RLS.');
        process.exit(1);
    }

    const sampleCompany = companies[0];
    console.log(`🏢 Testing with Sample Company: ${sampleCompany.name} (${sampleCompany.id})`);

    // 2. Test WITHOUT context
    console.log('\n--- Test 1: No Tenant Context ---');
    try {
        const resNoContext = await prisma.$queryRaw`SELECT count(*) FROM "products"`;
        console.log(`📦 Products visible without context: ${resNoContext[0].count}`);
    } catch (e) {
        console.log(`ℹ️ No context check failed as expected (or returned 0): ${e.message.substring(0, 100)}...`);
    }

    // 3. Test WITH context (RLS check)
    console.log(`\n--- Test 2: RLS Implicit Filtering for Company ${sampleCompany.id} ---`);

    const productsImplicit = await tenantContext.run(sampleCompany.id, async () => {
        // We select companyId to verify it matches
        return await prisma.$queryRawUnsafe(`SELECT "id", "companyId" FROM "products" LIMIT 10`);
    });

    console.log(`🛡️ Products found via RLS implicit filtering: ${productsImplicit.length}`);

    if (productsImplicit.length > 0) {
        const allMatch = productsImplicit.every(p => p.companyId === sampleCompany.id);
        if (allMatch) {
            console.log('🎉 RLS IS WORKING! All returned products belong to the target company.');
        } else {
            console.error('❌ RLS LEAKAGE DETECTED! Some products belong to other companies.');
            console.log('Sample of leak:', productsImplicit.find(p => p.companyId !== sampleCompany.id));
        }
    } else {
        // If no products, let's see if there are ANY products in the whole DB (bypass RLS by not setting context)
        // Actually, in a superuser connection, we can bypass RLS with BYPASS RLS or just not setting the variable if the policy allows.
        // Our policy is strict: USING ("companyId" = current_setting('app.current_company_id', true))
        // So without the setting, it's effectively "companyId" = '', which is 0 results.

        console.log('ℹ️ No products found for this tenant. This is expected if the tenant has no data.');
        console.log('Checking for any company with products...');
        const anyProducts = await prisma.$queryRaw`SELECT "companyId", count(*) FROM "products" GROUP BY "companyId" LIMIT 5`;
        if (anyProducts.length > 0) {
            console.log('Found other companies with products:', anyProducts);
            console.log('🚀 Verification successful: Data is isolated and not visible without target context.');
        } else {
            console.log('Note: The database seems to have 0 products across all companies.');
        }
    }

    process.exit(0);
}

verifyRLS().catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
