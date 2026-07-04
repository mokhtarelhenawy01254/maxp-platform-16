const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/max' });
async function main() {
  await client.connect();
  const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='orders'`);
  console.log("Columns:", JSON.stringify(cols.rows.map(r=>r.column_name)));
  const orders = await client.query(`SELECT * FROM orders LIMIT 1`);
  console.log("Sample:", JSON.stringify(orders.rows[0], null, 2));
  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
