const sharedDatabase = require('./sharedDatabase');

const DEFAULT_TEACHER_LABELS = {
  ar: 'المدرسين',
  en: 'Teachers',
};

const LEGACY_DEFAULT_TAB_LABELS = {
  teachers: { ar: 'المهندسين', en: 'Instructors' },
  'teacher-schedule': { ar: 'جدول المهندسين', en: 'Instructor Schedule' },
  'teacher-payments': { ar: 'مرتبات المهندسين', en: 'Instructor Payments' },
};

const CACHE_TTL_MS = 120 * 1000;
const labelCache = new Map();

function normalizeLang(lang) {
  return String(lang || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
}

function isLegacyDefaultLabel(tabId, lang, value) {
  if (typeof value !== 'string') return false;
  const legacy = LEGACY_DEFAULT_TAB_LABELS[String(tabId || '').toLowerCase()];
  if (!legacy) return false;
  return value.trim() === legacy[normalizeLang(lang)];
}

function invalidateTeacherLabelCache(companyId) {
  if (!companyId) return;
  labelCache.delete(`${companyId}:ar`);
  labelCache.delete(`${companyId}:en`);
}

async function getTeacherLabel(companyId, lang = 'ar') {
  const normalizedLang = normalizeLang(lang);
  const fallback = DEFAULT_TEACHER_LABELS[normalizedLang];
  if (!companyId) return fallback;

  const cacheKey = `${companyId}:${normalizedLang}`;
  const cached = labelCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const prisma = sharedDatabase.getSharedPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    const parsed = company?.settings
      ? (typeof company.settings === 'string' ? JSON.parse(company.settings) : company.settings)
      : {};
    const tabs = Array.isArray(parsed?.educationSettings?.tabs) ? parsed.educationSettings.tabs : [];
    const teachersTab = tabs.find((t) => t && String(t.id || '').toLowerCase() === 'teachers');
    const raw = normalizedLang === 'en' ? teachersTab?.labelEn : teachersTab?.labelAr;
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    const value = trimmed && !isLegacyDefaultLabel('teachers', normalizedLang, trimmed) ? trimmed : fallback;

    labelCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch {
    return fallback;
  }
}

module.exports = {
  DEFAULT_TEACHER_LABELS,
  LEGACY_DEFAULT_TAB_LABELS,
  isLegacyDefaultLabel,
  invalidateTeacherLabelCache,
  getTeacherLabel,
};
