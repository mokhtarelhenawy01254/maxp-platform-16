const { Client } = require('pg');

async function listSchemas(db) {
    const client = new Client({
        connectionString: `postgresql://postgres:0165676135@localhost:5432/${db}`
    });

    try {
        await client.connect();
        console.log(`--- Schemas in ${db} ---`);
        const res = await client.query("SELECT schema_name FROM information_schema.schemata;");
        console.log(res.rows.map(r => r.schema_name));

        // Also list all tables in all schemas
        const tables = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog');");
        console.log(`Tables in ${db}:`, tables.rows);

    } catch (err) {
        console.error(`Error in ${db}:`, err.message);
    } finally {
        await client.end();
    }
}

async function run() {
    await listSchemas('max');
    await listSchemas('maxp');
}

run();
