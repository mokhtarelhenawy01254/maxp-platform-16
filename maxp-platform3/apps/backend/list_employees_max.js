const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/max' });

async function main() {
    try {
        await client.connect();
        const res = await client.query('SELECT * FROM "hr_employees"');
        console.log('Employees in max:', res.rows);
    } catch (e) {
        console.error('Error in max:', e.message);
    } finally {
        await client.end();
    }
}

main();
