const axios = require('axios');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

// Configuration
const API_URL = 'http://localhost:3007/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const USER_EMAIL = 'mokhtar@mokhtar.com';

async function verify() {
    try {
        console.log('🔄 Initializing database connection...');
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        console.log(`🔍 Finding user: ${USER_EMAIL}...`);
        const user = await prisma.user.findUnique({
            where: { email: USER_EMAIL },
            include: {
                company: true
            }
        });

        if (!user) {
            console.error('❌ User not found!');
            process.exit(1);
        }
        console.log('✅ User found:', user.email);

        // Generate Token
        console.log('🔑 Generating JWT token...');
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                companyId: user.companyId
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        console.log('\n🚀 Starting HR Endpoint Tests...\n');

        // Test 1: GET /hr/employees/me
        try {
            console.log('Testing: GET /hr/employees/me ...');
            const res1 = await axios.get(`${API_URL}/hr/employees/me`, config);
            if (res1.status === 200 && res1.data.success) {
                console.log('✅ [PASS] /hr/employees/me returned Profile');
            } else {
                console.error('❌ [FAIL] /hr/employees/me status:', res1.status);
            }
        } catch (err) {
            console.error('❌ [FAIL] /hr/employees/me Error:', err.message);
            if (err.response) console.error('Response:', err.response.data);
        }

        // Test 2: GET /hr/leaves/my-recent
        try {
            console.log('\nTesting: GET /hr/leaves/my-recent ...');
            const res2 = await axios.get(`${API_URL}/hr/leaves/my-recent?limit=3`, config);
            if (res2.status === 200 && res2.data.success) {
                console.log(`✅ [PASS] /hr/leaves/my-recent returned ${res2.data.leaves.length} leaves`);
            } else {
                console.error('❌ [FAIL] /hr/leaves/my-recent status:', res2.status);
            }
        } catch (err) {
            console.error('❌ [FAIL] /hr/leaves/my-recent Error:', err.message);
            if (err.response) console.error('Response:', err.response.data);
        }

        // Test 3: GET /hr/leaves (Fix for 500 error)
        try {
            console.log('\nTesting: GET /hr/leaves (checking for previous 500 error)...');
            const res3 = await axios.get(`${API_URL}/hr/leaves?page=1&limit=10`, config);
            if (res3.status === 200 && res3.data.success) {
                console.log('✅ [PASS] /hr/leaves returned Leave Requests successfully');
            } else {
                console.error('❌ [FAIL] /hr/leaves status:', res3.status);
            }
        } catch (err) {
            console.error('❌ [FAIL] /hr/leaves Error:', err.message);
            if (err.response) console.error('Response:', err.response.data);
        }

        // Test 4: GET /hr/payroll (Fix for 500 error)
        try {
            console.log('\nTesting: GET /hr/payroll (checking for previous 500 error)...');
            const res4 = await axios.get(`${API_URL}/hr/payroll?page=1&limit=10&month=1&year=2026`, config);
            if (res4.status === 200 && res4.data.success) {
                console.log('✅ [PASS] /hr/payroll returned Payrolls successfully');
            } else {
                console.error('❌ [FAIL] /hr/payroll status:', res4.status);
            }
        } catch (err) {
            console.error('❌ [FAIL] /hr/payroll Error:', err.message);
            if (err.response) console.error('Response:', err.response.data);
        }

        console.log('\n🏁 Verification Complete.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Critical Error:', error);
        process.exit(1);
    }
}

verify();
