const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function searchEverywhere() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
    });

    try {
        await client.connect();
        const email = 'h2m@maxpi.com';
        console.log('🔍 Comprehensive search for:', email);

        const tables = ['users', 'hr_employees', 'customers', 'Merchant', 'affiliates', 'user_invitations'];

        for (const table of tables) {
            try {
                const res = await client.query(`SELECT * FROM "${table}" WHERE LOWER(email) = LOWER($1)`, [email]);
                if (res.rows.length > 0) {
                    console.log(`✅ Found in ${table} table:`);
                    console.log(JSON.stringify(res.rows[0], null, 2));
                } else {
                    console.log(`❌ Not found in ${table}`);
                }
            } catch (e) {
                console.log(`⚠️ Error searching in ${table}:`, e.message);
            }
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

searchEverywhere();
