const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function debugPerformanceDeep() {
    const prisma = getSharedPrismaClient();
    try {
        const reviews = await prisma.performanceReview.findMany({
            take: 10,
        });

        for (const review of reviews) {
            console.log(`--- Review ${review.id} ---`);
            console.log(`userId: ${review.userId}, reviewerId: ${review.reviewerId}, companyId: ${review.companyId}`);

            if (review.userId) {
                const user = await prisma.user.findUnique({ where: { id: review.userId } });
                console.log(`User: ${user ? `${user.firstName} ${user.lastName} (Company: ${user.companyId})` : 'NOT FOUND'}`);

                const employeeByUserId = await prisma.employee.findFirst({ where: { userId: review.userId } });
                console.log(`Employee (by userId): ${employeeByUserId ? `${employeeByUserId.firstName} ${employeeByUserId.lastName} (Company: ${employeeByUserId.companyId})` : 'NOT FOUND'}`);

                const employeeById = await prisma.employee.findUnique({ where: { id: review.userId } });
                console.log(`Employee (by ID): ${employeeById ? `${employeeById.firstName} ${employeeById.lastName} (Company: ${employeeById.companyId})` : 'NOT FOUND'}`);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

debugPerformanceDeep();

