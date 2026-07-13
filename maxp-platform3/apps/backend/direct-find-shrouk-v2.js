const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    console.log('Searching for "shrouk" in "user" table...');
    const res = await client.query('SELECT id, email, "companyId" FROM "user" WHERE email ILIKE \'%shrouk%\'');
    console.log('Users found:', res.rows);

    console.log('\nSearching for "shrouk" in "employee" table...');
    const resEmp = await client.query('SELECT id, email, "companyId" FROM "employee" WHERE email ILIKE \'%shrouk%\'');
    console.log('Employees found:', resEmp.rows);

    console.log('\nSearching for "M2" in "company" table...');
    const resComp = await client.query('SELECT id, name, slug FROM "company" WHERE name ILIKE \'%m2%\' OR slug ILIKE \'%m2%\'');
    console.log('Companies found:', resComp.rows);

    await client.end();
}

main().catch(console.error);
