
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:0165676135@localhost:5432/maxp'
  });

  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  
  console.log('Tables in maxp:');
  res.rows.forEach(r => console.log(`- ${r.table_name}`));
  await client.end();
}

main().catch(console.error);
