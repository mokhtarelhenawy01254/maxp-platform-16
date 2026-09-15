require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
  const prisma = getSharedPrismaClient();
  const sessionId = 'maxp_inventory_studio_sess_1789280382962_kdhw5';
  console.log('Searching for session:', sessionId);

  try {
    const sessions = await prisma.$queryRawUnsafe('SELECT * FROM public.agent_studio_sessions WHERE id = $1', sessionId);
    console.log('Session count:', sessions.length);
    if (sessions.length > 0) {
      console.log('Session metadata:', JSON.stringify(sessions[0], null, 2));
    }

    const messages = await prisma.$queryRawUnsafe('SELECT * FROM public.agent_studio_messages WHERE "sessionId" = $1 ORDER BY "createdAt" ASC', sessionId);
    console.log('Messages count:', messages.length);
    for (const m of messages) {
      console.log(`\n=== ROLE: ${m.role} (${m.createdAt}) ===`);
      console.log(m.content);
      if (m.toolCalls) {
        console.log('Tool Calls:', JSON.stringify(m.toolCalls, null, 2));
      }
    }

    // Also check if any recent sessions were created in agent_studio_sessions
    const recent = await prisma.$queryRawUnsafe('SELECT id, title, "createdAt" FROM public.agent_studio_sessions ORDER BY "createdAt" DESC LIMIT 5');
    console.log('\n--- Recent sessions ---');
    console.log(JSON.stringify(recent, null, 2));

    // Also check ai.agents
    const agents = await prisma.$queryRawUnsafe(`
      SELECT id, name, role, template_slug, company_id, allowed_tools, allowed_skills 
      FROM ai.agents 
      WHERE role = 'INVENTORY' OR template_slug = 'inventory-pricing-agent'
      LIMIT 10
    `);
    console.log('\n--- Active INVENTORY agents ---');
    console.log(JSON.stringify(agents, null, 2));

  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
