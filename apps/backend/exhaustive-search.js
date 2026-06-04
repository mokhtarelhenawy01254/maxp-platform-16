const { Client } = require('pg');

const BASE_URL = 'postgresql://postgres:0165676135@localhost:5432';

async function main() {
    const dbs = ['max', 'maxp'];
    for (const db of dbs) {
        console.log(`\n--- Searching Database: ${db} ---`);
        const client = new Client({ connectionString: `${BASE_URL}/${db}` });
        try {
            await client.connect();
            const schemas = await client.query("SELECT schema_name FROM information_schema.schemata");
            for (const schema of schemas.rows) {
                const schemaName = schema.schema_name;
                if (['information_schema', 'pg_catalog', 'pg_toast'].includes(schemaName)) continue;

                const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${schemaName}'`);
                for (const table of tables.rows) {
                    const tableName = table.table_name;
                    try {
                        // Check if table has email column
                        const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = 'email'`);
                        if (cols.rows.length > 0) {
                            const searchRes = await client.query(`SELECT * FROM "${schemaName}"."${tableName}" WHERE email ILIKE '%shrouk%'`);
                            if (searchRes.rows.length > 0) {
                                console.log(`✅ FOUND in DB: ${db}, Schema: ${schemaName}, Table: ${tableName}`);
                                console.log(searchRes.rows[0]);
                            }
                        }
                    } catch (e) { }
                }
            }
        } catch (e) {
            console.error(`Error with ${db}: ${e.message}`);
        } finally {
            await client.end().catch(() => { });
        }
    }
}

main();
