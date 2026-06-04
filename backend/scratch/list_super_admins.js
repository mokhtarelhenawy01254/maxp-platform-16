const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/maxp' });

async function main() {
    try {
        await client.connect();
        const res = await client.query("SELECT email, role FROM users WHERE role = 'SUPER_ADMIN'");
        console.log('Super Admins:', res.rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}

main();
