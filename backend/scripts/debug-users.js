const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listUsers() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query("SELECT id, email, \"firstName\", \"lastName\", \"companyId\", \"employeeNumber\" FROM users WHERE email ILIKE '%maxpi.com%' OR email ILIKE '%h2m%'");
        console.log('Search Results:', JSON.stringify(res.rows, null, 2));

        const res2 = await client.query('SELECT "companyId", count(*) FROM users GROUP BY "companyId"');
        console.log('Users per Company:', JSON.stringify(res2.rows, null, 2));

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

listUsers();
