const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function queryRecentCheckpoints() {
  const prisma = getSharedPrismaClient();

  console.log('Querying checkpoints columns...');
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'ai' AND table_name = 'checkpoints';
  `);
  console.log('Columns:', cols);

  const maxD = await prisma.$queryRawUnsafe(`SELECT MAX(created_at) as max_date, COUNT(*) as cnt FROM ai.checkpoints;`);
  console.log('Max date in checkpoints:', maxD);

  const recent = await prisma.$queryRawUnsafe(`
    SELECT thread_id, checkpoint_id, state, created_at
    FROM ai.checkpoints
    ORDER BY created_at DESC
    LIMIT 3;
  `);
  console.log('Last 3 checkpoints overall:');
  for (const r of recent) {
    console.log(`\nCheckpoint: ${r.checkpoint_id} | Time: ${r.created_at}`);
    const str = JSON.stringify(r.state);
    console.log(str.slice(0, 400));
  }

  process.exit(0);
}

queryRecentCheckpoints().catch(e => { console.error(e); process.exit(1); });
