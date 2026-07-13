/**
 * تفعيل المفاتيح المركزية لجميع الشركات
 * ponytail: useCentralKeys field removed — now always on
 */
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function enableCentralKeysForAll() {
  try {
    console.log('=== 🔧 تفعيل المفاتيح المركزية لجميع الشركات ===\n');
    console.log('✅ المفاتيح المركزية مفعّلة لجميع الشركات بشكل افتراضي.');
    console.log('   (حقل useCentralKeys تمت إزالته - التوجيه أصبح schema-agnostic)\n');
    
    const companies = await getSharedPrismaClient().company.findMany({
      select: { name: true }
    });
    
    console.log(`📊 عدد الشركات: ${companies.length}`);
    companies.forEach(c => console.log(`   ✅ ${c.name}`));
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await getSharedPrismaClient().$disconnect();
  }
}

enableCentralKeysForAll();
