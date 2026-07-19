const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function debugAll() {
    const client = new Client({ connectionString: process.env.POSTGRES_URL });
    try {
        await client.connect();

        console.log('--- USERS ---');
        const users = await client.query('SELECT id, email, "employeeNumber", "createdAt" FROM users ORDER BY "createdAt" DESC LIMIT 10');
        console.log(JSON.stringify(users.rows, null, 2));

        console.log('--- HR EMPLOYEES ---');
        const emps = await client.query('SELECT id, email, "employeeNumber", "userId", "createdAt" FROM hr_employees ORDER BY "createdAt" DESC LIMIT 10');
        console.log(JSON.stringify(emps.rows, null, 2));

        console.log('--- USER COMPANIES ---');
        const uc = await client.query('SELECT * FROM user_companies ORDER BY "createdAt" DESC LIMIT 10');
        console.log(JSON.stringify(uc.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

debugAll();
