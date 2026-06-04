const axios = require('axios');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

const API_URL = 'http://localhost:3007/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const USER_EMAIL = 'mokhtar@mokhtar.com';

async function verifyCheckOutFlow() {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();
        const user = await prisma.user.findUnique({
            where: { email: USER_EMAIL },
            include: { company: true }
        });

        if (!user) throw new Error('User not found');

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, companyId: user.companyId },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 1. Ensure Checked In (Status might remain if already checked in, that's fine)
        console.log('--- Step 1: Ensure Checked In ---');
        try {
            await axios.post(`${API_URL}/hr/attendance/check-in`, {
                location: JSON.stringify({ lat: 30.0444, lng: 31.2357 }),
                method: 'web_dashboard'
            }, config);
            console.log('✅ Check-in Success');
        } catch (e) {
            if (e.response?.status === 400 && e.response?.data?.error?.includes('مسبقاً')) {
                console.log('ℹ️ Already checked in (Duplicate), proceeding to check-out...');
            } else {
                console.warn('⚠️ Check-in warning:', e.message);
            }
        }

        // 2. Perform Check Out
        console.log('\n--- Step 2: Attempt Check Out ---');
        const result = await axios.post(`${API_URL}/hr/attendance/check-out`, {
            location: JSON.stringify({ lat: 30.0444, lng: 31.2357 }),
            method: 'web_dashboard'
        }, config);

        console.log('✅ Check-out Response:', JSON.stringify(result.data, null, 2));

        if (result.data.success) {
            console.log('🎉 Verification Successful: Check-out completed without 500 error.');
            process.exit(0);
        } else {
            console.error('❌ Check-out reported failure:', result.data);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Check-out Failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

verifyCheckOutFlow();
