
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function repairEmployeeStatus() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    console.log(`ðŸ”§ Starting repair for Company: ${companyId}`);

    // Find all active users with employee numbers in this company
    // whose UserCompany entry might be inactive
    const usersToFix = await prisma.user.findMany({
        where: {
            companyId,
            isActive: true,
            employeeNumber: { not: null },
            userCompanies: {
                some: {
                    companyId,
                    isActive: false
                }
            }
        },
        select: { id: true, firstName: true, lastName: true, employeeNumber: true }
    });

    console.log(`ðŸ“‹ Found ${usersToFix.length} employees that need fixing.`);

    for (const user of usersToFix) {
        console.log(`âž¡ï¸ Fixing status for: ${user.firstName} ${user.lastName} (${user.employeeNumber})`);

        await prisma.userCompany.update({
            where: {
                userId_companyId: {
                    userId: user.id,
                    companyId: companyId
                }
            },
            data: { isActive: true }
        });
    }

    console.log('âœ… Repair completed successfully.');

    // Verify final count
    const finalActiveCount = await prisma.user.count({
        where: {
            employeeNumber: { not: null },
            userCompanies: {
                some: {
                    companyId,
                    isActive: true
                }
            }
        }
    });
    console.log(`ðŸ“Š Total active employees showing now: ${finalActiveCount}`);

    await prisma.$disconnect();
}

repairEmployeeStatus().catch(console.error);

