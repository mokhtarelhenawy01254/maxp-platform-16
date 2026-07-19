const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function listUserTables() {
    const client = new Client({ connectionString: process.env.POSTGRES_URL });
    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE '%user%'");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

listUserTables();
