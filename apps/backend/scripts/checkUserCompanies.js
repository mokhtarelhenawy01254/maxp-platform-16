const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function checkUser(email) {
  console.log(`\n🔍 البحث عن: ${email}\n`);

  const user = await prisma.user.findUnique({
    where: { email: email },
    include: {
      company: { select: { id: true, name: true } },
      userCompanies: {
        include: {
          company: { select: { id: true, name: true } }
        }
      }
    }
  });

  if (!user) {
    console.log('❌ المستخدم غير موجود');
    await prisma.$disconnect();
    return;
  }

  console.log('═══════════════════════════════════════════');
  console.log('👤 المستخدم:', user.firstName, user.lastName);
  console.log('📧 الإيميل:', user.email);
  console.log('🆔 ID:', user.id);
  console.log('🔑 الصلاحية الرئيسية:', user.role);
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('🏢 الشركة الرئيسية (companyId):');
  console.log('   📍', user.company?.name || 'غير محدد', `(${user.companyId})`);
  console.log('');
  console.log('📋 الشركات عبر جدول UserCompany:');
  console.log('───────────────────────────────────────────');

  if (user.userCompanies.length === 0) {
    console.log('   ⚠️ لا توجد سجلات في UserCompany');
  } else {
    user.userCompanies.forEach((uc, i) => {
      const status = uc.isActive ? '✅' : '❌';
      const defaultMark = uc.isDefault ? '⭐' : '  ';
      console.log(`   ${i + 1}. ${defaultMark} ${uc.company.name}`);
      console.log(`      Role: ${uc.role} | Active: ${status} | CompanyID: ${uc.companyId}`);
    });
  }

  console.log('───────────────────────────────────────────');
  console.log('📊 إجمالي الشركات في UserCompany:', user.userCompanies.length);

  const hasMultiple = user.userCompanies.length > 1;
  console.log('🔄 يمكنه التبديل بين الشركات:', hasMultiple ? '✅ نعم' : '❌ لا (شركة واحدة فقط)');
  console.log('');

  await prisma.$disconnect();
}

const email = process.argv[2] || 'mokhtar@mokhtar.com';
checkUser(email).catch(console.error);


