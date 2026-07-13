const { Client } = require('pg');

async function main() {
    const base = 'postgresql://postgres:0165676135@localhost:5432';
    const dbs = ['max', 'maxp', 'postgres'];

    for (const dbName of dbs) {
        console.log(`\n=== DB: ${dbName} ===`);
        const client = new Client({ connectionString: `${base}/${dbName}` });
        try {
            await client.connect();
            const res = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);
            const tables = res.rows.map(r => r.table_name);
            console.log('Tables:', tables.join(', '));

            if (tables.includes('users') || tables.includes('User')) {
                const tableName = tables.includes('users') ? 'users' : 'User';
                const countRes = await client.query(`SELECT count(*) FROM "${tableName}"`);
                console.log(`User Count in ${tableName}:`, countRes.rows[0].count);
                if (countRes.rows[0].count > 0) {
                    const shroudUsers = await client.query(`SELECT email FROM "${tableName}" WHERE email ILIKE '%shrouk%'`);
                    console.log('Shrouk matches:', shroudUsers.rows);
                }
            }
        } catch (e) {
            console.log(`Failed to connect/query ${dbName}:`, e.message);
        } finally {
            await client.end().catch(() => { });
        }
    }
}

main();
