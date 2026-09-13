/**
 * Agent Activity & Error Diagnostics Script
 * 
 * Inspects all agent execution layers across MaxP:
 * 1. Self-review logs & violations (ai.self_review_log)
 * 2. Telemetry traces and tool error spans (telemetry_spans)
 * 3. Marketing AI & Meta publish runs (facebook_ads_ai_draft_runs & publish_requests)
 * 4. Customer Care AI interactions & human handoffs (ai_interactions)
 * 5. Recent error events across all agents
 * 
 * Usage:
 *   node apps/backend/scripts/diagnose_agent_activity.cjs [hours]
 *   Default hours: 24 (Today / Last 24 Hours)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const HOURS = parseInt(process.argv[2] || '24', 10);
const sinceDate = new Date(Date.now() - HOURS * 3600 * 1000);

async function runDiagnostics() {
  console.log(`\n======================================================`);
  console.log(`🤖 MAXP AGENT OBSERVABILITY & ERROR DIAGNOSTICS`);
  console.log(`📅 Scope: Last ${HOURS} hours (Since ${sinceDate.toISOString()})`);
  console.log(`======================================================\n`);

  const prisma = getSharedPrismaClient();
  const summary = {
    selfReview: { total: 0, errors: 0, rejected: 0, corrected: 0, approved: 0, violationsList: [] },
    telemetrySpans: { total: 0, errors: 0, failedTools: [] },
    marketingAi: { totalDrafts: 0, failedDrafts: 0, fallbacks: 0, publishFailures: 0, issues: [] },
    customerCare: { totalInteractions: 0, humanHandoffs: 0, negativeSentiment: 0, recentEscalations: [] },
  };

  // 1. Self-Review Log Inspection
  try {
    const reviewLogs = await prisma.$queryRawUnsafe(`
      SELECT id, company_id, agent_id, agent_slug, reply_preview, model_used, latency_ms, status, violations, reason, created_at
      FROM ai.self_review_log
      WHERE created_at >= $1
      ORDER BY created_at DESC
      LIMIT 100;
    `, sinceDate);

    summary.selfReview.total = reviewLogs.length;
    for (const log of reviewLogs) {
      if (log.status === 'error') summary.selfReview.errors++;
      else if (log.status === 'rejected') summary.selfReview.rejected++;
      else if (log.status === 'corrected') summary.selfReview.corrected++;
      else if (log.status === 'approved') summary.selfReview.approved++;

      if (log.status !== 'approved' && (log.violations || log.reason)) {
        summary.selfReview.violationsList.push({
          time: log.created_at,
          agent: log.agent_slug || log.agent_id,
          status: log.status,
          violations: log.violations,
          reason: log.reason,
          replyPreview: log.reply_preview ? log.reply_preview.slice(0, 100) : ''
        });
      }
    }
  } catch (err) {
    console.warn(`[SelfReviewLog] Warning: Could not query ai.self_review_log: ${err.message}`);
  }

  // 2. Telemetry Spans (Tool Failures & LLM Errors)
  try {
    const errorSpans = await prisma.$queryRawUnsafe(`
      SELECT s.id, s."traceId", s.name, s.type, s.status, s.error, s."latencyMs", s."createdAt", t."companyId", t.channel
      FROM telemetry_spans s
      LEFT JOIN telemetry_traces t ON s."traceId" = t.id
      WHERE s.status = 'ERROR' AND s."createdAt" >= $1
      ORDER BY s."createdAt" DESC
      LIMIT 50;
    `, sinceDate);

    summary.telemetrySpans.errors = errorSpans.length;
    summary.telemetrySpans.failedTools = errorSpans.map(s => ({
      time: s.createdAt,
      name: s.name,
      type: s.type,
      channel: s.channel,
      companyId: s.companyId,
      error: s.error ? s.error.slice(0, 200) : 'Unknown error',
      latencyMs: s.latencyMs
    }));
  } catch (err) {
    console.warn(`[TelemetrySpans] Warning: Could not query telemetry_spans: ${err.message}`);
  }

  // 3. Marketing AI & Meta Publish Requests
  try {
    const failedDrafts = await prisma.$queryRawUnsafe(`
      SELECT id, "companyId", status, "usedFallback", "fallbackReason", "errorMessage", "latencyMs", "createdAt"
      FROM facebook_ads_ai_draft_runs
      WHERE "createdAt" >= $1 AND (status = 'FAILED' OR "usedFallback" = true)
      ORDER BY "createdAt" DESC
      LIMIT 50;
    `, sinceDate);

    summary.marketingAi.failedDrafts = failedDrafts.filter(d => d.status === 'FAILED').length;
    summary.marketingAi.fallbacks = failedDrafts.filter(d => d.usedFallback).length;
    for (const d of failedDrafts) {
      summary.marketingAi.issues.push({
        type: 'DRAFT_RUN',
        id: d.id,
        status: d.status,
        usedFallback: d.usedFallback,
        fallbackReason: d.fallbackReason,
        error: d.errorMessage,
        createdAt: d.createdAt
      });
    }

    const failedPublishes = await prisma.$queryRawUnsafe(`
      SELECT id, "companyId", status, "errorMessage", step, "partialSuccess", "createdAt"
      FROM facebook_ads_publish_requests
      WHERE "createdAt" >= $1 AND (status = 'FAILED' OR "errorMessage" IS NOT NULL)
      ORDER BY "createdAt" DESC
      LIMIT 50;
    `, sinceDate);

    summary.marketingAi.publishFailures = failedPublishes.length;
    for (const p of failedPublishes) {
      summary.marketingAi.issues.push({
        type: 'META_PUBLISH',
        id: p.id,
        status: p.status,
        step: p.step,
        error: p.errorMessage,
        createdAt: p.createdAt
      });
    }
  } catch (err) {
    console.warn(`[MarketingAI] Warning: Could not query marketing ledger: ${err.message}`);
  }

  // 4. Customer Care AI (Interactions & Human Handoffs)
  try {
    const interactions = await prisma.$queryRawUnsafe(`
      SELECT id, "companyId", "userMessage", "aiResponse", intent, sentiment, confidence, "requiresHumanIntervention", "createdAt", "modelUsed"
      FROM ai_interactions
      WHERE "createdAt" >= $1 AND ("requiresHumanIntervention" = true OR sentiment IN ('negative', 'very_negative'))
      ORDER BY "createdAt" DESC
      LIMIT 50;
    `, sinceDate);

    summary.customerCare.humanHandoffs = interactions.filter(i => i.requiresHumanIntervention).length;
    summary.customerCare.negativeSentiment = interactions.filter(i => i.sentiment === 'negative' || i.sentiment === 'very_negative').length;
    summary.customerCare.recentEscalations = interactions.slice(0, 10).map(i => ({
      time: i.createdAt,
      companyId: i.companyId,
      userMessage: i.userMessage ? i.userMessage.slice(0, 80) : '',
      aiResponse: i.aiResponse ? i.aiResponse.slice(0, 80) : '',
      sentiment: i.sentiment,
      confidence: i.confidence,
      requiresHumanIntervention: i.requiresHumanIntervention
    }));
  } catch (err) {
    console.warn(`[CustomerCare] Warning: Could not query ai_interactions: ${err.message}`);
  }

  // Format and print findings
  console.log(`📊 1. AGENT SELF-REVIEW (LLM-as-Judge):`);
  console.log(`   - Total Turns Inspected: ${summary.selfReview.total}`);
  console.log(`   - Approved: ${summary.selfReview.approved}`);
  console.log(`   - Self-Corrected: ${summary.selfReview.corrected}`);
  console.log(`   - Rejected: ${summary.selfReview.rejected}`);
  console.log(`   - Execution Errors: ${summary.selfReview.errors}`);
  if (summary.selfReview.violationsList.length > 0) {
    console.log(`   ⚠️ Flagged Cases (${summary.selfReview.violationsList.length}):`);
    summary.selfReview.violationsList.slice(0, 5).forEach((v, i) => {
      console.log(`      [${i+1}] ${v.time.toISOString()} | Agent: ${v.agent} | Status: ${v.status}`);
      console.log(`          Reason: ${v.reason || 'N/A'}`);
      if (v.violations && v.violations.length) console.log(`          Violations: ${JSON.stringify(v.violations)}`);
    });
  } else {
    console.log(`   ✅ No violations or self-review rejections detected.`);
  }

  console.log(`\n⚙️ 2. TELEMETRY SPANS & TOOL CALLS:`);
  console.log(`   - Failed Spans / Tool Errors: ${summary.telemetrySpans.errors}`);
  if (summary.telemetrySpans.failedTools.length > 0) {
    summary.telemetrySpans.failedTools.slice(0, 5).forEach((f, i) => {
      console.log(`      [${i+1}] ${f.time.toISOString()} | Tool: ${f.name} (${f.type}) | Channel: ${f.channel}`);
      console.log(`          Error: ${f.error}`);
    });
  } else {
    console.log(`   ✅ All tool calls executed cleanly without unhandled errors.`);
  }

  console.log(`\n📣 3. MARKETING AI & META ADS:`);
  console.log(`   - Failed Draft Runs: ${summary.marketingAi.failedDrafts}`);
  console.log(`   - Fallback Triggered: ${summary.marketingAi.fallbacks}`);
  console.log(`   - Meta API Publish Failures: ${summary.marketingAi.publishFailures}`);
  if (summary.marketingAi.issues.length > 0) {
    summary.marketingAi.issues.slice(0, 5).forEach((issue, i) => {
      console.log(`      [${i+1}] ${issue.type} | ID: ${issue.id} | Status: ${issue.status}`);
      if (issue.fallbackReason) console.log(`          Fallback Reason: ${issue.fallbackReason}`);
      if (issue.error) console.log(`          Error: ${issue.error}`);
    });
  } else {
    console.log(`   ✅ No marketing AI or Meta publish failures.`);
  }

  console.log(`\n💬 4. CUSTOMER CARE AI & HANDOFFS:`);
  console.log(`   - Escalated to Human: ${summary.customerCare.humanHandoffs}`);
  console.log(`   - Negative Sentiment: ${summary.customerCare.negativeSentiment}`);
  if (summary.customerCare.recentEscalations.length > 0) {
    summary.customerCare.recentEscalations.slice(0, 5).forEach((esc, i) => {
      console.log(`      [${i+1}] ${esc.time.toISOString()} | Sentiment: ${esc.sentiment} | Confidence: ${esc.confidence}`);
      console.log(`          Customer: "${esc.userMessage}"`);
      console.log(`          AI: "${esc.aiResponse}"`);
    });
  } else {
    console.log(`   ✅ No escalations or negative friction detected.`);
  }

  // 5. PM2 Runtime Log Scanner (LLM 429 Rate Limits, 502/500 errors, SSL handshake failures)
  const fs = require('fs');
  const { execSync } = require('child_process');
  const pm2Issues = [];

  try {
    const logFiles = [
      '/root/.pm2/logs/maxp-ai-service-error.log',
      '/root/.pm2/logs/maxp-ai-service-out.log',
      '/root/.pm2/logs/maxp-backend-error-16.log',
      '/root/.pm2/logs/maxp-backend-out-16.log',
    ];

    // Also include today's rotated logs if they exist
    try {
      const globFiles = fs.readdirSync('/root/.pm2/logs');
      for (const f of globFiles) {
        if (f.includes(new Date().toISOString().slice(0, 10)) && !logFiles.includes(`/root/.pm2/logs/${f}`)) {
          logFiles.push(`/root/.pm2/logs/${f}`);
        }
      }
    } catch (_) {}

    for (const logFile of logFiles) {
      if (fs.existsSync(logFile)) {
        try {
          const content = fs.readFileSync(logFile, 'utf8');
          const lines = content.split('\n');
          for (let i = Math.max(0, lines.length - 300); i < lines.length; i++) {
            const line = lines[i];
            if (
              line.includes('429 Too Many Requests') ||
              line.includes('Rate Limit') ||
              line.includes('502 Bad Gateway') ||
              line.includes('InterfaceError') ||
              line.includes('write EPROTO') ||
              line.includes('Error in Facebook Ads AI') ||
              line.includes('Failed to communicate with AI Media Buyer')
            ) {
              pm2Issues.push({
                file: path.basename(logFile),
                line: line.trim()
              });
            }
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn(`[PM2Logs] Warning: Could not inspect PM2 logs: ${err.message}`);
  }

  console.log(`\n🖥️ 5. SERVER RUNTIME & PM2 LOGS:`);
  console.log(`   - Runtime Anomalies Detected: ${pm2Issues.length}`);
  if (pm2Issues.length > 0) {
    // Unique issues
    const uniqueIssues = [...new Set(pm2Issues.map(i => `[${i.file}] ${i.line}`))];
    uniqueIssues.slice(0, 6).forEach((issue, i) => {
      console.log(`      ⚠️ ${issue}`);
    });
  } else {
    console.log(`   ✅ No rate-limit, 502, or critical runtime exceptions in PM2 logs.`);
  }

  console.log(`\n======================================================`);
  const totalIssues = summary.selfReview.errors + summary.selfReview.rejected +
                      summary.telemetrySpans.errors + summary.marketingAi.failedDrafts +
                      summary.marketingAi.publishFailures + pm2Issues.length;

  if (totalIssues === 0) {
    console.log(`🟢 HEALTH STATUS: OPTIMAL (0 critical errors detected in last ${HOURS}h)`);
  } else {
    console.log(`🟡 HEALTH STATUS: ATTENTION NEEDED (${totalIssues} issues/warnings detected in last ${HOURS}h)`);
  }
  console.log(`======================================================\n`);

  process.exit(0);
}

runDiagnostics().catch(err => {
  console.error(`❌ Diagnostics failed:`, err);
  process.exit(1);
});
