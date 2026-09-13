const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function checkAiSchema() {
  const prisma = getSharedPrismaClient();

  const aiTables = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'ai';
  `);
  console.log('Tables in schema ai:', aiTables.map(t => t.table_name));

  for (const t of aiTables) {
    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM ai."${t.table_name}"`);
    console.log(`Table ai.${t.table_name} count:`, count[0].count);
  }

  process.exit(0);
}

checkAiSchema().catch(e => { console.error(e); process.exit(1); });
