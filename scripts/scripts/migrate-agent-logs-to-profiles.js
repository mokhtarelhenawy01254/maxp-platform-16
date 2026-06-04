/**
 * @file migrate-agent-logs-to-profiles.js
 * @description One-time migration: AiProviderLog (scope: agent_provision) → CompanyAgent table.
 *
 * SAFETY:
 * - Dry-run by default (set DRY_RUN=false to execute).
 * - Upsert pattern: safe to re-run without duplication.
 * - Validates JSON before parsing.
 * - Skips invalid logs with warnings.
 */

const { getSharedPrismaClient } = require('../backend/services/sharedDatabase');

const DRY_RUN = process.env.DRY_RUN !== 'false';

async function migrate() {
  const prisma = getSharedPrismaClient();

  console.log(`[MIGRATE-AGENTS] Starting migration. Dry-run: ${DRY_RUN}`);

  const logs = await prisma.aiProviderLog.findMany({
    where: { scope: 'agent_provision' },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`[MIGRATE-AGENTS] Found ${logs.length} provision log(s).`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const log of logs) {
    let meta = null;
    try {
      meta = JSON.parse(log.metadata || '{}');
    } catch (e) {
      console.warn(`[MIGRATE-AGENTS] SKIP: Invalid JSON in log ${log.id}:`, e.message);
      skipped += 1;
      continue;
    }

    if (!meta.id || !meta.role) {
      console.warn(`[MIGRATE-AGENTS] SKIP: Missing id/role in log ${log.id}`);
      skipped += 1;
      continue;
    }

    const existing = await prisma.companyAgent.findUnique({
      where: { id: meta.id },
    }).catch(() => null);

    const data = {
      id: meta.id,
      companyId: log.companyId,
      name: meta.name || `${meta.role} Agent`,
      role: meta.role,
      description: meta.description || null,
      icon: meta.icon || '🤖',
      soul: meta.soul || (meta.persona?.soulInstructions || null),
      rules: Array.isArray(meta.rules) ? JSON.stringify(meta.rules) : null,
      skills: Array.isArray(meta.allowedSkills)
        ? JSON.stringify(meta.allowedSkills)
        : (Array.isArray(meta.skills) ? JSON.stringify(meta.skills) : null),
      model: meta.model || null,
      status: log.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      parentId: meta.parentId || null,
      templateSlug: meta.templateSlug || null,
      createdBy: meta.createdBy || 'migration_script',
    };

    if (DRY_RUN) {
      console.log(`[MIGRATE-AGENTS] DRY-RUN: Would ${existing ? 'UPDATE' : 'CREATE'} agent ${meta.id} (${meta.role})`);
      if (existing) { updated += 1; } else { created += 1; }
      continue;
    }

    try {
      if (existing) {
        await prisma.companyAgent.update({
          where: { id: meta.id },
          data: {
            name: data.name,
            role: data.role,
            description: data.description,
            icon: data.icon,
            soul: data.soul,
            rules: data.rules,
            skills: data.skills,
            model: data.model,
            status: data.status,
            parentId: data.parentId,
            templateSlug: data.templateSlug,
            updatedAt: new Date(),
          },
        });
        updated += 1;
      } else {
        await prisma.companyAgent.create({ data });
        created += 1;
      }
    } catch (e) {
      console.error(`[MIGRATE-AGENTS] FAIL: Could not persist agent ${meta.id}:`, e.message);
      skipped += 1;
    }
  }

  console.log(`[MIGRATE-AGENTS] Done. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}.`);
  if (DRY_RUN) {
    console.log('[MIGRATE-AGENTS] This was a dry-run. Set DRY_RUN=false to execute for real.');
  }
}

migrate()
  .catch(err => {
    console.error('[MIGRATE-AGENTS] Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getSharedPrismaClient();
    if (prisma && prisma.$disconnect) {
      await prisma.$disconnect();
    }
    process.exit(0);
  });
