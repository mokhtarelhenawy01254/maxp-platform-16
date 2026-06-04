
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection("mysql://u339372869_Archive:0190711037Aa@srv1812.hstgr.io:3306/u339372869_Archive");

  const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', ['admin@admin.com']);
  if (rows.length > 0) {
    console.log('Found user in MYSQL Archive:');
    console.log(rows[0]);
  } else {
    console.log('User admin@admin.com NOT found in MYSQL Archive.');
  }

  const [products] = await connection.execute('SELECT COUNT(*) as count FROM products');
  console.log(`Product count in Archive: ${products[0].count}`);

  await connection.end();
}

main().catch(console.error);
