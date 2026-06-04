
const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:0165676135@localhost:5432/maxp',
});

async function testConnection() {
    try {
        await client.connect();
        console.log('✅ Connection successful!');
        const res = await client.query('SELECT NOW()');
        console.log('Time:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('❌ Connection failed:', err);
        process.exit(1);
    }
}

testConnection();
