const { getDateStringInTimezone } = require('./dateUtils');

const CASE_STATUS_CHAIN = ['RECEIVED', 'DESIGN', 'MANUFACTURING', 'OUTSOURCED', 'QC', 'READY', 'DELIVERED', 'CLOSED'];
const DEFAULT_STAGE_NAMES = ['الاستلام', 'التصميم', 'التصنيع', 'مراجعة الجودة', 'التسليم'];
const STATUS_STAGE_NAMES = {
  RECEIVED: 'الاستلام',
  DESIGN: 'التصميم',
  MANUFACTURING: 'التصنيع',
  OUTSOURCED: 'التصنيع',
  QC: 'مراجعة الجودة',
  READY: 'التسليم',
  DELIVERED: 'التسليم',
  CLOSED: 'التسليم',
};

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const toNonNegativeNumber = (value, fallback = 0) => {
  const num = value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isFinite(num) || num < 0) return { valid: false };
  return { valid: true, value: round2(num) };
};

const toPositiveNumber = (value) => {
  const num = value === undefined || value === null || value === '' ? NaN : Number(value);
  if (!Number.isFinite(num) || num <= 0) return { valid: false };
  return { valid: true, value: round2(num) };
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const derivePaymentStatus = (total, paid) => {
  const t = round2(Number(total) || 0);
  const p = round2(Number(paid) || 0);
  if (t > 0 && p >= t) return 'PAID';
  if (p > 0) return 'PARTIAL';
  return 'UNPAID';
};

const deriveInvoiceStatus = (total, paid) => {
  const t = round2(Number(total) || 0);
  const p = round2(Number(paid) || 0);
  if (t > 0 && p >= t) return 'PAID';
  if (p > 0) return 'PARTIAL';
  return 'OPEN';
};

// يولّد رقم متسلسل داخل ترانزاكشن مع قفل صف (يُستدعى دائماً عبر tx.*)
async function generateSequentialNumberTx(tx, model, companyId, prefix) {
  const datePart = getDateStringInTimezone(new Date()).replace(/-/g, '');
  const fullPrefix = `${prefix}-${datePart}-`;
  // قفل الصفوف المطابقة حتى نهاية الترانزاكشن لمنع سباق الأرقام
  await tx.$queryRawUnsafe(`SELECT 1 FROM "${model === 'dentalLabCase' ? 'dental_lab_cases' : 'dental_invoices'}" WHERE "companyId" = $1 AND "${model === 'dentalLabCase' ? 'caseNumber' : 'invoiceNumber'}" LIKE $2 FOR UPDATE`, companyId, `${fullPrefix}%`);
  const latest = await tx[model].findFirst({
    where: { companyId, [model === 'dentalLabCase' ? 'caseNumber' : 'invoiceNumber']: { startsWith: fullPrefix } },
    orderBy: { [model === 'dentalLabCase' ? 'caseNumber' : 'invoiceNumber']: 'desc' },
    select: { [model === 'dentalLabCase' ? 'caseNumber' : 'invoiceNumber']: true },
  });
  let seq = 1;
  const lastValue = latest && (latest.caseNumber || latest.invoiceNumber);
  if (lastValue) {
    const tail = parseInt(String(lastValue).split('-').pop(), 10);
    if (Number.isFinite(tail)) seq = tail + 1;
  }
  return `${fullPrefix}${String(seq).padStart(4, '0')}`;
}

// واجهة قديمة (للاختبارات): توليد بدون قفل — يبقى للتوافق مع المocks
async function generateSequentialNumber(prisma, model, companyId, prefix) {
  const datePart = getDateStringInTimezone(new Date()).replace(/-/g, '');
  const fullPrefix = `${prefix}-${datePart}-`;
  const latest = await prisma[model].findFirst({
    where: { companyId, [model === 'dentalLabCase' ? 'caseNumber' : 'invoiceNumber']: { startsWith: fullPrefix } },
    orderBy: { [model === 'dentalLabCase' ? 'caseNumber' : 'invoiceNumber']: 'desc' },
    select: { [model === 'dentalLabCase' ? 'caseNumber' : 'invoiceNumber']: true },
  });
  let seq = 1;
  const lastValue = latest && (latest.caseNumber || latest.invoiceNumber);
  if (lastValue) {
    const tail = parseInt(String(lastValue).split('-').pop(), 10);
    if (Number.isFinite(tail)) seq = tail + 1;
  }
  return `${fullPrefix}${String(seq).padStart(4, '0')}`;
}

const generateCaseNumber = (prisma, companyId) => generateSequentialNumber(prisma, 'dentalLabCase', companyId, 'DL');
const generateInvoiceNumber = (prisma, companyId) => generateSequentialNumber(prisma, 'dentalInvoice', companyId, 'INV-DL');

function parseSettingValue(row) {
  if (!row || row.value === undefined || row.value === null) return null;
  if (typeof row.value === 'string') {
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }
  return row.value;
}

async function getStageTemplates(prisma, companyId, category) {
  try {
    const settings = await prisma.dentalSetting.findMany({ where: { companyId } });
    const templates = parseSettingValue(settings.find((s) => s && s.key === 'stageTemplates'));
    if (templates && typeof templates === 'object') {
      if (Array.isArray(templates[category])) return templates[category];
      if (Array.isArray(templates.__default)) return templates.__default;
      if (Array.isArray(templates.default)) return templates.default;
    }
  } catch (error) {
    console.error('Error loading dental stage templates:', error);
  }
  return DEFAULT_STAGE_NAMES;
}

function buildStagesData(companyId, names) {
  return (Array.isArray(names) ? names : DEFAULT_STAGE_NAMES).map((name, index) => ({
    companyId,
    name: String(name),
    status: 'PENDING',
    sortOrder: index,
  }));
}

function findActiveStage(stages) {
  return (Array.isArray(stages) ? stages : []).find((stage) => stage && stage.status !== 'DONE') || null;
}

function stageForStatus(stages, targetStatus) {
  const list = Array.isArray(stages) ? stages : [];
  const named = list.find((stage) => stage && stage.name === STATUS_STAGE_NAMES[targetStatus]);
  if (named) return named;
  const index = CASE_STATUS_CHAIN.indexOf(targetStatus);
  if (index !== -1 && list[index]) return list[index];
  return null;
}

function getCompanyId(req, res) {
  const companyId = req?.user?.companyId || req?.companyId;
  if (!companyId) {
    if (res && typeof res.status === 'function') {
      res.status(403).json({ success: false, error: 'غير مصرح' });
    }
    return null;
  }
  return companyId;
}

function parsePagination(query = {}) {
  const pageNum = Math.max(1, parseInt(query?.page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(query?.limit, 10) || 50));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
}

module.exports = {
  CASE_STATUS_CHAIN,
  DEFAULT_STAGE_NAMES,
  STATUS_STAGE_NAMES,
  round2,
  toNonNegativeNumber,
  toPositiveNumber,
  parseDate,
  derivePaymentStatus,
  deriveInvoiceStatus,
  generateCaseNumber,
  generateInvoiceNumber,
  parseSettingValue,
  getStageTemplates,
  buildStagesData,
  findActiveStage,
  stageForStatus,
  getCompanyId,
  parsePagination,
};