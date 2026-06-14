const cron = require('node-cron');
const aiServiceAdminClient = require('../services/aiServiceAdminClient');

async function runProductEmbeddingSync() {
  console.log('🔄 [EMBEDDING-CRON] Starting product embedding backfill...');
  try {
    const result = await aiServiceAdminClient.triggerProductEmbeddingSync(null);
    if (result?.started === false) {
      console.log(`⏭️  [EMBEDDING-CRON] Skipped — already running (${result.reason})`);
    } else {
      console.log('✅ [EMBEDDING-CRON] Backfill job triggered successfully');
    }
  } catch (err) {
    console.error('❌ [EMBEDDING-CRON] Failed to trigger backfill:', err?.message);
  }
}

function start() {
  // Run daily at 03:00 AM
  cron.schedule('0 3 * * *', runProductEmbeddingSync, { timezone: 'Africa/Cairo' });
  console.log('✅ [EMBEDDING-CRON] Product embedding cron started (daily at 03:00 Cairo time)');
}

module.exports = { start, runProductEmbeddingSync };
