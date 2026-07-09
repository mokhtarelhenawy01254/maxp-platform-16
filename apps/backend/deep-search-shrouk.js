const { Client } = require('pg');

const BASE_URL = 'postgresql://postgres:0165676135@localhost:5432';

async function main() {
    console.log('--- GLOBAL SEARCH FOR shrouk ---');
    const rootClient = new Client({ connectionString: `${BASE_URL}/postgres` });
    await rootClient.connect();
    const dbsRes = await rootClient.query("SELECT datname FROM pg_database WHERE datistemplate = false");
    await rootClient.end();

    for (const db of dbsRes.rows) {
        const dbName = db.datname;
        console.log(`Checking Database: ${dbName}...`);
        const client = new Client({ connectionString: `${BASE_URL}/${dbName}` });
        try {
            await client.connect();
            const columnsWithEmail = await client.query(`
                SELECT table_name, column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND (column_name ILIKE '%email%' OR column_name ILIKE '%name%')
            `);

            for (const col of columnsWithEmail.rows) {
                const tableName = col.table_name;
                const colName = col.column_name;
                try {
                    const searchRes = await client.query(`SELECT * FROM "${tableName}" WHERE "${colName}" ILIKE '%shrouk%'`);
                    if (searchRes.rows.length > 0) {
                        console.log(`\n✅ FOUND in DB: ${dbName}, Table: ${tableName}, Col: ${colName}`);
                        console.log(JSON.stringify(searchRes.rows[0], null, 2));
                    }
                } catch (e) { }
            }
        } catch (e) {
            console.error(`Error with ${dbName}: ${e.message}`);
        } finally {
            await client.end().catch(() => { });
        }
    }
}

main().catch(console.error);
