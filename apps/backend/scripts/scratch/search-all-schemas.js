const { Client } = require('pg');

const BASE_URL = 'postgresql://postgres:0165676135@localhost:5432';

async function main() {
    const client = new Client({ connectionString: `${BASE_URL}/max` });
    try {
        await client.connect();
        const schemas = await client.query("SELECT schema_name FROM information_schema.schemata");
        console.log('Schemas in max:', schemas.rows.map(r => r.schema_name));

        for (const schema of schemas.rows) {
            const schemaName = schema.schema_name;
            if (['information_schema', 'pg_catalog', 'pg_toast'].includes(schemaName)) continue;

            console.log(`Checking schema: ${schemaName}`);
            const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${schemaName}'`);
            for (const table of tables.rows) {
                const tableName = table.table_name;
                try {
                    const searchRes = await client.query(`SELECT * FROM "${schemaName}"."${tableName}" WHERE email ILIKE '%shrouk%'`);
                    if (searchRes.rows.length > 0) {
                        console.log(`✅ FOUND in schema: ${schemaName}, Table: ${tableName}`);
                        console.log(searchRes.rows[0]);
                    }
                } catch (e) { }
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.end().catch(() => { });
    }
}

main();
