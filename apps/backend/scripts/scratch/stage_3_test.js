const { getCompanyFromSubdomain } = require('./middleware/companyMiddleware');
const sharedDB = require('./services/sharedDatabase');

async function runTest() {
    console.log('🚀 Starting Robust Stage 3 Verification...');
    
    // Ensure we know what mainDomain we are using
    const mainDomain = (process.env.MAIN_DOMAIN || 'maxp.online').toLowerCase();
    process.env.MAIN_DOMAIN = mainDomain; // Force consistency
    console.log(`ℹ️ Using MAIN_DOMAIN: ${mainDomain}`);

    const mockCompany = {
        id: 'clv_test_123',
        name: 'Test Store',
        slug: 'test-store',
        customDomain: 'mystore.com',
        isActive: true
    };

    sharedDB.safeQuery = async (queryFn) => mockCompany;

    const tests = [
        { name: 'Subdomain (lower)', host: `test-store.${mainDomain}` },
        { name: 'Subdomain (upper)', host: `TEST-STORE.${mainDomain.toUpperCase()}` },
        { name: 'Subdomain (mixed)', host: `Test-Store.${mainDomain}` },
        { name: 'Custom Domain (lower)', host: 'mystore.com' },
        { name: 'Custom Domain (upper)', host: 'MYSTORE.COM' },
        { name: 'Subdomain with www', host: `www.test-store.${mainDomain}` },
    ];

    for (const test of tests) {
        console.log(`\n--- Testing: ${test.name} (${test.host}) ---`);
        const req = {
            headers: { 'host': test.host },
            body: {},
            query: {}
        };
        
        await getCompanyFromSubdomain(req, {}, () => {});
        
        if (req.companyId === mockCompany.id) {
            console.log(`✅ SUCCESS: Identified companyId: ${req.companyId}`);
        } else {
            console.error(`❌ FAILED: IDENTIFICATION FAILED.`);
            console.log(`   Host used: ${test.host}`);
            console.log(`   Resulting companyId: ${req.companyId}`);
        }
    }

    console.log('\n--- Final Check: Discrepancy Observation ---');
    console.log('Note: server.js uses "mokhtarelhenawy.online" as default if MAIN_DOMAIN is unset.');
    console.log('Note: companyMiddleware.js uses "maxp.online" as default if MAIN_DOMAIN is unset.');
    
    process.exit(0);
}

runTest();
