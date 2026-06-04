const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function debugPerformance() {
    const prisma = getSharedPrismaClient();
    try {
        const reviews = await prisma.performanceReview.findMany({
            take: 5,
            select: {
                id: true,
                userId: true,
                employeeEmployeeReviewsId: true,
                reviewerId: true
            }
        });
        console.log('Sample Reviews:', JSON.stringify(reviews, null, 2));

        if (reviews.length > 0) {
            const firstReview = reviews[0];
            if (firstReview.userId) {
                const user = await prisma.user.findUnique({ where: { id: firstReview.userId } });
                console.log(`User with ID ${firstReview.userId}:`, user ? `${user.firstName} ${user.lastName}` : 'NOT FOUND');

                const employee = await prisma.employee.findUnique({ where: { id: firstReview.userId } });
                console.log(`Employee with ID ${firstReview.userId}:`, employee ? `${employee.firstName} ${employee.lastName}` : 'NOT FOUND');
            }

            if (firstReview.employeeEmployeeReviewsId) {
                const emp = await prisma.employee.findUnique({ where: { id: firstReview.employeeEmployeeReviewsId } });
                console.log(`Employee with employeeEmployeeReviewsId ${firstReview.employeeEmployeeReviewsId}:`, emp ? `${emp.firstName} ${emp.lastName}` : 'NOT FOUND');
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

debugPerformance();

