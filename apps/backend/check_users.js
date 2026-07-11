const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const client = new Client({ connectionString: 'postgresql://postgres:0165676135@localhost:5432/max' });
async function main() {
  await client.connect();
  const users = await client.query(`
    SELECT u.id, u.email, u."firstName", u."lastName", u."companyId", c.name as "companyName"
    FROM users u
    LEFT JOIN companies c ON u."companyId" = c.id
    WHERE u."companyId" IS NOT NULL
    LIMIT 10
  `);
  console.log(JSON.stringify(users.rows, null, 2));
  await client.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
