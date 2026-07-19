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

        // Search in "User" table
        const res = await client.query('SELECT * FROM "User" WHERE LOWER(email) = LOWER($1)', [email]);

        if (res.rows.length > 0) {
            console.log('✅ Found in User table:');
            console.log(res.rows[0]);
        } else {
            console.log('❌ Not found in User table.');
        }

        // Search in "Employee" table
        const resEmp = await client.query('SELECT * FROM "Employee" WHERE LOWER(email) = LOWER($1)', [email]);
        if (resEmp.rows.length > 0) {
            console.log('✅ Found in Employee table:');
            console.log(resEmp.rows[0]);
        } else {
            console.log('❌ Not found in Employee table.');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

searchUser();
