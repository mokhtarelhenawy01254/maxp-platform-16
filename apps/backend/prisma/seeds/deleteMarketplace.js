const { getSharedPrismaClient } = require('../../services/sharedDatabase');

async function deleteAll() {
  const prisma = getSharedPrismaClient();
  
  console.log('🗑️ حذف الباقات...');
  await prisma.appBundle.deleteMany({});
  console.log('✅ تم حذف الباقات');
  
  console.log('🗑️ حذف التطبيقات...');
  await prisma.marketplaceApp.deleteMany({});
  console.log('✅ تم حذف التطبيقات');
  
  console.log('✅ تم حذف جميع البيانات بنجاح');
  await prisma.$disconnect();
}

deleteAll().catch(console.error);
