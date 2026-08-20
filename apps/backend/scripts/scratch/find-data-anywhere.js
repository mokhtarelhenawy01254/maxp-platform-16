const { Client } = require('pg');

const BASE_URL = 'postgresql://postgres:0165676135@localhost:5432';

async function main() {
    console.log('--- FINDING NON-EMPTY TABLES IN ALL DBs ---');
    const rootClient = new Client({ connectionString: `${BASE_URL}/postgres` });
    await rootClient.connect();
    const dbsRes = await rootClient.query("SELECT datname FROM pg_database WHERE datistemplate = false");
    await rootClient.end();

    for (const db of dbsRes.rows) {
        const dbName = db.datname;
        console.log(`\nDB: ${dbName}`);
        const client = new Client({ connectionString: `${BASE_URL}/${dbName}` });
        try {
            await client.connect();
            const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            for (const row of tablesRes.rows) {
                const table = row.table_name;
                try {
                    const countRes = await client.query(`SELECT count(*) FROM "${table}"`);
                    const count = parseInt(countRes.rows[0].count);
                    if (count > 0) {
                        console.log(`   ${table}: ${count}`);
                    }
                } catch (e) { }
            }
        } catch (e) {
            console.error(`Error: ${e.message}`);
        } finally {
            await client.end().catch(() => { });
        }
    }
}

main().catch(console.error);
