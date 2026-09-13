const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function inspectThreadsAndLogs() {
  const prisma = getSharedPrismaClient();

  console.log('\n--- LATEST PROVIDER LOGS ---');
  try {
    const plogs = await prisma.$queryRawUnsafe(`
      SELECT * FROM ai.provider_logs ORDER BY created_at DESC LIMIT 10;
    `);
    console.log(plogs);
  } catch (e) {
    console.log('Provider logs error:', e.message);
  }

  console.log('\n--- LATEST THREADS FOR SWAN ---');
  try {
    const threads = await prisma.$queryRawUnsafe(`
      SELECT * FROM ai.threads 
      WHERE company_id = 'cmleybpf70028juo2wwpmp8rt' 
      ORDER BY updated_at DESC LIMIT 5;
    `);
    console.log(threads);
  } catch (e) {
    console.log('Threads error:', e.message);
  }

  process.exit(0);
}

inspectThreadsAndLogs().catch(e => { console.error(e); process.exit(1); });
