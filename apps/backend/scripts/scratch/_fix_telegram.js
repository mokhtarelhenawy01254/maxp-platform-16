const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const p = new PrismaClient();
p.$executeRawUnsafe('ALTER TABLE telegram_configs ADD COLUMN IF NOT EXISTS temp_auth_session TEXT')
  .then(r => { console.log('Added column:', r); return p.$disconnect(); })
  .catch(e => { console.log('Error:', e.message); return p.$disconnect(); });
