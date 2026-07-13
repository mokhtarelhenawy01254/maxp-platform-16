const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function searchInMax() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL.replace(/\/maxp$/, '/max'),
    });

    try {
        await client.connect();
        const email = 'h2m@maxpi.com';
        console.log('🔍 Searching in database "max" for:', email);

        const res = await client.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
        if (res.rows.length > 0) {
            console.log('✅ Found in database "max":');
            console.log(JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('❌ Not found in database "max".');

            const allUsers = await client.query('SELECT id, email FROM users LIMIT 10');
            console.log('Sample users in "max" DB:');
            console.table(allUsers.rows);
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

searchInMax();
