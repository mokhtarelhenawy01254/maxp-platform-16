/**
 * scripts/sync-ai-keys-to-ai-service.js
 *
 * One-time backfill: push every AiKey currently in MaxP's Prisma DB to the
 * maxp-ai-service admin API so both systems are aligned. Safe to re-run
 * (the bridge is idempotent: identical payload produces the same masked key).
 *
 * Usage:
 *   cd /var/www/backend2
 *   node scripts/sync-ai-keys-to-ai-service.js [--dry-run] [--provider=GOOGLE]
 *
 * Requires env vars on the MaxP backend:
 *   AI_SERVICE_URL, AI_SERVICE_TOKEN
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const aiServiceKeyBridge = require('../services/aiAgent/aiServiceKeyBridge');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { dryRun: false, provider: null };
  for (const arg of args) {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg.startsWith('--provider=')) out.provider = arg.split('=')[1];
  }
  return out;
}

async function main() {
  const args = parseArgs();

  if (!aiServiceKeyBridge.isConfigured()) {
    console.error('AI service is not configured. Set AI_SERVICE_URL and AI_SERVICE_TOKEN in .env');
    process.exit(1);
  }

  const healthRes = await aiServiceKeyBridge.health();
  if (!healthRes.ok) {
    console.error(`AI service health check failed: status=${healthRes.status} error=${healthRes.error || 'unknown'}`);
    process.exit(1);
  }
  console.log(`✅ AI service reachable (${healthRes.data.length} providers available)`);

  const prisma = getSharedPrismaClient();
  const where = args.provider ? { provider: args.provider } : {};
  const keys = await prisma.aiKey.findMany({
    where,
    include: { aiModelConfigs: true },
    orderBy: [{ provider: 'asc' }, { priority: 'asc' }],
  });

  console.log(`Found ${keys.length} key(s) in Prisma${args.provider ? ` for provider ${args.provider}` : ''}.`);

  if (args.dryRun) {
    console.log('--dry-run: not modifying AI service. Use --dry-run=false to actually push.');
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const key of keys) {
    const res = await aiServiceKeyBridge.createKey(key);
    if (res.ok) {
      ok += 1;
      console.log(`  ✓ ${key.provider} / ${key.name}`);
    } else {
      failed += 1;
      console.warn(`  ✗ ${key.provider} / ${key.name}: status=${res.status || '?'} ${res.error || JSON.stringify(res.data)}`);
    }
  }

  console.log(`\nDone. ok=${ok} failed=${failed}`);
  if (failed > 0) process.exit(2);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
