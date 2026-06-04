
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:0165676135@localhost:5432/max'
  });
  await client.connect();

  const searchString = 'd8709322-0949-41e9-bad5-2409c95a25e1';
  console.log(`Searching for [${searchString}] in all tables...`);

  const res = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND (data_type = 'text' OR data_type = 'character varying' OR data_type = 'uuid')
  `);

  for (const row of res.rows) {
    const { table_name, column_name } = row;
    try {
      const checkRes = await client.query(`SELECT 1 FROM "${table_name}" WHERE "${column_name}"::text = $1 LIMIT 1`, [searchString]);
      if (checkRes.rowCount > 0) {
        console.log(`✅ FOUND in table [${table_name}], column [${column_name}]`);
      }
    } catch (e) {
      // Skip errors for tables we can't query
    }
  }

  console.log('Search complete.');
  await client.end();
}

main().catch(console.error);
