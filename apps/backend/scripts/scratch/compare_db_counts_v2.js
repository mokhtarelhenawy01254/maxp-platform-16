const { Client } = require('pg');

async function getCounts(db) {
    const client = new Client({ connectionString: `postgresql://postgres:0165676135@localhost:5432/${db}` });
    try {
        await client.connect();

        const tables = [
            'companies', 'users', 'user_companies',
            'hr_employees', 'hr_departments', 'hr_advance_requests', 'hr_attendances',
            'products', 'orders', 'customers', 'whatsapp_sessions', 'activity_logs'
        ];
        console.log(`DB: ${db}`);
        for (const table of tables) {
            try {
                const res = await client.query(`SELECT count(*) FROM "${table}"`);
                console.log(`  ${table.padEnd(20)}: ${res.rows[0].count}`);
            } catch (e) {
                // Try checking plural/singular or without prefix if needed
                console.log(`  ${table.padEnd(20)}: Not Found`);
            }
        }
    } catch (e) {
        console.error(`Error connecting to ${db}:`, e.message);
    } finally {
        await client.end();
    }
}

async function main() {
    await getCounts('max');
    console.log('');
    await getCounts('maxp');
}

main().catch(console.error);
