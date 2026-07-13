require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.POSTGRES_URL });
client.connect().then(() => {
  client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'").then(res => {
    console.log(res.rows.map(r => r.table_name).filter(n => n.includes('order_status')));
    process.exit(0);
  });
});
