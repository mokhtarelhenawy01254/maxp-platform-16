const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/max' });

async function main() {
    try {
        await client.connect();
        const res = await client.query('SELECT id, email, "firstName", "lastName", "companyId", "createdAt" FROM "users"');
        console.log('ALL USERS in max:', res.rows);

        const companies = await client.query('SELECT id, name, slug FROM "companies"');
        console.log('ALL COMPANIES in max:', companies.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

main();
