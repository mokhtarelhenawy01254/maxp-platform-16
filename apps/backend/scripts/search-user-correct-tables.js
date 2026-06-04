const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function searchUser() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
    });

    try {
        await client.connect();
        const email = 'h2m@maxpi.com';
        console.log('🔍 Searching (case-insensitive) for:', email);

        // Search in "users" table
        const res = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);

        if (res.rows.length > 0) {
            console.log('✅ Found in users table:');
            console.log(res.rows[0]);
        } else {
            console.log('❌ Not found in users table.');

            // Just for debugging, show first few users to see the structure
            const allUsers = await client.query('SELECT id, email FROM users LIMIT 10');
            console.log('Sample users in DB:');
            console.table(allUsers.rows);
        }

        // Search in "hr_employees" table
        const resEmp = await client.query('SELECT * FROM hr_employees WHERE LOWER(email) = LOWER($1)', [email]);
        if (resEmp.rows.length > 0) {
            console.log('✅ Found in hr_employees table:');
            console.log(resEmp.rows[0]);
        } else {
            console.log('❌ Not found in hr_employees table.');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

searchUser();
