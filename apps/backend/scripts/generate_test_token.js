const { Client } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.POSTGRES_URL,
});

async function generateToken() {
    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Get a user (preferably OWNER or ADMIN)
        const res = await client.query(`
      SELECT * FROM "users" LIMIT 1;
    `);

        if (res.rows.length === 0) {
            console.log('❌ No users found!');
            return;
        }

        const user = res.rows[0];
        console.log('👤 Found user:', user.email);

        // Get company ID (assuming user has a company or we can find one)
        // The previous logs showed: companyId: 'cmlex8xb50000uwlwzeuhdv6g'
        // Let's try to query UserCompany or just use the one from logs if available, 
        // but better to fetch from DB.

        // Check if user has companyId column or if it's a relation
        let companyId = user.company_id || user.companyId;

        if (!companyId) {
            // Try to find a company for this user
            const companyRes = await client.query(`
            SELECT * FROM "companies" LIMIT 1;
        `);
            if (companyRes.rows.length > 0) {
                companyId = companyRes.rows[0].id;
                console.log('🏢 Found company:', companyId);
            }
        }

        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            companyId: companyId
        };

        const secret = process.env.JWT_SECRET;
        const token = jwt.sign(payload, secret, { expiresIn: '1h' });

        console.log('\n🔑 Generated Token:');
        console.log(token);

        console.log('\n📝 Curl Command:');
        console.log(`curl -X POST http://localhost:3007/api/v1/whatsapp/notifications/test \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d "{\\"phone\\": \\"01281914482\\", \\"eventType\\": \\"ORDER_CREATED\\"}"`);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

generateToken();
