const axios = require('axios');
const jwt = require('jsonwebtoken');

// Config
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
const API_URL = 'http://localhost:3007/api/v1/super-admin/dev/dashboard';

async function verifyPeriodZero() {
    try {
        console.log('🚀 Starting Verification: period=0 (Today filter)');

        // 1. Forge a Super Admin Token
        const payload = {
            id: 'cme8one7i0002uf6s5vj1gpv0',
            email: 'superadmin@system.com',
            role: 'SUPER_ADMIN'
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        // 2. Call Dashboard API with period=0
        console.log('📡 Calling API: ' + API_URL + '?period=0');
        const response = await axios.get(API_URL + '?period=0', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Status:', response.status);

        if (response.data && response.data.success) {
            console.log('✅ Success: Dashboard data received successfully.');
            const data = response.data.data;
            console.log('🔍 Breakdown:');
            console.log(`   - Overview Stats: ${data.overview ? 'Found' : 'Missing'}`);
            console.log(`   - Status Breakdown: ${data.tasksByStatus ? 'Found' : 'Missing'}`);
            console.log(`   - Priority Breakdown: ${data.tasksByPriority ? 'Found' : 'Missing'}`);
        } else {
            console.error('❌ Failure: API returned success=false');
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.data);
            if (error.response.status === 500) {
                console.error('💥 500 Internal Server Error confirmed. Root cause not fully resolved?');
            }
        } else {
            console.error('❌ Network/Script Error:', error.message);
        }
    }
}

verifyPeriodZero();
