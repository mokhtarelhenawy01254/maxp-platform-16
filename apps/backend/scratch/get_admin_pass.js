const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/maxp' });

async function main() {
    try {
        await client.connect();
        const res = await client.query('SELECT email, password, "firstName", "lastName" FROM "users" WHERE email = $1', ['admin@mokhtarelhenawy.com']);
        if (res.rows.length > 0) {
            console.log('User found:', res.rows[0]);
        } else {
            console.log('User not found.');
        }
    } catch (e) {
        console.error('Error querying database:', e.message);
    } finally {
        await client.end();
    }
}

main();
