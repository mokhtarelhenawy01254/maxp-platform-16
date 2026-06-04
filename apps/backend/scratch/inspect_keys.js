const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
  console.log('--- ALL AI KEYS ---');
  try {
    const keys = await prisma.aiKey.findMany();
    for (const key of keys) {
      console.log(`Key ID: ${key.id} | Name: ${key.name} | Provider: ${key.provider} | KeyType: ${key.keyType}`);
      console.log(`IsActive: ${key.isActive} | Priority: ${key.priority} | Usage: ${key.currentUsage}/${key.maxRequestsPerDay}`);
      console.log('----------------------------------------');
    }

    console.log('\n--- ALL MODEL CONFIGS ---');
    const configs = await prisma.aiModelConfig.findMany({
      include: { aiKey: true }
    });
    for (const c of configs) {
      console.log(`Model: ${c.modelName} | Enabled: ${c.isEnabled} | Priority: ${c.priority} | Key Name: ${c.aiKey.name}`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
