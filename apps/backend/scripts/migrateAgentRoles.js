/**
 * Migration Script: agent_roles table creation & sync
 * Context: Migration from class-based agents to config-driven agents
 * Action: Creates table, seeds from templates, syncs company_agents canonical tools
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const agentProfileLoaderService = require('../legacy-ai-agent/aiAgent/agentProfileLoaderService');

async function migrate() {
  const prisma = getSharedPrismaClient();

  try {
    // Step 1: Check if table exists and create if not
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_roles'
      );
    `;

    if (!tableExists[0]?.exists) {
      console.log('[MIGRATION] Creating agent_roles table...');
      await prisma.$executeRaw`
        CREATE TABLE "agent_roles" (
          "id" SERIAL PRIMARY KEY,
          "role" VARCHAR(50) UNIQUE NOT NULL,
          "slug" VARCHAR(100) NOT NULL,
          "name" VARCHAR(200) NOT NULL,
          "nameAr" VARCHAR(200),
          "allowedTools" JSONB NOT NULL DEFAULT '[]',
          "allowedSkills" JSONB NOT NULL DEFAULT '[]',
          "modelPolicy" JSONB DEFAULT '{}',
          "personaMeta" JSONB DEFAULT '{}',
          "guardrails" JSONB DEFAULT '{}',
          "channels" JSONB DEFAULT '[]',
          "budget" JSONB DEFAULT '{}',
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      console.log('[MIGRATION] agent_roles table created.');
    } else {
      console.log('[MIGRATION] agent_roles table already exists. Skipping creation.');
    }

    // Step 1.5: Ensure "allowedTools" column exists in "company_agents" table
    console.log('[MIGRATION] Ensuring "allowedTools" column exists in "company_agents"...');
    await prisma.$executeRaw`
      ALTER TABLE "company_agents" 
      ADD COLUMN IF NOT EXISTS "allowedTools" JSONB NOT NULL DEFAULT '[]';
    `;
    console.log('[MIGRATION] "allowedTools" column verified/created.');

    // Step 2: Load templates and upsert into agent_roles
    const profiles = agentProfileLoaderService.listProfiles();

    for (const profile of profiles) {
      await prisma.agentRole.upsert({
        where: { role: profile.role },
        update: {
          slug: profile.slug,
          name: profile.name,
          nameAr: profile.name, // Use existing name as fallback
          allowedTools: profile.allowedTools,
          allowedSkills: profile.allowedSkills,
          modelPolicy: profile.modelPolicy || {},
          personaMeta: profile.personaMeta || {},
          guardrails: profile.guardrails || {},
          channels: profile.channels || [],
          budget: profile.budget || {},
          updatedAt: new Date(),
        },
        create: {
          role: profile.role,
          slug: profile.slug,
          name: profile.name,
          nameAr: profile.name,
          allowedTools: profile.allowedTools,
          allowedSkills: profile.allowedSkills,
          modelPolicy: profile.modelPolicy || {},
          personaMeta: profile.personaMeta || {},
          guardrails: profile.guardrails || {},
          channels: profile.channels || [],
          budget: profile.budget || {},
        },
      });
      console.log(`[MIGRATION] Synced role: ${profile.role}`);
    }

    // Step 3: Update stale company_agents with canonical tools from agent_roles
    const affected = await prisma.$executeRaw`
      UPDATE "company_agents" ca
      SET "allowedTools" = COALESCE(
        (
          SELECT "allowedTools" FROM "agent_roles" ar
          WHERE ar.role = ca.role
        ),
        '[]'
      )
      WHERE ca.role IN ('SAS_SALES', 'SALES', 'SUPPORT', 'CEO')
      AND ca.status != 'ARCHIVED'
    `;

    console.log(`[MIGRATION] Updated ${affected} company_agents with canonical tools.`);

  } catch (err) {
    console.error('[MIGRATION] Error during migration:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

// Step 4: Run if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('[MIGRATION] Complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[MIGRATION] Failed:', err);
      process.exit(1);
    });
}

module.exports = { migrate };
