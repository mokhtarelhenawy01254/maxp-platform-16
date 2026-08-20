const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    console.log('Searching for users with "shrouk"...');
    const res = await client.query('SELECT id, email, "companyId", name FROM "User" WHERE email ILIKE \'%shrouk%\'');
    console.log('Users found:', res.rows);

    console.log('\nSearching for employees with "shrouk"...');
    const resEmp = await client.query('SELECT id, email, "companyId", name FROM "Employee" WHERE email ILIKE \'%shrouk%\'');
    console.log('Employees found:', resEmp.rows);

    console.log('\nChecking companies with "M2" or "m22"...');
    const resComp = await client.query('SELECT id, name, slug FROM "Company" WHERE name ILIKE \'%m2%\' OR slug ILIKE \'%m2%\'');
    console.log('Companies found:', resComp.rows);

    await client.end();
}

main().catch(console.error);
