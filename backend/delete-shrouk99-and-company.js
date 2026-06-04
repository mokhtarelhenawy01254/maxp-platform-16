require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { getSharedPrismaClient } = require('./services/sharedDatabase');

const TARGET_EMAIL = 'shrouk99@gmail.com';
const TARGET_COMPANY_ID = 'cmlf06nhc0000vba4ccotyrcp'; // "k3" company

async function deleteUserAndCompany() {
    const prisma = getSharedPrismaClient();
    try {
        console.log('🔍 Finding user...');
        const user = await prisma.user.findFirst({
            where: { email: TARGET_EMAIL },
            select: { id: true, email: true, companyId: true }
        });

        if (!user) {
            console.log('❌ User not found!');
            return;
        }

        console.log(`✅ Found user: ${user.id} (${user.email})`);
        console.log(`   Company: ${user.companyId}`);

        const userId = user.id;
        const companyId = TARGET_COMPANY_ID;

        // Step 1: Delete UserCompany associations
        console.log('\n🗑️ Step 1: Deleting UserCompany records...');
        const ucDel = await prisma.userCompany.deleteMany({ where: { userId } });
        console.log(`   Deleted ${ucDel.count} userCompany records`);

        // Step 2: Delete UserInvitations
        console.log('🗑️ Step 2: Deleting UserInvitations...');
        const uiDel = await prisma.userInvitation.deleteMany({ where: { companyId } });
        console.log(`   Deleted ${uiDel.count} invitations`);

        // Step 3: Delete the user
        console.log('🗑️ Step 3: Deleting user...');
        await prisma.user.delete({ where: { id: userId } });
        console.log(`   ✅ User deleted`);

        // Step 4: Delete the company (cascade should handle most relations)
        console.log('🗑️ Step 4: Deleting company...');
        await prisma.company.delete({ where: { id: companyId } });
        console.log(`   ✅ Company "k3" deleted`);

        console.log('\n✅ Done! User shrouk99@gmail.com and company "k3" deleted successfully.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteUserAndCompany();
