const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
  console.log('--- FETCHING LATEST AI SANDBOX SESSIONS ---');
  try {
    const latestSessions = await prisma.aiSandboxSession.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (latestSessions.length === 0) {
      console.log('No sandbox sessions found.');
      return;
    }

    for (const session of latestSessions) {
      console.log(`\n========================================`);
      console.log(`SESSION ID: ${session.id}`);
      console.log(`TITLE: ${session.title}`);
      console.log(`AGENT: ${session.agentName} (${session.agentRole}) | ID: ${session.agentId}`);
      console.log(`MODEL: ${session.model} | PROVIDER: ${session.provider}`);
      console.log(`CREATED AT: ${session.createdAt}`);
      console.log(`MESSAGES COUNT: ${session.messages.length}`);
      console.log(`----------------------------------------`);
      
      for (const msg of session.messages) {
        console.log(`[${msg.createdAt.toISOString()}] ${msg.role.toUpperCase()}:`);
        console.log(msg.content);
        if (msg.toolCalls) {
          console.log(`>> TOOL CALLS:`, msg.toolCalls);
        }
        if (msg.metadata) {
          console.log(`>> METADATA:`, JSON.stringify(msg.metadata, null, 2));
        }
        console.log(`----------------------------------------`);
      }
    }
  } catch (error) {
    console.error('Error fetching sandbox data:', error);
  }

  console.log('\n--- FETCHING RELEVANT COMPANY AGENTS ---');
  try {
    const agents = await prisma.companyAgent.findMany({
      where: {
        id: { in: ['agent_03os8s_8', 'agent_z95yep_15', 'agent_03os8s_7'] }
      }
    });
    for (const a of agents) {
      console.log(`Agent ID: ${a.id} | Name: ${a.name} | Role: ${a.role} | Status: ${a.status}`);
      console.log(`Allowed Tools: ${a.skills}`);
      console.log(`Rules: ${a.rules}`);
      console.log(`Soul: ${a.soul}`);
      console.log('----------------------------------------');
    }
  } catch (error) {
    console.error('Error fetching company agents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
