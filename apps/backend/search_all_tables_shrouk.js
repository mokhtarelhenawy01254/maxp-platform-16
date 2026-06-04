const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/max' });

async function main() {
    try {
        await client.connect();
        const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        const tables = tablesRes.rows.map(r => r.table_name);

        for (const table of tables) {
            try {
                // Search in all columns by casting to text
                const searchRes = await client.query(`SELECT * FROM "${table}" WHERE CAST("${table}".* AS TEXT) ILIKE '%shrouk%' LIMIT 5`);
                if (searchRes.rows.length > 0) {
                    console.log(`Table "${table}" has shroud strings:`, searchRes.rows);
                }
            } catch (err) {
                // console.error(`Skipping table ${table}: ${err.message}`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

main();
