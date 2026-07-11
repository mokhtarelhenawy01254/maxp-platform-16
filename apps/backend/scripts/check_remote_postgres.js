const { Client } = require('pg');

async function main() {
    const client = new Client({ 
        connectionString: 'postgresql://u339372869_max:0165676135Aa%40A@92.113.22.70:5432/u339372869_max',
        connectionTimeoutMillis: 15000
    });
    
    try {
        await client.connect();
        console.log('Connected to remote PostgreSQL (92.113.22.70:5432)');

        // Search for the email
        const res = await client.query(
            `SELECT id, email, "firstName", "lastName", role, "isActive" FROM users WHERE email = $1`,
            ['admin@mokhtarelhenawy.com']
        );
        console.log('Exact match:', res.rows);

        const res2 = await client.query(
            `SELECT id, email, "firstName", "lastName", role, "isActive" FROM users WHERE email ILIKE $1`,
            ['%mokhtarelhenawy%']
        );
        console.log('mokhtarelhenawy:', res2.rows);

        const res3 = await client.query(
            `SELECT id, email, "firstName", "lastName", role FROM users WHERE role = 'SUPER_ADMIN'`
        );
        console.log('SUPER_ADMIN users:', res3.rows);

        await client.end();
    } catch(e) {
        console.log('Connection failed:', e.message);
    }
}

main();
