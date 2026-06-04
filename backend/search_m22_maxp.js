const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/maxp' });

async function main() {
    try {
        await client.connect();
        const res = await client.query('SELECT * FROM "companies" WHERE name ILIKE \'%m22%\' OR id = \'cmlcatkmn0000vb70t1k03jpd\'');
        console.log('Search Result for m22 in maxp:', res.rows);

        const allCompanies = await client.query('SELECT id, name FROM "companies"');
        console.log('ALL Companies in maxp:', allCompanies.rows);

        const allUsers = await client.query('SELECT id, email, "companyId" FROM "users" WHERE email = \'shrouk9@gmail.com\'');
        console.log('Users in maxp:', allUsers.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

main();
