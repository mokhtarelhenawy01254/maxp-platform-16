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

async function runKnowledgeEmbeddingSync() {
  console.log('🔄 [KNOWLEDGE-CRON] Starting knowledge embedding backfill...');
  try {
    const result = await aiServiceAdminClient.triggerKnowledgeEmbeddingSync(null);
    if (result?.started === false) {
      console.log(`⏭️  [KNOWLEDGE-CRON] Skipped — already running (${result.reason})`);
    } else {
      console.log('✅ [KNOWLEDGE-CRON] Knowledge backfill job triggered successfully');
    }
  } catch (err) {
    console.error('❌ [KNOWLEDGE-CRON] Failed to trigger knowledge backfill:', err?.message);
  }
}

function start() {
  cron.schedule('0 3 * * *', runProductEmbeddingSync, { timezone: 'Africa/Cairo' });
  console.log('✅ [EMBEDDING-CRON] Product embedding cron started (daily at 03:00 Cairo time)');

  cron.schedule('30 3 * * *', runKnowledgeEmbeddingSync, { timezone: 'Africa/Cairo' });
  console.log('✅ [KNOWLEDGE-CRON] Knowledge embedding cron started (daily at 03:30 Cairo time)');
}

module.exports = { start, runProductEmbeddingSync, runKnowledgeEmbeddingSync };
