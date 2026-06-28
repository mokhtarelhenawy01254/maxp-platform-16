const { Client } = require('pg');

async function main() {
    const client = new Client({ 
        connectionString: 'postgresql://u339372869_max:0165676135Aa%40A@92.113.22.70:5432/u339372869_max',
        connectionTimeoutMillis: 15000
    });
    
    try {
        await client.connect();
        console.log('Connected to remote PostgreSQL!');

        console.log('\n--- 1. Querying ai.agent_templates ---');
        const templates = await client.query('SELECT slug, role, name, allowed_tools, allowed_skills FROM ai.agent_templates');
        console.log(templates.rows);

        console.log('\n--- 2. Querying active keys ---');
        const keys = await client.query('SELECT id, name, provider, "keyType", "isActive" FROM "ai_keys"');
        console.log(keys.rows);

        console.log('\n--- 3. Querying model configs ---');
        const configs = await client.query('SELECT id, "modelName", "keyId", "isEnabled" FROM "ai_model_configs"');
        console.log(configs.rows);

        await client.end();
    } catch(e) {
        console.log('Connection failed:', e.message);
    }
}

main();
