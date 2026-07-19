require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function cleanup() {
    console.log('Cleaning up Alpha Corp...');
    try {
        const prisma = getSharedPrismaClient();

        const testEmail = 'alpha.corp.test@example.com';
        const user = await prisma.user.findUnique({
            where: { email: testEmail }
        });

        if (user) {
            console.log('Deleting user:', user.email);

            // Delete store pages first (cascade should handle it, but let's be safe)
            await prisma.storePage.deleteMany({
                where: { companyId: user.companyId }
            });

            // Delete UserCompany links
            await prisma.userCompany.deleteMany({
                where: { userId: user.id }
            });

            // Delete User
            await prisma.user.delete({
                where: { id: user.id }
            });

            // Delete Company
            await prisma.company.delete({
                where: { id: user.companyId }
            });

            console.log('âœ… Cleanup successful.');
        } else {
            console.log('Alpha Corp user not found. Cleanup skipped.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Cleanup Error:', err);
        process.exit(1);
    }
}

cleanup();

