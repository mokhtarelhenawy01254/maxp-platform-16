/**
 * ترحيل المفاتيح المركزية
 * ponytail: useCentralKeys field removed — now always on.
 * This script is obsolete. Central key routing is schema-agnostic by default.
 */
require('dotenv').config();

async function checkMigration() {
  console.log('=== 🔑 التحقق من المفاتيح المركزية ===\n');
  console.log('ℹ️  حقل useCentralKeys تمت إزالته من نظام التوجيه.');
  console.log('   التوجيه أصبح schema-agnostic — جميع الشركات تستخدم المفاتيح المركزية.');
  console.log('\n✅ لا حاجة لتشغيل هذا السكريبت.');
  console.log('   برجاء حذفه إذا لم يعد ضرورياً.');
}

checkMigration();

