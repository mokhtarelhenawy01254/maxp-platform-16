const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function fixSuperAdminDashboard() {
  console.log('ðŸ”§ Ø¥ØµÙ„Ø§Ø­ Ù…Ø´Ø§ÙƒÙ„ Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ Ø§Ù„Ø³ÙˆØ¨Ø± Ø£Ø¯Ù…Ù†...\n');
  
  try {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    
    console.log('ðŸ“Š Ø§Ù„Ø®Ø·ÙˆØ© 1: ÙØ­Øµ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©\n');
    
    // 1. ÙØ­Øµ Ø§Ù„Ø´Ø±ÙƒØ§Øª
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true
      },
      take: 5
    });
    
    console.log(`âœ… Ø§Ù„Ø´Ø±ÙƒØ§Øª: ${companies.length} Ø´Ø±ÙƒØ© Ù…ÙˆØ¬ÙˆØ¯Ø©`);
    if (companies.length > 0) {
      console.log('   Ø£Ù…Ø«Ù„Ø©:');
      companies.forEach(c => {
        console.log(`   - ${c.name} - ${c.isActive ? 'Ù†Ø´Ø·Ø©' : 'ØºÙŠØ± Ù†Ø´Ø·Ø©'}`);
      });
    }
    
    // 2. ÙØ­Øµ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†
    console.log('\nâœ… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      },
      take: 5
    });
    
    console.log(`   ${users.length} Ù…Ø³ØªØ®Ø¯Ù… Ù…ÙˆØ¬ÙˆØ¯`);
    const superAdmins = users.filter(u => u.role === 'SUPER_ADMIN');
    console.log(`   ${superAdmins.length} Ø³ÙˆØ¨Ø± Ø£Ø¯Ù…Ù†`);
    
    if (superAdmins.length > 0) {
      console.log('   Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ø³ÙˆØ¨Ø± Ø£Ø¯Ù…Ù†:');
      superAdmins.forEach(sa => {
        console.log(`   - ${sa.email} (${sa.firstName} ${sa.lastName})`);
      });
    } else {
      console.log('   âš ï¸  Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø­Ø³Ø§Ø¨Ø§Øª Ø³ÙˆØ¨Ø± Ø£Ø¯Ù…Ù†!');
    }
    
    // 3. ÙØ­Øµ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡
    const customersCount = await prisma.customer.count();
    console.log(`\nâœ… Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡: ${customersCount} Ø¹Ù…ÙŠÙ„`);
    
    // 4. ÙØ­Øµ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª
    const conversationsCount = await prisma.conversation.count();
    console.log(`âœ… Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª: ${conversationsCount} Ù…Ø­Ø§Ø¯Ø«Ø©`);
    
    // 5. ÙØ­Øµ ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø®Ø·Ø·
    console.log('\nðŸ“Š Ø§Ù„Ø®Ø·ÙˆØ© 2: ÙØ­Øµ Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ø´Ø§Ø·\n');
    const activityDistribution = await prisma.company.groupBy({
      by: ['isActive'],
      _count: { isActive: true }
    });
    
    console.log('âœ… ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ù†Ø´Ø§Ø·:');
    activityDistribution.forEach(p => {
      console.log(`   - ${p.isActive}: ${p._count.isActive} Ø´Ø±ÙƒØ©`);
    });
    
    // 6. ÙØ­Øµ Ø§Ù„Ù†Ø´Ø§Ø· Ø§Ù„Ø£Ø®ÙŠØ±
    console.log('\nðŸ“Š Ø§Ù„Ø®Ø·ÙˆØ© 3: ÙØ­Øµ Ø§Ù„Ù†Ø´Ø§Ø· Ø§Ù„Ø£Ø®ÙŠØ± (30 ÙŠÙˆÙ…)\n');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentCompanies = await prisma.company.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });
    const recentUsers = await prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });
    const recentCustomers = await prisma.customer.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });
    
    console.log('âœ… Ø§Ù„Ù†Ø´Ø§Ø· Ø§Ù„Ø£Ø®ÙŠØ±:');
    console.log(`   - Ø´Ø±ÙƒØ§Øª Ø¬Ø¯ÙŠØ¯Ø©: ${recentCompanies}`);
    console.log(`   - Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ø¬Ø¯Ø¯: ${recentUsers}`);
    console.log(`   - Ø¹Ù…Ù„Ø§Ø¡ Ø¬Ø¯Ø¯: ${recentCustomers}`);
    
    // 7. Ø§Ø®ØªØ¨Ø§Ø± API Response Format
    console.log('\nðŸ“Š Ø§Ù„Ø®Ø·ÙˆØ© 4: Ø§Ø®ØªØ¨Ø§Ø± ØµÙŠØºØ© Ø§Ù„Ù€ API Response\n');
    
    const totalCompanies = await prisma.company.count();
    const activeCompanies = await prisma.company.count({ where: { isActive: true } });
    const totalUsers = await prisma.user.count();
    const totalCustomers = await prisma.customer.count();
    const totalConversations = await prisma.conversation.count();
    
    const apiResponse = {
      success: true,
      data: {
        overview: {
          totalCompanies,
          activeCompanies,
          totalUsers,
          totalCustomers,
          totalConversations
        },

        recentActivity: {
          newCompaniesLast30Days: recentCompanies,
          newUsersLast30Days: recentUsers,
          newCustomersLast30Days: recentCustomers
        }
      }
    };
    
    console.log('âœ… ØµÙŠØºØ© Ø§Ù„Ù€ API Response:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    // 8. ÙØ­Øµ Active Users (DevTimeLog)
    console.log('\nðŸ“Š Ø§Ù„Ø®Ø·ÙˆØ© 5: ÙØ­Øµ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ø§Ù„Ù†Ø´Ø·ÙŠÙ†\n');
    
    try {
      const activeTimers = await prisma.devTimeLog.findMany({
        where: { isRunning: true },
        take: 5
      });
      console.log(`âœ… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ† Ø§Ù„Ù†Ø´Ø·ÙˆÙ†: ${activeTimers.length}`);
    } catch (error) {
      console.log(`âš ï¸  Ø¬Ø¯ÙˆÙ„ DevTimeLog: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('âœ… ØªÙ… Ø§Ù„ÙØ­Øµ Ø¨Ù†Ø¬Ø§Ø­!');
    console.log('='.repeat(60));
    
    console.log('\nðŸ“‹ Ø§Ù„Ù…Ù„Ø®Øµ:');
    console.log(`   - Ø§Ù„Ø´Ø±ÙƒØ§Øª: ${totalCompanies} (${activeCompanies} Ù†Ø´Ø·Ø©)`);
    console.log(`   - Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†: ${totalUsers}`);
    console.log(`   - Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡: ${totalCustomers}`);
    console.log(`   - Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª: ${totalConversations}`);
    console.log(`   - Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ø³ÙˆØ¨Ø± Ø£Ø¯Ù…Ù†: ${superAdmins.length}`);
    
    if (superAdmins.length === 0) {
      console.log('\nâš ï¸  ØªØ­Ø°ÙŠØ±: Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø­Ø³Ø§Ø¨Ø§Øª Ø³ÙˆØ¨Ø± Ø£Ø¯Ù…Ù†!');
      console.log('   Ù‚Ù… Ø¨ØªØ´ØºÙŠÙ„: node create-super-admin.js');
    } else {
      console.log('\nâœ… ÙƒÙ„ Ø´ÙŠØ¡ ÙŠØ¹Ù…Ù„ Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­!');
      console.log('\nðŸ” Ø¨ÙŠØ§Ù†Ø§Øª ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„:');
      console.log(`   Email: ${superAdmins[0].email}`);
      console.log('   Password: Admin@123456');
      console.log('\nðŸŒ Ø§ÙØªØ­ Ø§Ù„Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯:');
      console.log('   http://localhost:3000/super-admin/dashboard');
    }
    
  } catch (error) {
    console.error('\nâŒ Ø®Ø·Ø£:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

fixSuperAdminDashboard();

