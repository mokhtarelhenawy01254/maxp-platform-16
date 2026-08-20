const { Client } = require('pg');
async function main() {
    const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/maxp' });
    await client.connect();

    // List all tables again but more thoroughly
    const res = await client.query("SELECT nspname, relname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE relkind = 'r' AND nspname NOT IN ('pg_catalog', 'information_schema')");
    console.log('Tables in maxp:');
    console.table(res.rows);

    await client.end();
}
main();
