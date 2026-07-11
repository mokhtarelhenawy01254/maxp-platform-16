const { Client } = require('pg');

const BASE_URL = 'postgresql://postgres:0165676135@localhost:5432';

async function main() {
    console.log('--- DB SUMMARY ---');
    const rootClient = new Client({ connectionString: `${BASE_URL}/postgres` });
    await rootClient.connect();
    const dbsRes = await rootClient.query("SELECT datname FROM pg_database WHERE datistemplate = false");
    await rootClient.end();

    for (const db of dbsRes.rows) {
        const dbName = db.datname;
        const client = new Client({ connectionString: `${BASE_URL}/${dbName}` });
        try {
            await client.connect();
            const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            const tables = res.rows.map(r => r.table_name);
            console.log(`\nDB: ${dbName} (Tables: ${tables.length})`);

            for (const table of tables) {
                if (['User', 'users', 'contacts', 'Customer', 'customers', 'companies', 'Company'].includes(table)) {
                    const countRes = await client.query(`SELECT count(*) FROM "${table}"`);
                    const count = countRes.rows[0].count;
                    console.log(`   Table: ${table} - Rows: ${count}`);
                    if (count > 0) {
                        const first = await client.query(`SELECT * FROM "${table}" LIMIT 1`);
                        // console.log(`      Sample: ${JSON.stringify(first.rows[0])}`);
                    }
                }
            }
        } catch (e) {
            console.error(`Error with ${dbName}: ${e.message}`);
        } finally {
            await client.end().catch(() => { });
        }
    }
}

main().catch(console.error);
