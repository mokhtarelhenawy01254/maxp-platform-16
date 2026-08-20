const { Client } = require('pg');

async function listDbs() {
    const client = new Client({
        connectionString: "postgresql://postgres:0165676135@localhost:5432/postgres"
    });

    try {
        await client.connect();
        const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
        console.log('Databases:', res.rows.map(r => r.datname));
    } catch (err) {
        console.error('Error listing databases:', err);
    } finally {
        await client.end();
    }
}

listDbs();
