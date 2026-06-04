const { Client } = require('pg');

const BASE_URL = 'postgresql://postgres:0165676135@localhost:5432';

async function main() {
    console.log('--- GLOBAL SEARCH FOR shrouk0@gmail.com ---');
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
            const res = await client.query("SELECT * FROM users WHERE email = 'shrouk0@gmail.com'");
            if (res.rows.length > 0) {
                console.log(`\n✅ FOUND in DB: ${dbName}, Table: users`);
                console.log(JSON.stringify(res.rows[0], null, 2));
            }
        } catch (e) {
        } finally {
            await client.end().catch(() => { });
        }
    }
}

main().catch(console.error);
