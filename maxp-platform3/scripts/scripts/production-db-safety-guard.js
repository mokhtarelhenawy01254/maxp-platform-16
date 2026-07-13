/**
 * @file production-db-safety-guard.js
 * @description CRITICAL: Prevents accidental db push / migrate reset in production.
 *
 * Usage:
 *   node scripts/production-db-safety-guard.js [command]
 *
 * If NODE_ENV=production or DATABASE_URL contains prod/staging/live host,
 * this script will BLOCK dangerous commands unless SAFETY_OVERRIDE=true.
 */

const DANGEROUS_COMMANDS = ['db push', 'migrate reset', 'migrate dev', 'db execute'];

function isProductionEnvironment() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

  const prodIndicators = [
    'production',
    'staging',
    'live',
    'prod-',
    '-prod',
    'render.com',
    'railway.app',
    'heroku',
    'aws',
    'amazon',
    'rds.amazonaws.com',
    'gcp',
    'google',
    'cloudsql',
    'azure',
    'neon.tech',
    'supabase.co',
    'planetscale',
  ];

  const isProdEnv = nodeEnv === 'production' || nodeEnv === 'staging';
  const isProdDb = prodIndicators.some(ind => dbUrl.toLowerCase().includes(ind.toLowerCase()));

  return { isProdEnv, isProdDb, nodeEnv, dbUrl: dbUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@') };
}

function main() {
  const command = process.argv[2] || '';
  const override = process.env.SAFETY_OVERRIDE === 'true';

  const { isProdEnv, isProdDb, nodeEnv, dbUrl } = isProductionEnvironment();
  const isDangerous = DANGEROUS_COMMANDS.some(cmd => command.toLowerCase().includes(cmd.toLowerCase()));

  console.log('[DB-SAFETY] Environment:', nodeEnv);
  console.log('[DB-SAFETY] Database:', dbUrl);
  console.log('[DB-SAFETY] Command:', command || '(none)');

  if (!isDangerous) {
    console.log('[DB-SAFETY] ✅ Command is not in the dangerous list. Proceed with caution.');
    process.exit(0);
  }

  if (!isProdEnv && !isProdDb) {
    console.log('[DB-SAFETY] ✅ Development environment detected. Proceeding...');
    process.exit(0);
  }

  if (override) {
    console.log('[DB-SAFETY] ⚠️  SAFETY_OVERRIDE=true. You are in a PRODUCTION environment.');
    console.log('[DB-SAFETY] ⚠️  Make sure you have a BACKUP before proceeding!');
    process.exit(0);
  }

  console.error('[DB-SAFETY] ❌ BLOCKED: Dangerous command in production environment!');
  console.error('[DB-SAFETY] Command:', command);
  console.error('[DB-SAFETY] NODE_ENV:', nodeEnv);
  console.error('[DB-SAFETY] DATABASE_URL:', dbUrl);
  console.error('[DB-SAFETY] ');
  console.error('[DB-SAFETY] To override (AT YOUR OWN RISK):');
  console.error('  SAFETY_OVERRIDE=true node scripts/production-db-safety-guard.js "' + command + '"');
  console.error('[DB-SAFETY] ');
  console.error('[DB-SAFETY] For safe production migrations, use:');
  console.error('  npx prisma migrate deploy');
  process.exit(1);
}

main();
