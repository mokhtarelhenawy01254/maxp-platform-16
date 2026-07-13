const { Client } = require('pg');
async function main() {
    // Try to connect to the REMOTE Postgres from .env.production.fixed
    const client = new Client({ connectionString: 'postgresql://u339372869_max:0165676135Aa%40A@92.113.22.70:5432/u339372869_max' });
    try {
        console.log('🔍 Connecting to REMOTE Postgres (92.113.22.70)...');
        await client.connect();
        const res = await client.query('SELECT id, email, "firstName" FROM users WHERE email = \'shrouk9@gmail.com\'');
        console.log('Results in REMOTE max:');
        console.table(res.rows);
    } catch (err) {
        console.error('❌ Remote connection failed:', err.message);
    } finally {
        await client.end();
    }
}
main();
