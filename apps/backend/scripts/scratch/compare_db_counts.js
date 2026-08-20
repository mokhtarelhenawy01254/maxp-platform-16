const { Client } = require('pg');

async function getCounts(db) {
    const client = new Client({ connectionString: `postgresql://postgres:0165676135@localhost:5432/${db}` });
    try {
        await client.connect();

        const tables = ['companies', 'users', 'user_companies', 'advances', 'products', 'employees', 'orders', 'attendance'];
        console.log(`DB: ${db}`);
        for (const table of tables) {
            try {
                const res = await client.query(`SELECT count(*) FROM "${table}"`);
                console.log(`  ${table.padEnd(15)}: ${res.rows[0].count}`);
            } catch (e) {
                console.log(`  ${table.padEnd(15)}: Table Not Found`);
            }
        }
    } catch (e) {
        console.error(`Error connecting to ${db}:`, e.message);
    } finally {
        await client.end();
    }
}

async function main() {
    await getCounts('max');
    console.log('');
    await getCounts('maxp');
}

main().catch(console.error);
