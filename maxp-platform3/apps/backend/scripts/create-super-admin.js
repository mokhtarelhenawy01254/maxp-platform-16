const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function createSuperAdmin() {
  try {
    console.log('ðŸ”§ Initializing database...');
    await initializeSharedDatabase();
    
    const prisma = getSharedPrismaClient();
    
    // Super Admin credentials
    const email = 'admin@superadmin.com';
    const password = process.env.PASSWORD || 'Admin@123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('ðŸ” Checking if Super Admin already exists...');
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log('âš ï¸  Super Admin already exists with email:', email);
      console.log('ðŸ“§ Email:', email);
      console.log('ðŸ”‘ Password: Admin@123456');
      return;
    }
    
    console.log('ðŸ‘¤ Creating Super Admin user...');
    const superAdmin = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: email,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
        isEmailVerified: true,
        timezone: 'Africa/Cairo',
        updatedAt: new Date()
      }
    });
    
    console.log('âœ… Super Admin created successfully!');
    console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
    console.log('ðŸ“§ Email:', email);
    console.log('ðŸ”‘ Password: Admin@123456');
    console.log('ðŸ‘¤ User ID:', superAdmin.id);
    console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
    console.log('');
    console.log('ðŸŒ You can now login at: http://localhost:3000/auth/login');
    console.log('');
    
  } catch (error) {
    console.error('âŒ Error creating Super Admin:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

createSuperAdmin();

