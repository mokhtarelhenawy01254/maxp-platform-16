const recruitmentService = require('../services/hr/recruitmentService');
const { initializeSharedDatabase } = require('../services/sharedDatabase');

async function test() {
    try {
        process.env.DATABASE_URL = "mysql://u339372869_test2:0165676135Aa%40A@92.113.22.70:3306/u339372869_test2";
        await initializeSharedDatabase();
        console.log('Testing getJobPostings...');
        const jobs = await recruitmentService.getJobPostings('71ab1ca7-271d-4e3a-b77c-72a51ddff454');
        console.log('Jobs:', JSON.stringify(jobs, null, 2));
    } catch (error) {
        console.error('Error in test:', error);
    }
}

test();

