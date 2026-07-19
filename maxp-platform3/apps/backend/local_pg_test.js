
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  console.log('Testing connection to:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  try {
    await client.connect();
    console.log('✅ Basic PG connection successful');
    const res = await client.query('SELECT NOW()');
    console.log('🕒 Current time from DB:', res.rows[0]);
  } catch (err) {
    console.error('❌ Basic PG connection failed:');
    console.error(err.message);
  } finally {
    await client.end();
  }
}

test();
