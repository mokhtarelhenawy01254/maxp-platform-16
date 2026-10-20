#!/usr/bin/env node
/**
 * 🩺 template-health.js
 * أداة قراءة فقط (Read-Only) لفحص صحة قوالب واتساب لجميع الأحداث
 *
 * Usage:
 *   node apps/backend/scripts/template-health.js [--companyId <id>]
 */

const path = require('path');
const https = require('https');

// Load environment if available
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
} catch {}

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';
}

const CHECK_EVENTS = [
  { eventType: 'LOYALTY_POINTS_AWARDED', label: 'كسب نقاط ولاء', expectedVars: ['customerName', 'points'], location: 'services/hr/customerLoyaltyService.js:800' },
  { eventType: 'LOYALTY_TIER_UPGRADED', label: 'ترقية مستوى الولاء', expectedVars: ['customerName', 'tierName'], location: 'services/hr/customerLoyaltyService.js:2181' },
  { eventType: 'LOYALTY_TIER_DOWNGRADED', label: 'انخفاض مستوى الولاء', expectedVars: ['customerName', 'tierName'], location: 'services/hr/customerLoyaltyService.js:2205' },
  { eventType: 'LOYALTY_POINTS_EXPIRY_WARNING', label: 'تنبيه قرب انتهاء النقاط', expectedVars: ['customerName', 'points', 'days', 'expiryDate'], location: 'services/hr/customerNotificationScheduleService.js:210' },
  { eventType: 'LOYALTY_POINTS_EXPIRED', label: 'انتهاء صلاحية النقاط', expectedVars: ['customerName', 'points', 'date', 'currentBalance'], location: 'services/hr/customerNotificationScheduleService.js:240' },
  { eventType: 'LOYALTY_POINTS_REDEEMED', label: 'استبدال النقاط', expectedVars: ['customerName', 'points', 'reason', 'currentPoints'], location: 'services/hr/customerLoyaltyService.js:1250' },
  { eventType: 'CASHBACK_CREDITED', label: 'إيداع كاش باك', expectedVars: ['customerName', 'cashAmount', 'currency', 'balance'], location: 'services/hr/customerNotificationScheduleService.js:180' },
  { eventType: 'CASHBACK_REVERSED', label: 'خصم كاش باك', expectedVars: ['customerName', 'cashAmount', 'currency', 'balance'], location: 'services/hr/customerNotificationScheduleService.js:195' },
  { eventType: 'CUSTOMER_QUALITY_UPGRADED', label: 'ارتفاع تصنيف الجودة', expectedVars: ['customerName', 'qualityTier', 'score'], location: 'services/hr/customerNotificationScheduleService.js:160' },
  { eventType: 'CUSTOMER_QUALITY_DOWNGRADED', label: 'انخفاض تصنيف الجودة', expectedVars: ['qualityTier'], location: 'services/hr/customerNotificationScheduleService.js:160' },
  { eventType: 'AUTO_DISCOUNT_COUPON_GRANTED', label: 'منح كوبون الخصم التلقائي', expectedVars: ['customerName', 'discountPercent', 'couponCode', 'validityDays'], location: 'services/hr/customerNotificationScheduleService.js:320' },
  { eventType: 'AUTO_DISCOUNT_COUPON_EXPIRING', label: 'تنبيه قرب انتهاء كوبون الخصم', expectedVars: ['customerName', 'discountPercent', 'validityDays'], location: 'services/hr/customerNotificationScheduleService.js:340' },
  { eventType: 'AUTO_DISCOUNT_CASHBACK_CONVERTED', label: 'تحويل الكوبون المنتهي لكاش باك', expectedVars: ['customerName', 'couponCode', 'cashAmount', 'currency', 'balance'], location: 'services/hr/customerNotificationScheduleService.js:355' },
];

function parseArgs() {
  const args = process.argv.slice(2);
  let companyId = null;
  let forceApi = false;
  let forceDb = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--companyId' && args[i + 1]) {
      companyId = args[i + 1];
      i++;
    } else if (args[i] === '--api') {
      forceApi = true;
    } else if (args[i] === '--db') {
      forceDb = true;
    }
  }

  return { companyId, forceApi, forceDb };
}

function apiRequest(method, urlStr, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function runViaApi(companyId) {
  const baseUrl = process.env.BASE_URL || 'https://maxp.online';
  const email = process.env.SWAN_EMAIL || 'swan@h2m.com';
  const password = process.env.SWAN_PASSWORD || '0165676135';

  const loginRes = await apiRequest('POST', `${baseUrl}/api/v1/auth/login`, { email, password });
  if (!loginRes.body?.success) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
  }

  const token = loginRes.body.data.token;
  const user = loginRes.body.data.user;
  const targetCompanyId = companyId || user.companyId;

  // Fetch templates & sessions to evaluate canonical templates
  const [templatesRes, sessionsRes] = await Promise.all([
    apiRequest('GET', `${baseUrl}/api/v1/whatsapp-notifications/templates`, null, token),
    apiRequest('GET', `${baseUrl}/api/v1/whatsapp/sessions`, null, token).catch(() => ({ body: [] })),
  ]);

  const allTemplates = Array.isArray(templatesRes.body?.templates)
    ? templatesRes.body.templates
    : Array.isArray(templatesRes.body?.data)
    ? templatesRes.body.data
    : Array.isArray(templatesRes.body)
    ? templatesRes.body
    : [];

  const { findCanonicalNotificationTemplate } = require('../services/whatsapp/WhatsAppNotificationService');

  // Create an in-memory mock prisma adapter for canonical selector
  const matchesWhere = (t, where = {}) => {
    if (where.companyId && t.companyId !== where.companyId) return false;
    if (where.isActive !== undefined && t.isActive !== where.isActive) return false;
    if (where.channel) {
      if (typeof where.channel === 'string' && t.channel !== where.channel) return false;
      if (where.channel.in && !where.channel.in.includes(t.channel)) return false;
      if (where.channel.not && t.channel === where.channel.not) return false;
    }
    if (where.metaTemplateName && where.metaTemplateName.not === null && !t.metaTemplateName) return false;
    if (where.metaTemplateStatus) {
      const st = String(t.metaTemplateStatus || '').toUpperCase();
      if (typeof where.metaTemplateStatus === 'string' && st !== where.metaTemplateStatus.toUpperCase()) return false;
      if (where.metaTemplateStatus.equals && st !== where.metaTemplateStatus.equals.toUpperCase()) return false;
    }
    if (where.eventType) {
      const types = Array.isArray(where.eventType.in) ? where.eventType.in : [where.eventType];
      if (!types.includes(t.eventType)) return false;
    }
    return true;
  };

  const mockPrisma = {
    whatsAppNotificationTemplate: {
      findFirst: async ({ where = {} } = {}) => {
        return allTemplates.filter((t) => matchesWhere(t, where))[0] || null;
      },
      findMany: async ({ where = {} } = {}) => {
        return allTemplates.filter((t) => matchesWhere(t, where));
      },
    },
  };

  const results = [];
  let matchCount = 0;
  let mismatchCount = 0;
  let pendingApprovalCount = 0;
  let noTemplateCount = 0;

  for (const item of CHECK_EVENTS) {
    const canonical = await findCanonicalNotificationTemplate(
      targetCompanyId,
      item.eventType,
      'META_CLOUD',
      mockPrisma,
      {
        fallbackEventType: item.fallbackEventType || null,
        expectedMetaParamCount: item.expectedVars.length,
      }
    );

    let dbVarCount = 0;
    let dbVars = [];
    if (canonical) {
      try {
        const parsed = typeof canonical.variables === 'string' ? JSON.parse(canonical.variables) : canonical.variables;
        if (Array.isArray(parsed)) {
          dbVars = parsed.map((v) => (typeof v === 'string' ? v : v?.name)).filter(Boolean);
          dbVarCount = dbVars.length;
        }
      } catch {}
      if (dbVarCount === 0 && canonical.content) {
        const matches = canonical.content.match(/\{\{\s*([a-zA-Z_0-9]+)\s*\}\}/g);
        if (matches) {
          dbVars = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim()))];
          dbVarCount = dbVars.length;
        }
      }
    }

    let status = 'MATCH';
    let statusReason = 'القالب متطابق وجاهز للإرسال';

    if (!canonical || !canonical.metaTemplateName) {
      status = 'NO_META_TEMPLATE';
      statusReason = 'لا يوجد قالب ميتا مربوط بالحدث';
      noTemplateCount++;
    } else if (String(canonical.metaTemplateStatus || '').toUpperCase() !== 'APPROVED') {
      status = 'PENDING_APPROVAL';
      statusReason = `قالب ميتا (${canonical.metaTemplateName}) بحاجة لاعتماد من ميتا (${canonical.metaTemplateStatus || 'غير معروف'})`;
      pendingApprovalCount++;
    } else if (dbVarCount !== item.expectedVars.length) {
      status = 'MISMATCH';
      statusReason = `عدد متغيرات القالب (${dbVarCount}) لا يطابق المتوقع (${item.expectedVars.length})`;
      mismatchCount++;
    } else {
      matchCount++;
    }

    results.push({
      eventType: item.eventType,
      label: item.label,
      templateId: canonical?.id || null,
      templateName: canonical?.name || null,
      metaTemplateName: canonical?.metaTemplateName || null,
      metaTemplateId: canonical?.metaTemplateId || null,
      metaTemplateStatus: canonical?.metaTemplateStatus || null,
      dbVarCount,
      dbVars,
      expectedCount: item.expectedVars.length,
      expectedVars: item.expectedVars,
      status,
      statusReason,
    });
  }

  return {
    companyId: targetCompanyId,
    mode: 'API_DIRECT',
    summary: {
      total: CHECK_EVENTS.length,
      match: matchCount,
      mismatch: mismatchCount,
      pendingApproval: pendingApprovalCount,
      noMetaTemplate: noTemplateCount,
    },
    results,
  };
}

async function runViaDb(companyId) {
  const { getSharedPrismaClient } = require('../services/sharedDatabase');
  const prisma = getSharedPrismaClient();
  const { findCanonicalNotificationTemplate } = require('../services/whatsapp/WhatsAppNotificationService');

  const targetCompanyId = companyId || 'cmleybpf70028juo2wwpmp8rt';

  const results = [];
  let matchCount = 0;
  let mismatchCount = 0;
  let pendingApprovalCount = 0;
  let noTemplateCount = 0;

  for (const item of CHECK_EVENTS) {
    const canonical = await findCanonicalNotificationTemplate(
      targetCompanyId,
      item.eventType,
      'META_CLOUD',
      prisma,
      {
        fallbackEventType: item.fallbackEventType || null,
        expectedMetaParamCount: item.expectedVars.length,
      }
    );

    let dbVarCount = 0;
    let dbVars = [];
    if (canonical) {
      try {
        const parsed = typeof canonical.variables === 'string' ? JSON.parse(canonical.variables) : canonical.variables;
        if (Array.isArray(parsed)) {
          dbVars = parsed.map((v) => (typeof v === 'string' ? v : v?.name)).filter(Boolean);
          dbVarCount = dbVars.length;
        }
      } catch {}
      if (dbVarCount === 0 && canonical.content) {
        const matches = canonical.content.match(/\{\{\s*([a-zA-Z_0-9]+)\s*\}\}/g);
        if (matches) {
          dbVars = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim()))];
          dbVarCount = dbVars.length;
        }
      }
    }

    let status = 'MATCH';
    let statusReason = 'القالب متطابق وجاهز للإرسال';

    if (!canonical || !canonical.metaTemplateName) {
      status = 'NO_META_TEMPLATE';
      statusReason = 'لا يوجد قالب ميتا مربوط بالحدث';
      noTemplateCount++;
    } else if (String(canonical.metaTemplateStatus || '').toUpperCase() !== 'APPROVED') {
      status = 'PENDING_APPROVAL';
      statusReason = `قالب ميتا (${canonical.metaTemplateName}) بحاجة لاعتماد من ميتا (${canonical.metaTemplateStatus || 'غير معروف'})`;
      pendingApprovalCount++;
    } else if (dbVarCount !== item.expectedVars.length) {
      status = 'MISMATCH';
      statusReason = `عدد متغيرات القالب (${dbVarCount}) لا يطابق المتوقع (${item.expectedVars.length})`;
      mismatchCount++;
    } else {
      matchCount++;
    }

    results.push({
      eventType: item.eventType,
      label: item.label,
      templateId: canonical?.id || null,
      templateName: canonical?.name || null,
      metaTemplateName: canonical?.metaTemplateName || null,
      metaTemplateId: canonical?.metaTemplateId || null,
      metaTemplateStatus: canonical?.metaTemplateStatus || null,
      dbVarCount,
      dbVars,
      expectedCount: item.expectedVars.length,
      expectedVars: item.expectedVars,
      status,
      statusReason,
    });
  }

  return {
    companyId: targetCompanyId,
    mode: 'DATABASE',
    summary: {
      total: CHECK_EVENTS.length,
      match: matchCount,
      mismatch: mismatchCount,
      pendingApproval: pendingApprovalCount,
      noMetaTemplate: noTemplateCount,
    },
    results,
  };
}

function printAsciiTable(report) {
  console.log('\n' + '='.repeat(110));
  console.log(`🩺 WHATSAPP NOTIFICATION TEMPLATE HEALTH REPORT`);
  console.log(`   Company ID: ${report.companyId} | Execution Mode: ${report.mode}`);
  console.log('='.repeat(110));

  console.log(
    `| ${'Event Type'.padEnd(30)} | ${'Chosen Meta Template'.padEnd(32)} | ${'Meta Status'.padEnd(14)} | ${'Vars (DB/Exp)'.padEnd(13)} | ${'Health Status'.padEnd(12)} |`
  );
  console.log('|' + '-'.repeat(32) + '|' + '-'.repeat(34) + '|' + '-'.repeat(16) + '|' + '-'.repeat(15) + '|' + '-'.repeat(14) + '|');

  for (const r of report.results) {
    const eventCol = r.eventType.padEnd(30);
    const metaCol = (r.metaTemplateName || '(none)').slice(0, 32).padEnd(32);
    const statusMetaCol = (r.metaTemplateStatus || 'N/A').padEnd(14);
    const varsCol = `${r.dbVarCount}/${r.expectedCount}`.padEnd(13);

    let healthCol = r.status.padEnd(12);
    if (r.status === 'MATCH') {
      healthCol = `\x1b[32m${healthCol}\x1b[0m`;
    } else if (r.status === 'PENDING_APPROVAL') {
      healthCol = `\x1b[33m${healthCol}\x1b[0m`;
    } else {
      healthCol = `\x1b[31m${healthCol}\x1b[0m`;
    }

    console.log(`| ${eventCol} | ${metaCol} | ${statusMetaCol} | ${varsCol} | ${healthCol} |`);
  }

  console.log('='.repeat(110));
  console.log(`📊 SUMMARY: Total: ${report.summary.total} | MATCH: ${report.summary.match} | PENDING_APPROVAL: ${report.summary.pendingApproval} | MISMATCH: ${report.summary.mismatch} | NO_META: ${report.summary.noMetaTemplate}`);
  console.log('='.repeat(110) + '\n');
}

async function main() {
  const { companyId, forceApi, forceDb } = parseArgs();

  let report;
  const hasRealDb = forceDb || (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('mock') && !forceApi);
  if (hasRealDb) {
    try {
      report = await runViaDb(companyId);
    } catch (err) {
      if (forceDb) throw err;
      console.warn('⚠️ Direct DB connection unavailable, falling back to HTTPS API inspection...');
      report = await runViaApi(companyId);
    }
  } else {
    report = await runViaApi(companyId);
  }

  printAsciiTable(report);

  if (report.summary.mismatch > 0) {
    console.error(`❌ FAILURE: Detected ${report.summary.mismatch} parameter count mismatches!`);
    process.exit(1);
  } else {
    console.log(`✅ SUCCESS: Zero parameter count mismatches across all events.`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('❌ Template Health Check Failed:', err.stack || err.message);
  process.exit(1);
});
