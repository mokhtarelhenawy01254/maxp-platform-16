const { Client } = require('pg');

async function main() {
    const client = new Client({ 
        connectionString: 'postgresql://u339372869_max:0165676135Aa%40A@92.113.22.70:5432/u339372869_max',
        connectionTimeoutMillis: 15000
    });
    
    try {
        await client.connect();
        console.log('Connected to remote PostgreSQL!');

        const res = await client.query("SELECT id, name, model, provider, config FROM agents WHERE id = 'agent_LSqKxvBVSJL2AO7ItWQKZQ'");
        if (res.rows.length === 0) {
            console.log('Agent not found');
        } else {
            console.log('Agent details:', JSON.stringify(res.rows[0], null, 2));
        }
        await client.end();
    } catch(e) {
        console.log('Failed:', e.message);
    }
}

main();
