
require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    const employeeId = 'cmlcatkuf0007vb7090uwdz6r';
    const userId = 'cmlcatkrn0003vb70hp1j86zv';

    // Create a pending permission
    const perm = await prisma.hrPermissionRequest.create({
        data: {
            companyId,
            employeeId,
            type: 'DEDUCTIBLE',
            date: new Date(),
            startTime: '10:00',
            endTime: '12:00',
            totalHours: 2.0,
            reason: 'Ù…Ø´ÙˆØ§Ø± Ø¹Ø§Ø¦Ù„ÙŠ Ø·Ø§Ø±Ø¦ - ØªØ¬Ø±Ø¨Ø©',
            status: 'PENDING'
        }
    });
    console.log('âœ… Created test permission:', perm.id);

    // Create a pending advance
    const adv = await prisma.advanceRequest.create({
        data: {
            companyId,
            userId,
            employeeRelId: employeeId,
            amount: 5000,
            reason: 'Ø³Ù„ÙØ© Ù„ØªØ¬Ø¯ÙŠØ¯ Ø±Ø®ØµØ© Ø§Ù„Ø³ÙŠØ§Ø±Ø© - ØªØ¬Ø±Ø¨Ø©',
            repaymentType: 'MONTHLY',
            installmentsCount: 5,
            monthlyAmount: 1000,
            status: 'PENDING'
        }
    });
    console.log('âœ… Created test advance:', adv.id);

    // Create a pending leave as well to be sure
    const leave = await prisma.leaveRequest.create({
        data: {
            companyId,
            userId,
            employeeRelId: employeeId,
            type: 'ANNUAL',
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000 * 3), // 3 days
            totalDays: 3,
            reason: 'Ø¥Ø¬Ø§Ø²Ø© Ø³Ù†ÙˆÙŠØ© Ø§Ø®ØªØ¨Ø§Ø±ÙŠØ©',
            status: 'PENDING'
        }
    });
    console.log('âœ… Created test leave:', leave.id);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

