const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function revertPriorities() {
  const prisma = getSharedPrismaClient();
  
  const groqKey = await prisma.aiKey.findFirst({
    where: { provider: 'GROQ', isActive: true }
  });
  
  if (!groqKey) {
    console.log('No active GROQ key found');
    return;
  }
  
  console.log('GROQ Key:', groqKey.id, groqKey.name);
  
  const modelConfigs = await prisma.aiModelConfig.findMany({
    where: { keyId: groqKey.id, isEnabled: true },
    orderBy: { priority: 'asc' }
  });
  
  console.log('Current models:');
  for (const mc of modelConfigs) {
    console.log(`  ${mc.modelName} - priority ${mc.priority}`);
  }
  
  // Revert: gpt-oss should be 1, llama should be 2
  for (const mc of modelConfigs) {
    if (mc.modelName.includes('gpt-oss')) {
      await prisma.aiModelConfig.update({
        where: { id: mc.id },
        data: { priority: 1 }
      });
      console.log(`Set ${mc.modelName} to priority 1`);
    } else if (mc.modelName.includes('llama-3.3-70b')) {
      await prisma.aiModelConfig.update({
        where: { id: mc.id },
        data: { priority: 2 }
      });
      console.log(`Set ${mc.modelName} to priority 2`);
    }
  }
  
  const updated = await prisma.aiModelConfig.findMany({
    where: { keyId: groqKey.id, isEnabled: true },
    orderBy: { priority: 'asc' }
  });
  
  console.log('\nUpdated models:');
  for (const mc of updated) {
    console.log(`  ${mc.modelName} - priority ${mc.priority}`);
  }
}

revertPriorities()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
