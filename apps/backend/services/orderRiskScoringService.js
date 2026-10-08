const { v4: uuidv4 } = require('uuid');

// ─── طبقة «سكور الطلبات الوهمية» (MVP) ───
// تُحسب عند إنشاء الأوردر فوق محرك حظر العملاء القائم — إعلامية بالكامل:
// لا رسائل للعملاء، لا إلغاء تلقائي. الإجراء (تعليق/موافقة مدير) يظل عبر
// evaluateCustomerBlock الحالي فقط، والطبقة مُتاحة بمفتاح لكل شركة.

const DEFAULT_SETTINGS = {
  enabled: false,
  highThreshold: 70,
  mediumThreshold: 40,
  highValueThreshold: 5000,
  historyWindowDays: 180,
};

const REASON_CODES = {
  BLOCKLIST_MATCH: { label: 'مطابقة قائمة حظر', weight: 45 },
  CANCELLED_HISTORY: { label: 'تكرار رقم على أوردرات ملغية', weight: 8 },
  RETURNED_HISTORY: { label: 'تكرار رقم على أوردرات مرتجعة', weight: 10 },
  REPEAT_ADDRESS: { label: 'عنوان مطابق لأوردر ملغي/مرتجع', weight: 10 },
  INCOMPLETE_ADDRESS: { label: 'عنوان ناقص', weight: 12 },
  HIGH_VALUE_NEW_CUSTOMER: { label: 'قيمة عالية لعميل جديد', weight: 15 },
  PRIOR_BLOCK: { label: 'حظر أو محاولة سابقة', weight: 20 },
};

const CAPS = {
  CANCELLED_HISTORY: 3,
  RETURNED_HISTORY: 2,
};

let _ensurePromise = null;

function normalizeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    enabled: s.enabled === true,
    highThreshold: Number(s.highThreshold) > 0 ? Number(s.highThreshold) : DEFAULT_SETTINGS.highThreshold,
    mediumThreshold: Number(s.mediumThreshold) > 0 ? Number(s.mediumThreshold) : DEFAULT_SETTINGS.mediumThreshold,
    highValueThreshold: Number(s.highValueThreshold) > 0 ? Number(s.highValueThreshold) : DEFAULT_SETTINGS.highValueThreshold,
    historyWindowDays: Number(s.historyWindowDays) > 0 ? Number(s.historyWindowDays) : DEFAULT_SETTINGS.historyWindowDays,
  };
}

function levelFor(score, settings) {
  if (score >= settings.highThreshold) return 'high';
  if (score >= settings.mediumThreshold) return 'medium';
  return 'low';
}

function normalizePhone(value) {
  if (!value) return null;
  const digits = String(value).replace(/[^\d]/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('20')) return digits.slice(2);
  if (digits.startsWith('2') && digits.length === 11) return digits.slice(1);
  return digits;
}

function buildRiskSettingsWhere(prisma) {
  return prisma.$queryRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "order_risk_settings" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "enabled" BOOLEAN NOT NULL DEFAULT false,
      "highThreshold" INTEGER NOT NULL DEFAULT 70,
      "mediumThreshold" INTEGER NOT NULL DEFAULT 40,
      "highValueThreshold" INTEGER NOT NULL DEFAULT 5000,
      "historyWindowDays" INTEGER NOT NULL DEFAULT 180,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "order_risk_settings_pkey" PRIMARY KEY ("id")
    )
  `).then(() => prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "order_risk_settings_companyId_key"
    ON "order_risk_settings" ("companyId")
  `)).catch(() => {});
}

async function ensureRiskTables(prisma) {
  if (!_ensurePromise) {
    _ensurePromise = (async () => {
      await buildRiskSettingsWhere(prisma);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "order_risk_scores" (
          "id" TEXT NOT NULL,
          "orderId" TEXT NOT NULL,
          "companyId" TEXT NOT NULL,
          "score" INTEGER NOT NULL,
          "level" TEXT NOT NULL,
          "reasons" JSONB NOT NULL,
          "signals" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "order_risk_scores_pkey" PRIMARY KEY ("id")
        )
      `).then(() => prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "order_risk_scores_orderId_key"
        ON "order_risk_scores" ("orderId")
      `)).then(() => prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "order_risk_scores_company_level_idx"
        ON "order_risk_scores" ("companyId", "level")
      `));
    })().catch((err) => {
      _ensurePromise = null;
      throw err;
    });
  }
  return this._ensurePromise;
}

async function getSettings(prisma, companyId) {
  await ensureRiskTables(prisma);
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "enabled", "highThreshold", "mediumThreshold", "highValueThreshold", "historyWindowDays"
     FROM "order_risk_settings" WHERE "companyId" = $1 LIMIT 1`,
    companyId
  );
  return normalizeSettings(rows && rows[0]);
}

async function saveSettings(prisma, companyId, patch) {
  await ensureRiskTables(prisma);
  const current = await getSettings(prisma, companyId);
  const merged = normalizeSettings({ ...current, ...(patch || {}) });
  await prisma.$queryRawUnsafe(
    `INSERT INTO "order_risk_settings"
       ("id","companyId","enabled","highThreshold","mediumThreshold","highValueThreshold","historyWindowDays","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
     ON CONFLICT ("companyId") DO UPDATE SET
       "enabled"=EXCLUDED."enabled",
       "highThreshold"=EXCLUDED."highThreshold",
       "mediumThreshold"=EXCLUDED."mediumThreshold",
       "highValueThreshold"=EXCLUDED."highValueThreshold",
       "historyWindowDays"=EXCLUDED."historyWindowDays",
       "updatedAt"=NOW()`,
    'orr-' + companyId, companyId, merged.enabled, merged.highThreshold,
    merged.mediumThreshold, merged.highValueThreshold, merged.historyWindowDays
  );
  return merged;
}

/** إشارات تاريخية: أوردرات سابقة بنفس الرقم (ملغية/مرتجعة/مسلّمة) */
async function collectHistorySignals(prisma, settings, companyId, phone, address) {
  const reasons = [];
  const signals = {};
  const phoneNorm = normalizePhone(phone);
  const windowStart = new Date(Date.now() - settings.historyWindowDays * 86400000);
  if (!phoneNorm) return { reasons, signals };

  const historyRows = await prisma.$queryRawUnsafe(
    `SELECT status, COUNT(*)::int AS cnt FROM "orders"
     WHERE "companyId" = $1
       AND "customerPhone" IN (${[phoneNorm, '2' + phoneNorm, '20' + phoneNorm].map((p) => `'${p}'`).join(',')})
       AND "createdAt" >= $2
     GROUP BY status`,
    companyId, windowStart
  ).catch(() => []);

  let cancelled = 0, returned = 0, delivered = 0;
  (historyRows || []).forEach((r) => {
    const st = String(r.status || '').toUpperCase();
    if (st.includes('CANCEL')) cancelled += Number(r.cnt) || 0;
    else if (st.startsWith('RETURN') || st.includes('EXCHANGE')) returned += Number(r.cnt) || 0;
    else if (st === 'DELIVERED') delivered += Number(r.cnt) || 0;
  });

  if (cancelled > 0) {
    const w = Math.min(cancelled, CAPS.CANCELLED_HISTORY) * REASON_CODES.CANCELLED_HISTORY.weight;
    reasons.push({ code: 'CANCELLED_HISTORY', label: `${REASON_CODES.CANCELLED_HISTORY.label} (${cancelled})`, weight: w });
    signals.cancelledCount = cancelled;
  }
  if (returned > 0) {
    const w = Math.min(returned, CAPS.RETURNED_HISTORY) * REASON_CODES.RETURNED_HISTORY.weight;
    reasons.push({ code: 'RETURNED_HISTORY', label: `${REASON_CODES.RETURNED_HISTORY.label} (${returned})`, weight: w });
    signals.returnedCount = returned;
  }
  signals.priorDelivered = delivered > 0;

  if (address && String(address).trim().length >= 8) {
    const addrPattern = '%' + String(address).trim().replace(/\s+/g, '%') + '%';
    const addrHits = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS cnt FROM "orders"
       WHERE "companyId" = $1 AND "createdAt" >= $2
         AND ("customerAddress" ILIKE $3 OR "shippingAddress" ILIKE $3)
         AND status ILIKE '%CANCEL%'`,
      companyId, windowStart, addrPattern
    ).catch(() => []);
    if (addrHits && addrHits[0] && Number(addrHits[0].cnt) > 0) {
      reasons.push({ code: 'REPEAT_ADDRESS', label: REASON_CODES.REPEAT_ADDRESS, weight: REASON_CODES.REPEAT_ADDRESS.weight || 10 });
      signals.repeatAddress = true;
    }
  }

  return { reasons, signals, delivered, cancelled, returned, phoneNorm };
}

/**
 * يحسب سكور الخطر لطلب جديد ويرجّع النتيجة (بدون أي كتابة).
 * blockEvaluation = نتيجة evaluateCustomerBlock المحسوبة مسبقًا في نفس المسار.
 */
async function scoreOrderDraft(prisma, {
  companyId, phone, email, facebookId, whatsappId,
  total, address, city, customerId,
  blockEvaluation = null,
}, settingsOverride = null) {
  const settings = normalizeSettings(settingsOverride || (await getSettings.call(this, prisma, companyId)));
  const reasons = [];
  const signals = {};
  let score = 0;
  const add = (code, extra) => {
    const def = REASON_CODES[code];
    const w = def.weight;
    reasons.push({ code, label: def.label, weight: w, ...(extra || {}) });
    score += w;
  };

  // 1) مطابقة قائمة الحظر (من تقييم المحرك الحالي — يُمرَّر من المسار)
  if (blockEvaluation && blockEvaluation.payload && blockEvaluation.payload.code) {
    add('BLOCKLIST_MATCH', { ruleAction: blockEvaluation.payload.action || null });
  }

  // 2-4) إشارات التاريخ (ملغية/مرتجعة/عنوان مكرر/مسلّم سابقًا)
  const hist = await collectHistorySignals(prisma, settings, companyId, phone, address);
  hist.reasons.forEach((r) => { reasons.push(r); score += r.weight; });
  Object.assign(signals, hist.signals);

  // 5) عنوان ناقص
  const addressText = String(address || '').trim();
  if (!addressText || addressText.length < 10 || !city || !String(city).trim()) {
    add('INCOMPLETE_ADDRESS');
  }

  // 6) قيمة عالية لعميل جديد (بدون أي أوردر مسلّم سابقًا لنفس الرقم)
  if (Number(total) >= settings.highValueThreshold && !hist.delivered) {
    add('HIGH_VALUE_NEW_CUSTOMER', { total: Number(total) });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level = levelFor(score, settings);
  return { score, level, reasons, signals, settings };
}

/** يخزن النتيجة على metadata الأوردر + جدول السكورز (idempotent بالـorderId) */
async function persistRiskResult(prisma, { orderId, companyId, result }) {
  await ensureRiskTables(prisma);
  const riskPayload = {
    riskScore: result.score,
    riskLevel: result.level,
    riskReasons: result.reasons,
    riskComputedAt: new Date().toISOString()
  };
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { metadata: true } });
  let metadata = {};
  try { metadata = order?.metadata ? JSON.parse(order.metadata) : {}; } catch (_) { metadata = {}; }
  metadata.risk = riskPayload;
  await prisma.order.update({
    where: { id: orderId },
    data: { metadata: JSON.stringify(metadata) }
  });
  await prisma.$queryRawUnsafe(
    `INSERT INTO "order_risk_scores" ("id","orderId","companyId","score","level","reasons","signals")
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
     ON CONFLICT ("orderId") DO UPDATE SET
       "score"=EXCLUDED."score","level"=EXCLUDED."level",
       "reasons"=EXCLUDED."reasons","signals"=EXCLUDED."signals"`,
    uuidv4(), orderId, companyId, result.score, result.level,
    JSON.stringify(result.reasons), JSON.stringify(result.signals || {})
  );
  return riskPayload;
}

/** تقرير: أعداد حسب المستوى + قيمة الطلبات عالية الخطورة (من بيانات فعلية) */
async function riskReport(prisma, companyId, days = 30) {
  const since = new Date(Date.now() - Number(days || 30) * 86400000);
  const rows = await prisma.$queryRawUnsafe(
    `SELECT s.level, COUNT(*)::int AS orders, COALESCE(SUM(o.total),0)::float AS total_value
     FROM "order_risk_scores" s JOIN "orders" o ON o.id = s."order_id"
     WHERE s."companyId" = $1 AND s."createdAt" >= $2
     GROUP BY s.level`,
    companyId, since
  ).catch(() => []);
  const summary = { low: 0, medium: 0, high: 0, total: 0, highRiskValue: 0 };
  (rows || []).forEach((r) => {
    summary[r.level] = Number(r.orders) || 0;
    summary.total += Number(r.orders) || 0;
    if (r.level === 'high') summary.highRiskValue = Number(r.total_value) || 0;
  });
  return summary;
}

module.exports = {
  DEFAULT_SETTINGS,
  REASON_CODES,
  normalizeSettings,
  getSettings,
  saveSettings,
  scoreOrderDraft,
  persistRiskResult,
  riskReport,
  ensureRiskTables,
  normalizePhone,
};
