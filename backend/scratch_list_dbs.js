
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:0165676135@localhost:5432/postgres'
  });

  await client.connect();
  const res = await client.query(`
    SELECT datname FROM pg_database
  `);
  
  console.log('Databases available:');
  res.rows.forEach(r => console.log(`- ${r.datname}`));
  await client.end();
}

main().catch(console.error);
