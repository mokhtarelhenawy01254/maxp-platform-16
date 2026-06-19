require('dotenv').config();
const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@mokhtarelhenawy.com';
    const password = process.env.PASSWORD || 'SuperAdmin@123';

    console.log('🔍 Checking for existing super admin...');

    // Check if super admin already exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN'
      }
    });

    if (existingSuperAdmin) {
      console.log('✅ Super admin already exists:', existingSuperAdmin.email);
      console.log('   ID:', existingSuperAdmin.id);
      console.log('   Role:', existingSuperAdmin.role);

      // Optional: Reset password if needed
      if (process.env.RESET_PASSWORD === 'true') {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: existingSuperAdmin.id },
          data: { password: hashedPassword }
        });
        console.log('✅ Password reset successfully');
      }

      return;
    }

    console.log('📝 Creating new super admin...');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create super admin
    const superAdmin = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: email,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
        // No company association for super admin
        companyId: null
      }
    });

    console.log('✅ Super admin created successfully!');
    console.log('   Email:', superAdmin.email);
    console.log('   Password:', password);
    console.log('   ID:', superAdmin.id);
    console.log('   Role:', superAdmin.role);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createSuperAdmin()
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { createSuperAdmin };

