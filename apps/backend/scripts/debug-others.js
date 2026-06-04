const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function debugOthers() {
    const client = new Client({ connectionString: process.env.POSTGRES_URL });
    try {
        await client.connect();

        console.log('--- DEV TEAM MEMBERS ---');
        const dev = await client.query('SELECT id, email FROM dev_team_members LIMIT 10');
        console.log(JSON.stringify(dev.rows, null, 2));

        console.log('--- CUSTOMERS ---');
        const cust = await client.query('SELECT id, email FROM customers LIMIT 10');
        console.log(JSON.stringify(cust.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

debugOthers();
