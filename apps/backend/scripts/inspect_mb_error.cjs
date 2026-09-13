const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function inspectMediaBuyerErrors() {
  const prisma = getSharedPrismaClient();

  console.log('\n=============================================');
  console.log('🔍 DEEP INSPECTION: MEDIA BUYER ERRORS TODAY');
  console.log('=============================================\n');

  // 1. Check facebook_ads_ai_chat_messages for any messages created today
  try {
    const today = new Date(Date.now() - 24 * 3600 * 1000);
    const messages = await prisma.$queryRawUnsafe(`
      SELECT m.id, m."sessionId", m.role, m.content, m."toolCalls", m."toolResults", m."createdAt", s."companyId", s.title
      FROM facebook_ads_ai_chat_messages m
      JOIN facebook_ads_ai_chat_sessions s ON m."sessionId" = s.id
      WHERE m."createdAt" >= $1
      ORDER BY m."createdAt" DESC
      LIMIT 100;
    `, today);

    console.log(`Found ${messages.length} messages in the last 24h:`);
    for (const msg of messages) {
      const isError = (msg.content && (msg.content.includes('خطأ') || msg.content.includes('فشل') || msg.content.toLowerCase().includes('error'))) ||
                      (msg.toolResults && JSON.stringify(msg.toolResults).toLowerCase().includes('error'));
      
      const badge = isError ? '❌ [ERROR/ALERT]' : '💬 [NORMAL]';
      console.log(`\n${badge} Time: ${msg.createdAt.toISOString()} | Role: ${msg.role} | Company: ${msg.companyId} | Session: ${msg.sessionId}`);
      console.log(`Content: ${msg.content || ''}`);
      if (msg.toolCalls) {
        console.log(`ToolCalls: ${JSON.stringify(msg.toolCalls, null, 2)}`);
      }
      if (msg.toolResults) {
        console.log(`ToolResults: ${JSON.stringify(msg.toolResults, null, 2)}`);
      }
    }
  } catch (err) {
    console.error('Error querying chat messages:', err.message);
  }

  // 2. Check all sessions updated today
  try {
    const sessions = await prisma.$queryRawUnsafe(`
      SELECT id, "companyId", title, status, context, "updatedAt"
      FROM facebook_ads_ai_chat_sessions
      ORDER BY "updatedAt" DESC
      LIMIT 10;
    `);
    console.log('\n--- Recent Sessions ---');
    console.log(sessions);
  } catch (err) {
    console.error('Error querying sessions:', err.message);
  }

  // 3. Check facebook_ads_ai_draft_runs (all of them recently, not just last 24h)
  try {
    const drafts = await prisma.$queryRawUnsafe(`
      SELECT id, "companyId", status, "usedFallback", "fallbackReason", "errorMessage", "createdAt"
      FROM facebook_ads_ai_draft_runs
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `);
    console.log('\n--- Recent Draft Runs (Last 10) ---');
    console.log(drafts);
  } catch (err) {
    console.error('Error querying draft runs:', err.message);
  }

  // 4. Check facebook_ads_publish_requests (Last 10)
  try {
    const publishes = await prisma.$queryRawUnsafe(`
      SELECT id, "companyId", status, "errorMessage", step, "createdAt"
      FROM facebook_ads_publish_requests
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `);
    console.log('\n--- Recent Publish Requests (Last 10) ---');
    console.log(publishes);
  } catch (err) {
    console.error('Error querying publish requests:', err.message);
  }

  process.exit(0);
}

inspectMediaBuyerErrors().catch(e => {
  console.error(e);
  process.exit(1);
});
