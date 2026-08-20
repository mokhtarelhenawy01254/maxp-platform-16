const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { ensureLocalPostgres } = require('./services/ensureLocalPostgres');

async function test() {
  console.log('Starting test...');
  try {
    const result = await ensureLocalPostgres();
    console.log('Result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
