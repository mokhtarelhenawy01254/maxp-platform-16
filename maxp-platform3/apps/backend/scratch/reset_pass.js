const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/maxp' });

async function main() {
    try {
        await client.connect();
        const res = await client.query("UPDATE users SET password = $1 WHERE email = $2", ['$2b$10$qYTXAkuCj7CyQvOYKZmsJOEma7hrMr.dz3MSF2MBCEZqczlY6uLK.', 'admin@superadmin.com']);
        console.log('Update result:', res.rowCount);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}

main();
