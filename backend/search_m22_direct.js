const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/max' });

async function main() {
    try {
        await client.connect();
        const res = await client.query('SELECT * FROM "companies" WHERE name ILIKE \'%m22%\' OR id = \'cmlcatkmn0000vb70t1k03jpd\'');
        console.log('Search Result for m22:', res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

main();
