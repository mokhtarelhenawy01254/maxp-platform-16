// ═══════════════════════════════════════════════════════════════
// 🔒 Order Status Editing Lock (per-status)
// ═══════════════════════════════════════════════════════════════
// كل حالة (حالة طلب) في صفحة إعدادات الطلبات لها زر "مسموح التعديل / غير مسموح".
// الحقل المخزّن على كل حالة: orderStatusConfig.allowStatusEdit (الافتراضي true).
//
// - allowStatusEdit = true  (مسموح): الأوردرات في هذه الحالة قابلة للتعديل.
// - allowStatusEdit = false (غير مسموح): أي طلب موجود حالياً في هذه الحالة
//   لا يستطيع أي مستخدم أو نظام تغيير حالته (يُرفض بكود 403) حتى يتم فك
//   القفل من صفحة الإعدادات.
//
// ملاحظة: order.status يخزّن القيمة الصالحة من الـ enum (أو mapsToSystem للحالات
// المخصصة)، لذلك نبحث في orderStatusConfig بالكود أو بـ mapsToSystem.
// ═══════════════════════════════════════════════════════════════

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const createLockError = (currentStatusCode = '') => {
  const error = new Error(
    `حالة هذا الطلب (${currentStatusCode}) مضبوطة حالياً على "غير مسموح بالتعديل". لتمكين تعديل بيانات الطلب، يُرجى تفعيل خيار "مسموح بالتعديل" لهذه الحالة من صفحة (إعدادات الطلبات ← حالات الطلب).`
  );
  error.statusCode = 403;
  return error;
};

/**
 * هل الحالة الحالية للطلب مقفلة (غير مسموح تعديل بيانات الأوردر) لهذه الشركة؟
 * @param {object} prisma (اختياري) - بريزما موجود لتجنب إنشاء اتصال جديد
 * @param {string} companyId
 * @param {string} currentStatusCode - الحالة الحالية للطلب (order.status)
 */
const isOrderStatusEditingLocked = async (prisma = null, companyId, currentStatusCode) => {
  if (!companyId || !currentStatusCode) return false;
  const client = prisma || getSharedPrismaClient();
  const code = String(currentStatusCode || '').trim().toUpperCase();
  try {
    const config = await client.orderStatusConfig.findFirst({
      where: {
        companyId,
        OR: [
          { code: { equals: code, mode: 'insensitive' } },
          { mapsToSystem: code },
        ],
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
 * @param {string} currentStatusCode - الحالة الحالية للطلب
 */
const assertOrderStatusEditable = async (prisma, companyId, currentStatusCode) => {
  if (await isOrderStatusEditingLocked(prisma, companyId, currentStatusCode)) {
    throw createLockError(currentStatusCode);
  }
};

module.exports = {
  isOrderStatusEditingLocked,
  assertOrderStatusEditable,
};
