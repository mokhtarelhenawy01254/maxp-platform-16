
const { Client } = require('pg');

async function main() {
  const dbs = ['max', 'maxp'];
  
  for (const dbName of dbs) {
      console.log(`\nTables in ${dbName}:`);
      const client = new Client({
        connectionString: `postgresql://postgres:0165676135@localhost:5432/${dbName}`
      });

      await client.connect();
      const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
      res.rows.forEach(row => console.log(`- ${row.table_name}`));
      await client.end();
  }
}

main().catch(console.error);
