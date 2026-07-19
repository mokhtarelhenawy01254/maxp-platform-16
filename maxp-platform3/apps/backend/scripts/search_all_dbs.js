const { Client } = require('pg');

async function tryDB(url, label) {
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
    try {
        await client.connect();
        const dbName = url.split('/').pop().split('?')[0];
        console.log(`Connected: ${label} (${dbName})`);
        const res = await client.query(
            'SELECT id, email, "firstName", "lastName", role FROM users WHERE email = $1',
            ['admin@mokhtarelhenawy.com']
        );
        if (res.rows.length > 0) {
            console.log('  FOUND:', JSON.stringify(res.rows[0]));
        } else {
            console.log('  Not found');
        }
        await client.end();
        return true;
    } catch(e) {
        console.log(`  Failed: ${e.message.split('\n')[0]}`);
        return false;
    }
}

async function main() {
    const dbs = [
        ['postgresql://postgres:0165676135@localhost:5432/max', 'Local PG max'],
        ['postgresql://postgres:0165676135@localhost:5432/maxp', 'Local PG maxp'],
        ['postgresql://postgres:postgres123@localhost:5432/communication_platform', 'Local PG comm'],
    ];
    
    for (const [url, label] of dbs) {
        await tryDB(url, label);
    }
}

main();
