
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function globalRepair() {
    console.log('ðŸŒ Starting GLOBAL Repair for all companies...');

    // 1. Find all active Users who have an employeeNumber but are inactive in UserCompany
    const usersToFix = await prisma.user.findMany({
        where: {
            isActive: true,
            employeeNumber: { not: null },
            companyId: { not: null }
        }
    });

    console.log(`ðŸ“‹ Found ${usersToFix.length} active users serving as employees.`);

    let fixCount = 0;
    for (const user of usersToFix) {
        const uc = await prisma.userCompany.findUnique({
            where: {
                userId_companyId: {
                    userId: user.id,
                    companyId: user.companyId
                }
            }
        });

        if (!uc) {
            // Create if missing
            await prisma.userCompany.create({
                data: {
                    userId: user.id,
                    companyId: user.companyId,
                    role: user.role || 'AGENT',
                    isActive: true,
                    isDefault: true
                }
            });
            fixCount++;
        } else if (!uc.isActive) {
            // Update if inactive
            await prisma.userCompany.update({
                where: {
                    userId_companyId: {
                        userId: user.id,
                        companyId: user.companyId
                    }
                },
                data: { isActive: true }
            });
            fixCount++;
        }
    }

    console.log(`âœ… Global repair finished. Fixed/Created ${fixCount} UserCompany records.`);
    await prisma.$disconnect();
}

globalRepair().catch(console.error);

