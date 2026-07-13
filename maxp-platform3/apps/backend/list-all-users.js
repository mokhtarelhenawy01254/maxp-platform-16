const { initializeSharedDatabase, getSharedPrismaClient } = require('./services/sharedDatabase');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('🚀 [DIAGNOSTIC] Checking database content...');
  
  try {
    // 1. Trace .env.local
    const envLocalPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envLocalPath)) {
      console.log('📝 [DIAGNOSTIC] .env.local exists');
    } else {
      console.log('⚠️ [DIAGNOSTIC] .env.local NOT found');
    }

    // 2. Initialize DB
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();

    // 3. List Users
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        email: true, 
        role: true, 
        isActive: true, 
        companyId: true,
        password: true // We need to see if it's hashed
      }
    });

    console.log(`📊 [DIAGNOSTIC] Found ${users.length} users:`);
    for (const u of users) {
      const passPreview = u.password ? u.password.substring(0, 10) + '...' : 'NULL';
      console.log(`   - ID: ${u.id} | Email: ${u.email} | Active: ${u.isActive} | Company: ${u.companyId} | Pass: ${passPreview}`);
    }

    // 4. Check target user specifically
    const targetEmail = 'mokhtar@mokhtar.com';
    const target = users.find(u => u.email.toLowerCase().trim() === targetEmail);
    if (target) {
      console.log(`✅ [DIAGNOSTIC] Target user '${targetEmail}' FOUND.`);
      if (!target.isActive) console.warn('🚨 [DIAGNOSTIC] User is INACTIVE!');
      if (!target.companyId) console.warn('🚨 [DIAGNOSTIC] User has NO COMPANY association!');
    } else {
      console.error(`❌ [DIAGNOSTIC] Target user '${targetEmail}' NOT FOUND in the list.`);
    }

  } catch (err) {
    console.error('❌ [DIAGNOSTIC] Error:', err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

main();
