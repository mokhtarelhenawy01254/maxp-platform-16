const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/max' });

async function main() {
    try {
        await client.connect();
        const users = await client.query('SELECT * FROM "users" WHERE email = \'shrouk9@gmail.com\'');
        const user = users.rows[0];
        console.log('User shrouk9:', user);

        if (user && user.companyId) {
            const company = await client.query('SELECT * FROM "companies" WHERE id = $1', [user.companyId]);
            console.log('Current associated company:', company.rows[0]);
        }

        // Try to find ANY company named m22 or with slug m22
        const m22Search = await client.query('SELECT * FROM "companies" WHERE name ILIKE \'%m22%\' OR slug ILIKE \'%m22%\'');
        console.log('m22 Search Results:', m22Search.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

main();
