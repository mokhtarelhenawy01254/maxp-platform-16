/**
 * 🫀 Tenant Pulse — نبض نشاط الشركات
 * ------------------------------------------------------------------
 * الهدف: الإجابة على سؤال «هل في شغل حصل على الشركة النهاردة؟» لأي تطبيق
 * في المنصة (معمل أسنان، HR، طلبات، مخزون، عيادة، …) **بدون** كتابة كود
 * مخصص لكل تطبيق، وبدون أي تأثير على زمن استجابة الطلب.
 *
 * التصميم:
 *  - Middleware عام يتعلّق بـ res.on('finish') — أي أن الكتابة تحدث **بعد**
 *    إرسال الرد، فليست على المسار الحرج للطلب.
 *  - لا يسجّل إلا: مستخدم مسجّل دخول + له companyId + طلب يغيّر بيانات
 *    (POST/PUT/PATCH/DELETE) + رد ناجح (<400).
 *  - مُستبعد تمامًا: مسارات /public (طلبات المتجر والزوار)، الـ webhooks،
 *    ومسارات /auth (لها سجل LOGIN_SUCCESS مستقل ودقيق 100%).
 *  - Throttle في الذاكرة: نبضة واحدة لكل شركة كل ساعة كحد أقصى، مهما كان
 *    حجم الطلبات (شركة مثل Swan قد ترسل آلاف الطلبات/ساعة → صف واحد فقط).
 *    هذا يحمي الـ IOPS والـ WAL ويمنع write amplification.
 *  - التسجيل في جدول activity_logs الموجود (فهارسه جاهزة على companyId+createdAt).
 *
 * المخرجات: صفوف category='PULSE', action='TENANT_ACTIVITY'
 * تُقرأ في أندبوينت /super-admin/company-activity (عمود «شغل النهاردة»).
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const WINDOW_MS = 60 * 60 * 1000; // نبضة واحدة لكل شركة كل ساعة
const MAX_ENTRIES = 20000; // سقف أمان للذاكرة (تنظيف عند التجاوز)
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SKIP_PATTERNS = [
  /^\/api\/v1\/public\//i,
  /webhook/i,
  /^\/api\/v1\/auth\//i,
  /^\/api\/v1\/health/i,
  /^\/api\/v1\/version/i,
];

/** آخر نبضة لكل شركة (مفتاح = companyId) */
const lastBeatAt = new Map();

function pruneIfNeeded(now) {
  if (lastBeatAt.size <= MAX_ENTRIES) return;
  for (const [companyId, at] of lastBeatAt) {
    if (now - at > WINDOW_MS) lastBeatAt.delete(companyId);
  }
  // لو لسه فوق السقف بعد التنظيف، امسح الأقدم
  if (lastBeatAt.size > MAX_ENTRIES) {
    const sorted = [...lastBeatAt.entries()].sort((a, b) => a[1] - b[1]);
    const excess = lastBeatAt.size - MAX_ENTRIES;
    for (let i = 0; i < excess; i += 1) lastBeatAt.delete(sorted[i][0]);
  }
}

/** تصنيف المسار إلى تطبيق/وحدة، للعرض فقط (مفيش اعتماد عليه في المنطق) */
function classifyApp(path) {
  const p = String(path || '').toLowerCase();
  if (p.includes('/dental')) return 'dental-lab';
  if (p.includes('/radiology') || p.includes('/clinic') || p.includes('/doctor')) return 'clinic';
  if (p.includes('/hr') || p.includes('/employee') || p.includes('/attendance') || p.includes('/payroll') || p.includes('/leave')) return 'hr';
  if (p.includes('/order') || p.includes('/cart') || p.includes('/shipping') || p.includes('/return') || p.includes('/bosta') || p.includes('/turbo')) return 'orders';
  if (p.includes('/product') || p.includes('/inventory') || p.includes('/stock') || p.includes('/warehouse') || p.includes('/supplier')) return 'catalog';
  if (p.includes('/customer') || p.includes('/loyalty') || p.includes('/cashback')) return 'customers';
  if (p.includes('/conversation') || p.includes('/whatsapp') || p.includes('/inbox') || p.includes('/message')) return 'conversations';
  if (p.includes('/invoice') || p.includes('/accounting') || p.includes('/treasury') || p.includes('/expense') || p.includes('/financial')) return 'finance';
  if (p.includes('/settings')) return 'settings';
  if (p.includes('/ai')) return 'ai';
  return 'other';
}

function clientIp(req) {
  try {
    const fwd = req.headers['x-forwarded-for'];
    const first = Array.isArray(fwd) ? fwd[0] : String(fwd || '').split(',')[0];
    return (req.headers['cf-connecting-ip'] || first || req.ip || '').trim() || null;
  } catch (error) {
    return null;
  }
}

function tenantPulse(req, res, next) {
  res.on('finish', () => {
    try {
      const user = req.user;
      if (!user || !user.companyId || !user.id) return;
      if (!MUTATING_METHODS.has(String(req.method || '').toUpperCase())) return;
      if (res.statusCode >= 400) return;

      const path = req.originalUrl || req.url || '';
      if (SKIP_PATTERNS.some((re) => re.test(path))) return;

      const now = Date.now();
      const previous = lastBeatAt.get(user.companyId) || 0;
      if (now - previous < WINDOW_MS) return; // الشركة سُجّلت حديثًا → صفر كتابة

      lastBeatAt.set(user.companyId, now);
      pruneIfNeeded(now);

      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
      const prisma = getSharedPrismaClient();
      Promise.resolve(
        prisma.activityLog.create({
          data: {
            userId: user.id,
            companyId: user.companyId,
            category: 'PULSE',
            action: 'TENANT_ACTIVITY',
            description: `${req.method} ${path}`.slice(0, 500),
            targetType: 'APP',
            targetName: classifyApp(path),
            severity: 'LOW',
            isSuccess: true,
            metadata: JSON.stringify({
              method: String(req.method || '').toUpperCase(),
              path: String(path).slice(0, 500),
              app: classifyApp(path),
              userId: user.id,
              userName: fullName || user.email || null,
              role: user.role || null,
              ip: clientIp(req),
            }),
          },
          select: { id: true },
        }),
      ).catch(() => {
        /* التسجيل لا يجب أن يؤثر على أي شيء — نتجاهل الأخطاء */
      });
    } catch (error) {
      /* صامت بالقصد */
    }
  });

  return next();
}

module.exports = { tenantPulse, classifyApp, TENANT_PULSE_WINDOW_MS: WINDOW_MS };
