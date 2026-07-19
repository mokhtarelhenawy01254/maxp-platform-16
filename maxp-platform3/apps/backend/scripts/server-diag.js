const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Replicate server.js env loading
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const localEnvPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath, override: true });
}
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'production') {
    const prodEnvPath = path.resolve(__dirname, '../.env.production');
    if (fs.existsSync(prodEnvPath)) {
        dotenv.config({ path: prodEnvPath, override: true });
    }
}

console.log('--- SERVER DIAGNOSTICS ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? 'PRESENT' : 'MISSING');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (url) {
    try {
        const u = new URL(url);
        console.log('DB Host:', u.hostname);
        console.log('DB Port:', u.port);
        console.log('DB Name:', u.pathname.substring(1));
        console.log('DB User:', u.username);
    } catch (e) {
        console.log('URL Parse Error:', e.message);
    }
}

const { Client } = require('pg');
async function testConn() {
    if (!url) return;
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        console.log('âœ… Connection Successful');
        const res = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('ðŸ“Š Tables in public schema:', res.rows[0].count);

        const companiesCheck = await client.query("SELECT count(*) FROM information_schema.tables WHERE table_name = 'companies'");
        console.log('ðŸ¢ Companies table exists:', companiesCheck.rows[0].count > 0 ? 'YES' : 'NO');

        await client.end();
    } catch (err) {
        console.error('âŒ Connection Failed:', err.message);
    }
}

testConn();

