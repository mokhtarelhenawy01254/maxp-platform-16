const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL || 'postgresql://appuser:mokhtar1234@localhost:5432/maxp' });

async function main() {
  const [{ rows: r1 }, { rows: r2 }, { rows: r3 }] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int as cnt FROM products WHERE "mainImage" ~ '/uploads/products/' OR images ~ '/uploads/products/'`),
    pool.query(`SELECT COUNT(*)::int as cnt FROM products WHERE images IS NOT NULL AND images != '[]' AND images != '' AND images != 'null'`),
    pool.query('SELECT COUNT(*)::int as cnt FROM products'),
  ]);
  console.log('Products still with local image refs:', r1[0].cnt);
  console.log('Products with any images:', r2[0].cnt);
  console.log('Total products:', r3[0].cnt);
  await pool.end();
}
main().catch(console.error);
