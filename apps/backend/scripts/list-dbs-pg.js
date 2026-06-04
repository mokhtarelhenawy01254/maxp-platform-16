const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function listDatabases() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL.replace(/\/maxp$/, '/postgres'),
    });

    try {
        await client.connect();
        const res = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false");
        console.log('Databases available:');
        console.table(res.rows.map(r => r.datname));
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

listDatabases();
