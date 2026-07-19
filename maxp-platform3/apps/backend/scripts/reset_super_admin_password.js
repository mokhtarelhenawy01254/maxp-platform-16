const { t: i18n } = require('./i18n');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const newPassword = 'SuperAdmin123!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.user.updateMany({
      where: { 
        email: 'superadmin@system.com',
        role: 'SUPER_ADMIN'
      },
      data: { 
        password: hashedPassword,
        isActive: true
      }
    });

    if (updated.count > 0) {
      console.log('✅ تم إعادة تعيين كلمة المرور بنجاح!\n');
      console.log('📧 Email: superadmin@system.com');
      console.log('🔑 Password: SuperAdmin123!\n');
      console.log(i18n.t('msg.8b7d0161'));
      console.log('   http://localhost:3000/super-admin/login\n');
    } else {
      console.log(i18n.t('msg.741aad67'));
      console.log(i18n.t('msg.a728b23f'));
    }

  } catch (error) {
    console.error(i18n.t('msg.f2d1c024'), error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
