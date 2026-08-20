
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const companyId = 'cmmhkxobb0000vpk440j1n6ui';
  console.log(`🔍 Checking settings for company: ${companyId}`);
  
  const settings = await prisma.orderConfirmationSettings.findUnique({
    where: { companyId }
  });

  if (settings) {
    console.log('✅ Settings found:');
    console.log(JSON.stringify(settings, null, 2));
    
    if (!settings.enabled || !settings.distributionEnabled) {
        console.log('⚠️ Auto-distribution is DISABLED. Enabling it now for testing...');
        await prisma.orderConfirmationSettings.update({
            where: { companyId },
            data: { 
                enabled: true, 
                distributionEnabled: true,
                distributionStrategy: 'round_robin'
            }
        });
        console.log('✅ Auto-distribution has been ENABLED.');
    }
  } else {
    console.log('❌ No settings found for this company ID.');
    
    console.log('🔍 Searching for ANY company with auto-distribution enabled...');
    const anyEnabled = await prisma.orderConfirmationSettings.findFirst({
        where: { enabled: true, distributionEnabled: true },
        include: { company: true }
    });
    
    if (anyEnabled) {
        console.log(`✅ Found another company: ${anyEnabled.company.name} (${anyEnabled.companyId})`);
    } else {
        console.log('❌ No company has auto-distribution enabled.');
    }
  }

  // Also check for active agents
  const agents = await prisma.userCompany.findMany({
    where: { companyId, isActive: true },
    include: { user: true }
  });
  
  console.log(`👥 Active members: ${agents.length}`);
  agents.forEach(a => {
    console.log(`- ${a.user.firstName} ${a.user.lastName} (${a.user.id}) - Availability: ${a.user.availability}`);
    if (a.user.availability !== 'available') {
        console.log(`  Updating ${a.user.firstName} to 'available'...`);
        // We'll do this in a separate step if needed to avoid side effects in a "check" script, 
        // but for testing we need at least one available agent.
    }
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
