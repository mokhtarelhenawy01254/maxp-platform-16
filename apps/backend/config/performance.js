/**
 * Performance Configuration
 * إعدادات تحسين الأداء للسرفر الأساسي
 */

// إعدادات التحميل المؤجل للخدمات
const PERFORMANCE_CONFIG = {
  // تأجيل تحميل خدمات الذكاء الصناعي
  LAZY_LOAD_AI_SERVICES: false, // تحميل فوري للتطوير

  // ❌ REMOVED: Pattern Services - Pattern System removed

  // تقليل عدد الاتصالات بقاعدة البيانات
  REDUCE_DB_CONNECTIONS: false, // تعطيل للتطوير

  // تحميل سريع للخدمات الأساسية فقط
  FAST_STARTUP_MODE: false, // تعطيل للتطوير - تحميل كامل

  // فترة إنتظار لبدء الخدمات الثقيلة (بالثواني)
  HEAVY_SERVICES_DELAY: 0 // بدون تأخير في التطوير
};

module.exports = PERFORMANCE_CONFIG;