const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function listAllUsers() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
    });

    try {
        await client.connect();
        const res = await client.query("SELECT id, email, role FROM users");
        console.log(`Total users in DB: ${res.rows.length}`);
        console.table(res.rows);

        const found = res.rows.find(u => u.email.toLowerCase().includes('maxpi'));
        if (found) {
            console.log('✅ Found match:', found);
        } else {
            console.log('❌ No email contains "maxpi"');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

listAllUsers();
