const agentProvisioningService = require('../legacy-ai-agent/aiAgent/agentProvisioningService');
const agentManagerService = require('../legacy-ai-agent/aiAgent/agentManagerService');

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();
  try {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    });
    console.log(`Found ${companies.length} companies in DB:`);
    for (const c of companies) {
      console.log(`- Company ID: ${c.id} | Name: ${c.name}`);
    }

    console.log('\n--- LISTING ALL IN-MEMORY AND DATABASE AGENTS ---');
    const dbAgents = await prisma.companyAgent.findMany({
      where: { status: { not: 'ARCHIVED' } }
    });
    console.log(`Found ${dbAgents.length} active agents in DB:`);
    for (const dbAgent of dbAgents) {
      console.log(`\nAgent ID: ${dbAgent.id} | Company ID: ${dbAgent.companyId} | Name: ${dbAgent.name} | Role: ${dbAgent.role}`);
      console.log(`Allowed Skills (DB): ${dbAgent.skills}`);
      
      // Let's hydrate and check in-memory status
      await agentManagerService.getManagerContext(dbAgent.companyId).catch(() => {});
      const memoryAgent = agentProvisioningService.getAgent(dbAgent.companyId, dbAgent.id);
      if (memoryAgent) {
        console.log(`Memory Allowed Tools:`, memoryAgent.getTools());
        console.log(`Memory Allowed Skills:`, memoryAgent.getSkills());
      } else {
        console.log(`Memory State: NOT FOUND IN REGISTER`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
  process.exit(0);
}

main();
