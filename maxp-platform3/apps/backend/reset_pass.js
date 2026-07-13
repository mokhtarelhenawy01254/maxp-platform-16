const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/max' });
async function main() {
  await client.connect();
  const hash = await bcrypt.hash('test123', 10);
  const result = await client.query("UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email", [hash, 'm1@gmail.com']);
  console.log(JSON.stringify(result.rows, null, 2));
  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
