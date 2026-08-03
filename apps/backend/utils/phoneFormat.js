/**
 * formatPhoneNumber — تنسيق رقم الهاتف (مستخرج في §5.1).
 */

function formatPhoneNumber(phone) {
  if (!phone) return null;

  // إزالة كل شيء ما عدا الأرقام
  let cleaned = phone.replace(/\D/g, '');

  // إذا كان الرقم يبدأ بـ 0 وليس 00، نفترض أنه رقم محلي مصري ونضيف 20
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '20' + cleaned.substring(1);
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // حالة أرقام مصر (010...) بدون الصفر
    cleaned = '20' + cleaned;
  } else if (cleaned.length === 10 && !cleaned.startsWith('2')) {
    // افتراض رقم محلي بدون كود الدولة (مصر)
    cleaned = '20' + cleaned;
  }

  return cleaned;
}

module.exports = { formatPhoneNumber };
