require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function createTestData() {
    const prisma = getSharedPrismaClient();
    try {
        const company = await prisma.company.findFirst();
        if (!company) return console.log('âŒ No company');

        const employee = await prisma.employee.findFirst({
            where: { companyId: company.id }
        });
        if (!employee) return console.log('âŒ No employee');

        console.log(`ðŸ‘¤ Using Employee: ${employee.firstName} ${employee.lastName} (${employee.id}) for Company: ${company.name} (${company.id})`);

        // Create a pending permission
        const permission = await prisma.hrPermissionRequest.create({
            data: {
                companyId: company.id,
                employeeId: employee.id,
                type: 'DEDUCTIBLE', // Correct enum value
                date: new Date(),
                startTime: '09:00',
                endTime: '11:00',
                totalHours: 2.0,
                reason: 'Test Reason - Need to go to the bank',
                status: 'PENDING'
            }
        });
        console.log('âœ… Created Pending Permission:', permission.id);

        // Create a pending advance
        // The model AdvanceRequest uses userId and can also use employeeRelId
        const advance = await prisma.advanceRequest.create({
            data: {
                companyId: company.id,
                userId: employee.userId,
                employeeRelId: employee.id,
                amount: 1500.0,
                status: 'PENDING',
                reason: 'Test Advance Request',
                repaymentType: 'MONTHLY',
                installmentsCount: 3,
                monthlyAmount: 500.0,
                employeeSalary: 8000.0,
                maxAllowedAmount: 4000.0,
                installmentAmount: 500.0,
                remainingBalance: 1500.0
            }
        });
        console.log('âœ… Created Pending Advance:', advance.id);

    } catch (error) {
        console.error('âŒ Error creating test data:', error);
    } finally {
        // Note: getSharedPrismaClient might be a shared instance that doesn't need disconnect here 
        // but in a script it's safer if it's the only thing running.
        // However, the shared service manages it. We'll just exit.
        process.exit(0);
    }
}

createTestData();

