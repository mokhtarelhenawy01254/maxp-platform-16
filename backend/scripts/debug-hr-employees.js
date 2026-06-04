const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listEmployees() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query("SELECT * FROM hr_employees WHERE email ILIKE '%maxpi.com%' OR email ILIKE '%h2m%'");
        console.log('Search Results in hr_employees:', JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

listEmployees();
