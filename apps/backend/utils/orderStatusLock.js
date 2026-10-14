// ═══════════════════════════════════════════════════════════════
// 🔒 Order Status Editing Lock (per-status)
// ═══════════════════════════════════════════════════════════════
// كل حالة (حالة طلب) في صفحة إعدادات الطلبات لها زر "مسموح التعديل / غير مسموح".
// الحقل المخزّن على كل حالة: orderStatusConfig.allowStatusEdit (الافتراضي true).
//
// - allowStatusEdit = true  (مسموح): الأوردرات في هذه الحالة قابلة للتعديل.
// - allowStatusEdit = false (غير مسموح): أي طلب موجود حالياً في هذه الحالة
//   لا يستطيع أي مستخدم أو نظام تعديل بياناته (يُرفض بكود 403) حتى يتم فك
//   القفل من صفحة الإعدادات.
//
// ملاحظة: يتم التحقق بالكود الفعلي للطلب (customStatusCode أولاً، ثم status النظامي).
// البحث يتم بمطابقة صريحة لـ code لتجنب قفل الحالات النظامية عن طريق الخطأ
// عبر الحالات المخصصة التي تشير إليها بـ mapsToSystem.
// ═══════════════════════════════════════════════════════════════

let _getSharedPrismaClient = null;
const resolvePrisma = (prisma) => {
  if (prisma) return prisma;
  if (!_getSharedPrismaClient) {
    _getSharedPrismaClient = require('../services/sharedDatabase').getSharedPrismaClient;
  }
  return _getSharedPrismaClient();
};

const resolveStatusCode = (statusOrOrder) => {
  if (!statusOrOrder) return '';
  if (typeof statusOrOrder === 'object') {
    return String(statusOrOrder.customStatusCode || statusOrOrder.status || '').trim().toUpperCase();
  }
  return String(statusOrOrder).trim().toUpperCase();
};

const createLockError = (currentStatusOrOrder = '') => {
  const code = resolveStatusCode(currentStatusOrOrder);
  const error = new Error(
    `حالة هذا الطلب (${code}) مضبوطة حالياً على "غير مسموح بالتعديل". لتمكين تعديل بيانات الطلب، يُرجى تفعيل خيار "مسموح بالتعديل" لهذه الحالة من صفحة (إعدادات الطلبات ← حالات الطلب).`
  );
  error.statusCode = 403;
  return error;
};

/**
 * هل الحالة الحالية للطلب مقفلة (غير مسموح تعديل بيانات الأوردر) لهذه الشركة؟
 * @param {object} prisma (اختياري) - بريزما موجود لتجنب إنشاء اتصال جديد
 * @param {string} companyId
 * @param {string|object} currentStatusOrOrder - كود الحالة أو كائن الطلب (يحوي customStatusCode أو status)
 */
const isOrderStatusEditingLocked = async (prisma = null, companyId, currentStatusOrOrder) => {
  const code = resolveStatusCode(currentStatusOrOrder);
  if (!companyId || !code) return false;
  const client = resolvePrisma(prisma);
  try {
    const config = await client.orderStatusConfig.findFirst({
      where: {
        companyId,
        code: { equals: code, mode: 'insensitive' },
      },
      select: { allowStatusEdit: true },
    });
    return config ? config.allowStatusEdit === false : false;
  } catch (error) {
    console.error('❌ [ORDER-STATUS-LOCK] Error reading status lock:', error.message);
    return false;
  }
};

/**
 * يرفض محاولة تعديل بيانات الطلب إذا كانت الحالة الحالية للطلب مقفلة.
 * @param {object} prisma
 * @param {string} companyId
 * @param {string|object} currentStatusOrOrder - كود الحالة أو كائن الطلب
 */
const assertOrderStatusEditable = async (prisma, companyId, currentStatusOrOrder) => {
  if (await isOrderStatusEditingLocked(prisma, companyId, currentStatusOrOrder)) {
    throw createLockError(currentStatusOrOrder);
  }
};

module.exports = {
  isOrderStatusEditingLocked,
  assertOrderStatusEditable,
  resolveStatusCode,
  createLockError,
};
