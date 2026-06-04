const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function listTables() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL,
    });

    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables in database:');
        console.table(res.rows.map(r => r.table_name));
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

listTables();
