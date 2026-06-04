const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function fixSuperAdminLogin() {
  console.log('ðŸ”§ Ø¥ØµÙ„Ø§Ø­ Ù…Ø´ÙƒÙ„Ø© ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø³ÙˆØ¨Ø± Ø£Ø¯Ù…Ù†...\n');

  try {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();

    // 1. Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø­Ø³Ø§Ø¨ Ø§Ù„Ø³ÙˆØ¨Ø± Ø£Ø¯Ù…Ù†
    console.log('1ï¸âƒ£ Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø­Ø³Ø§Ø¨ Ø§Ù„Ø³ÙˆØ¨Ø± Ø£Ø¯Ù…Ù†...');
    const superAdmin = await prisma.user.findUnique({
      where: { email: 'admin@superadmin.com' }
    });

    if (!superAdmin) {
      console.log('âŒ Ø­Ø³Ø§Ø¨ Ø§Ù„Ø³ÙˆØ¨Ø± Ø£Ø¯Ù…Ù† ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯!');
      console.log('   Ù‚Ù… Ø¨ØªØ´ØºÙŠÙ„: node create-super-admin.js');
      process.exit(1);
    }

    console.log('âœ… ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ø­Ø³Ø§Ø¨');
    console.log('   ID:', superAdmin.id);
    console.log('   Email:', superAdmin.email);
    console.log('   Role:', superAdmin.role);
    console.log('   Active:', superAdmin.isActive);

    // 2. Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±
    console.log('\n2ï¸âƒ£ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±...');
    const passwordMatch = await bcrypt.compare('Admin@123456', superAdmin.password);

    if (!passwordMatch) {
      console.log('âš ï¸  ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± ØµØ­ÙŠØ­Ø©ØŒ Ø¬Ø§Ø±ÙŠ Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ†Ù‡Ø§...');
      const hashedPassword = await bcrypt.hash('Admin@123456', 10);
      await prisma.user.update({
        where: { id: superAdmin.id },
        data: { password: hashedPassword }
      });
      console.log('âœ… ØªÙ… Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±');
    } else {
      console.log('âœ… ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ØµØ­ÙŠØ­Ø©');
    }

    // 3. Ø§Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø£Ù† Ø§Ù„Ø­Ø³Ø§Ø¨ Ù†Ø´Ø·
    console.log('\n3ï¸âƒ£ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø³Ø§Ø¨...');
    if (!superAdmin.isActive) {
      console.log('âš ï¸  Ø§Ù„Ø­Ø³Ø§Ø¨ ØºÙŠØ± Ù†Ø´Ø·ØŒ Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªÙØ¹ÙŠÙ„...');
      await prisma.user.update({
        where: { id: superAdmin.id },
        data: { isActive: true }
      });
      console.log('âœ… ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø­Ø³Ø§Ø¨');
    } else {
      console.log('âœ… Ø§Ù„Ø­Ø³Ø§Ø¨ Ù†Ø´Ø·');
    }

    // 4. Ø¥Ù†Ø´Ø§Ø¡ ØªÙˆÙƒÙ† ØªØ¬Ø±ÙŠØ¨ÙŠ
    console.log('\n4ï¸âƒ£ Ø¥Ù†Ø´Ø§Ø¡ ØªÙˆÙƒÙ† ØªØ¬Ø±ÙŠØ¨ÙŠ...');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const token = jwt.sign(
      {
        id: superAdmin.id,
        email: superAdmin.email,
        role: superAdmin.role,
        companyId: null
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('âœ… ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ØªÙˆÙƒÙ†');
    console.log('\nðŸ“‹ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØªÙˆÙƒÙ†:');
    console.log('   Token (Ø£ÙˆÙ„ 50 Ø­Ø±Ù):', token.substring(0, 50) + '...');

    // 5. Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ù€ /auth/me endpoint
    console.log('\n5ï¸âƒ£ Ø§Ø®ØªØ¨Ø§Ø± endpoint /auth/me...');
    console.log('   ÙŠÙ…ÙƒÙ†Ùƒ Ø§Ø®ØªØ¨Ø§Ø±Ù‡ Ø¨Ø§Ù„Ø£Ù…Ø± Ø§Ù„ØªØ§Ù„ÙŠ:');
    console.log(`   curl -H "Authorization: Bearer ${token}" http://localhost:3007/api/v1/auth/me`);

    // 6. Ø§Ù„Ø­Ù„ Ø§Ù„Ù…Ù‚ØªØ±Ø­
    console.log('\n' + '='.repeat(60));
    console.log('âœ… ØªÙ… Ø§Ù„ÙØ­Øµ Ø¨Ù†Ø¬Ø§Ø­!');
    console.log('='.repeat(60));

    console.log('\nðŸ” Ø¨ÙŠØ§Ù†Ø§Øª ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„:');
    console.log('   Email: admin@superadmin.com');
    console.log('   Password: Admin@123456');

    console.log('\nðŸ“ Ø®Ø·ÙˆØ§Øª Ø§Ù„Ø­Ù„:');
    console.log('   1. Ø§ÙØªØ­ Ø§Ù„Ù…ØªØµÙØ­ ÙÙŠ ÙˆØ¶Ø¹ Incognito/Private');
    console.log('   2. Ø§Ø°Ù‡Ø¨ Ø¥Ù„Ù‰: http://localhost:3000/auth/login');
    console.log('   3. Ø³Ø¬Ù„ Ø¯Ø®ÙˆÙ„ Ø¨Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø£Ø¹Ù„Ø§Ù‡');
    console.log('   4. Ø§ÙØªØ­ Developer Tools (F12)');
    console.log('   5. ØªØ­Ù‚Ù‚ Ù…Ù† Console Ù„Ù„Ø£Ø®Ø·Ø§Ø¡');
    console.log('   6. ØªØ­Ù‚Ù‚ Ù…Ù† Application > Local Storage');
    console.log('      - accessToken ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ù…ÙˆØ¬ÙˆØ¯');
    console.log('      - user ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ù…ÙˆØ¬ÙˆØ¯');

    console.log('\nðŸ› Ø¥Ø°Ø§ Ø§Ø³ØªÙ…Ø±Øª Ø§Ù„Ù…Ø´ÙƒÙ„Ø©:');
    console.log('   1. Ø§Ù…Ø³Ø­ Local Storage Ùˆ Session Storage');
    console.log('   2. Ø§Ù…Ø³Ø­ Cookies');
    console.log('   3. Ø£Ø¹Ø¯ ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØµÙØ­Ø©');
    console.log('   4. Ø³Ø¬Ù„ Ø¯Ø®ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰');

    console.log('\nðŸ’¡ Ù†ØµÙŠØ­Ø©:');
    console.log('   Ø§Ø³ØªØ®Ø¯Ù… ØµÙØ­Ø© ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø§Ù„Ù…Ø®ØµØµØ© Ù„Ù„Ø³ÙˆØ¨Ø± Ø£Ø¯Ù…Ù†:');
    console.log('   http://localhost:3000/super-admin/login');

  } catch (error) {
    console.error('\nâŒ Ø®Ø·Ø£:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

fixSuperAdminLogin();

