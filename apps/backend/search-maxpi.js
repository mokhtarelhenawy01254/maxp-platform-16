const { Client } = require('pg');
async function main() {
    const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/max' });
    await client.connect();
    const res = await client.query(`
        SELECT email FROM users WHERE email ILIKE '%maxpi%'
    `);
    console.log('Search results for maxpi in users:');
    console.table(res.rows);

    const res2 = await client.query(`
        SELECT email FROM companies WHERE email ILIKE '%maxpi%'
    `);
    console.log('Search results for maxpi in companies:');
    console.table(res2.rows);

    await client.end();
}
main();
