
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const API_URL = 'http://localhost:3007/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function generateToken() {
    const prisma = getSharedPrismaClient();
    const user = await prisma.user.findUnique({
        where: { email: 'testadmin@example.com' }
    });

    if (!user) {
        throw new Error('User not found');
    }

    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role,
            companyId: user.companyId
        },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function verifyCacheInvalidation() {
    try {
        const authToken = await generateToken();
        const headers = { Authorization: `Bearer ${authToken}` };

        // 1. Get Current Config
        console.log('\n🔍 Fetching Current Config...');
        const res1 = await axios.get(`${API_URL}/super-admin/ai/config`, { headers });
        console.log('Current Default Provider:', res1.data.data.defaultProvider);

        // 2. Toggle Provider to Trigger Cache Clear
        const newProvider = res1.data.data.defaultProvider === 'GOOGLE' ? 'ANTHROPIC' : 'GOOGLE';
        console.log(`\n🔄 Switching Provider to ${newProvider}...`);

        await axios.post(`${API_URL}/super-admin/ai/config`, {
            defaultProvider: newProvider
        }, { headers });

        console.log('✅ Config Updated.');
        console.log('NOTE: Check server logs for "[super-admin] Global config updated. Clearing ModelManager caches..."');

        // 3. Restore Config
        console.log(`\nrestoring to GOOGLE...`);
        await axios.post(`${API_URL}/super-admin/ai/config`, {
            defaultProvider: 'GOOGLE'
        }, { headers });
        console.log('✅ Config Restored.');

    } catch (error) {
        console.error('❌ Verification failed (Full Error):', error);
        if (error.response) {
            console.error('❌ Status:', error.response.status);
            console.error('❌ Data:', error.response.data);
        }
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

verifyCacheInvalidation();
