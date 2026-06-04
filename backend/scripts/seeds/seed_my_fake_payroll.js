const dotenv = require('dotenv');
dotenv.config();

// Fix for Prisma looking for DATABASE_URL when we simulate env locally
if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_URL;
}

// Use the same generated client as the main app
const { PrismaClient } = require('../../prisma/generated/postgresql');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.POSTGRES_URL
        }
    }
});

async function seedMyFakePayroll() {
    try {
        console.log('ðŸ” Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø­Ø³Ø§Ø¨Ùƒ...');

        // 1. Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { contains: 'h2m' } },
                    { role: 'SUPER_ADMIN' },
                    { role: 'COMPANY_ADMIN' }
                ]
            }
        });

        if (!user) {
            console.log('âš ï¸ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ù…Ø³ØªØ®Ø¯Ù… admin. Ø¬Ø§Ø±Ù Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø£ÙŠ Ù…Ø³ØªØ®Ø¯Ù…...');
            user = await prisma.user.findFirst();
        }

        if (!user) {
            console.error('âŒ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† ÙÙŠ Ø§Ù„Ù†Ø¸Ø§Ù…!');
            return;
        }

        console.log(`âœ… ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…: ${user.firstName} ${user.lastName} (${user.email})`);

        // **NEW**: Ensure we have a companyId (fallback if user doesn't have one)
        let companyId = user.companyId;
        if (!companyId) {
            console.log('âš ï¸ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ù„Ø§ ÙŠÙ†ØªÙ…ÙŠ Ø¥Ù„Ù‰ Ø´Ø±ÙƒØ©. Ø¬Ø§Ø±Ù Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø£ÙŠ Ø´Ø±ÙƒØ© ÙÙŠ Ø§Ù„Ù†Ø¸Ø§Ù…...');
            const fallbackCompany = await prisma.company.findFirst();
            if (fallbackCompany) {
                companyId = fallbackCompany.id;
                console.log(`âœ… Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø´Ø±ÙƒØ© Ø¨Ø¯ÙŠÙ„Ø©: ${fallbackCompany.name}`);
            } else {
                console.error('âŒ Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø´Ø±ÙƒØ§Øª ÙÙŠ Ø§Ù„Ù†Ø¸Ø§Ù…! ÙŠØ±Ø¬Ù‰ Ø¥Ù†Ø´Ø§Ø¡ Ø´Ø±ÙƒØ© Ø£ÙˆÙ„Ø§Ù‹.');
                return;
            }
        }

        // **NEW**: Find or create Employee record linked to this user
        let employeeRecord = await prisma.employee.findFirst({
            where: { userId: user.id }
        });

        if (!employeeRecord) {
            console.log('âš ï¸ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø³Ø¬Ù„ Ù…ÙˆØ¸Ù (Employee) Ù„Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…. Ø¬Ø§Ø±ÙŠ Ø¥Ù†Ø´Ø§Ø¤Ù‡...');
            employeeRecord = await prisma.employee.create({
                data: {
                    companyId: companyId,
                    userId: user.id,
                    firstName: user.firstName || 'User',
                    lastName: user.lastName || 'Name',
                    email: user.email,
                    employeeNumber: 'EMP-' + Math.floor(Math.random() * 100000),
                    hireDate: new Date(),
                    status: 'ACTIVE'
                }
            });
            console.log(`âœ… ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø³Ø¬Ù„ Ù…ÙˆØ¸Ù Ø¨Ø±Ù‚Ù…: ${employeeRecord.employeeNumber}`);
        } else {
            console.log(`âœ… ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø³Ø¬Ù„ Ø§Ù„Ù…ÙˆØ¸Ù: ${employeeRecord.employeeNumber}`);
        }


        const userId = user.id;
        const currentMonth = new Date().getMonth() + 1; // Month 1-12
        const currentYear = new Date().getFullYear();

        // ØªÙ†Ø¸ÙŠÙ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø³Ø§Ø¨Ù‚Ø© Ù„Ù‡Ø°Ø§ Ø§Ù„Ø´Ù‡Ø± Ù„Ù„ØªØ¬Ø±Ø¨Ø© Ø§Ù„Ù…ÙƒØ±Ø±Ø©
        console.log('ðŸ§¹ ØªÙ†Ø¸ÙŠÙ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ù‡Ø± Ø§Ù„Ø­Ø§Ù„ÙŠ Ù„Ù„ØªØ¬Ø±Ø¨Ø©...');
        await prisma.attendance.deleteMany({
            where: {
                userId: userId,
                date: {
                    gte: new Date(currentYear, currentMonth - 1, 1),
                    lt: new Date(currentYear, currentMonth, 1)
                }
            }
        });

        // Delete permissions linked to this employee
        await prisma.hrPermissionRequest.deleteMany({
            where: {
                employeeId: employeeRecord.id,
                date: {
                    gte: new Date(currentYear, currentMonth - 1, 1),
                    lt: new Date(currentYear, currentMonth, 1)
                }
            }
        });

        await prisma.payroll.deleteMany({
            where: {
                userId: userId,
                month: currentMonth,
                year: currentYear
            }
        });

        console.log('ðŸ“… Ø¥Ø¶Ø§ÙØ© Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ± (30 ÙŠÙˆÙ…)...');

        // 2. Ø¥Ø¶Ø§ÙØ© Ø­Ø¶ÙˆØ± (Ø¨Ù…Ø§ ÙÙŠ Ø°Ù„Ùƒ ØªØ£Ø®ÙŠØ±Ø§Øª)
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        let totalLateMinutes = 0;
        let absentDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth - 1, day);
            const dayOfWeek = date.getDay();

            if (dayOfWeek === 5 || dayOfWeek === 6) continue;

            let checkIn = new Date(date);
            let checkOut = new Date(date);
            let lateMinutes = 0;
            let status = 'PRESENT';

            if (day === 5 || day === 15) {
                checkIn.setHours(9, 45, 0);
                lateMinutes = 45;
                totalLateMinutes += 45;
            } else if (day === 20) {
                status = 'ABSENT';
                checkIn = null;
                checkOut = null;
                absentDays++;
            } else {
                checkIn.setHours(9, 0, 0);
            }

            if (status === 'PRESENT') {
                checkOut.setHours(17, 0, 0);
            }

            if (status !== 'ABSENT') {
                await prisma.attendance.create({
                    data: {
                        companyId,
                        userId,
                        date: date,
                        checkIn: checkIn,
                        checkOut: checkOut,
                        status: 'PRESENT',
                        lateMinutes: lateMinutes,
                        workHours: 8,
                        checkInMethod: 'WEB',
                        checkOutMethod: 'WEB'
                    }
                });
            }
        }
        console.log(`   - Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØªØ£Ø®ÙŠØ±: ${totalLateMinutes} Ø¯Ù‚ÙŠÙ‚Ø©`);
        console.log(`   - Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØºÙŠØ§Ø¨: ${absentDays} ÙŠÙˆÙ…`);

        console.log('ðŸ™ Ø¥Ø¶Ø§ÙØ© Ø·Ù„Ø¨Ø§Øª Ø§Ø³ØªØ¦Ø°Ø§Ù†...');

        // 3. Ø¥Ø¶Ø§ÙØ© Ø§Ø³ØªØ¦Ø°Ø§Ù† (Permission) using Employee ID
        // âœ… FIX: Use correct Enum values: DEDUCTIBLE, NON_DEDUCTIBLE, FIXED_HOURS, COMPENSATORY
        await prisma.hrPermissionRequest.create({
            data: {
                companyId,
                employeeId: employeeRecord.id,
                type: 'DEDUCTIBLE', // Personal, causes deduction
                date: new Date(currentYear, currentMonth - 1, 10),
                startTime: '10:00',
                endTime: '12:00',
                totalHours: 2.0,
                reason: 'Ø¥Ø°Ù† Ø´Ø®ØµÙŠ (Ø¸Ø±Ù Ø·Ø§Ø±Ø¦ Ø®Ø§Øµ)',
                status: 'APPROVED',
                isCompensated: false,
                approvedAt: new Date(),
                approvedById: employeeRecord.id
            }
        });

        await prisma.hrPermissionRequest.create({
            data: {
                companyId,
                employeeId: employeeRecord.id,
                type: 'NON_DEDUCTIBLE', // Official duty
                date: new Date(currentYear, currentMonth - 1, 12),
                startTime: '14:00',
                endTime: '16:00',
                totalHours: 2.0,
                reason: 'Ù…Ù‡Ù…Ø© Ø¹Ù…Ù„ Ø®Ø§Ø±Ø¬ÙŠØ©',
                status: 'APPROVED',
                isCompensated: true,
                approvedAt: new Date(),
                approvedById: employeeRecord.id
            }
        });

        await prisma.hrPermissionRequest.create({
            data: {
                companyId,
                employeeId: employeeRecord.id,
                type: 'DEDUCTIBLE',
                date: new Date(currentYear, currentMonth - 1, 14),
                startTime: '09:00',
                endTime: '11:00',
                totalHours: 2.0,
                reason: 'Ù…ÙŠØ¹Ø§Ø¯ Ø·Ø¨ÙŠØ¨',
                status: 'PENDING',
                isCompensated: false
            }
        });


        console.log('ðŸ’° Ø­Ø³Ø§Ø¨ Ø§Ù„Ø±Ø§ØªØ¨ ÙˆØ¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙƒØ´Ù...');

        // 4. Ø¥Ù†Ø´Ø§Ø¡ Payroll
        const baseSalary = Number(user.baseSalary) || 8500;

        // Ø­Ø³Ø§Ø¨ ØªÙ‚Ø±ÙŠØ¨ÙŠ Ù„Ù„Ø®ØµÙˆÙ…Ø§Øª
        const lateDeduction = (baseSalary / 30 / 8 / 60) * totalLateMinutes;
        const absenceDeduction = (baseSalary / 30) * absentDays;
        const permissionsDeduction = (baseSalary / 30 / 8) * 2;

        const totalDeductions = Math.round(lateDeduction + absenceDeduction + permissionsDeduction + 200);

        const netSalary = baseSalary - totalDeductions;

        await prisma.payroll.create({
            data: {
                companyId,
                userId,
                month: currentMonth,
                year: currentYear,
                periodStart: new Date(currentYear, currentMonth - 1, 1),
                periodEnd: new Date(currentYear, currentMonth, 0),
                baseSalary: baseSalary,
                grossSalary: baseSalary,
                netSalary: netSalary,
                totalDeductions: totalDeductions,
                deductions: JSON.stringify([
                    { name: 'Ø®ØµÙ… ØªØ£Ø®ÙŠØ±Ø§Øª', amount: lateDeduction.toFixed(2) },
                    { name: 'ØºÙŠØ§Ø¨ Ø¨Ø¯ÙˆÙ† Ø¥Ø°Ù†', amount: absenceDeduction.toFixed(2) },
                    { name: 'Ø¥Ø°Ù† Ø´Ø®ØµÙŠ (ØºÙŠØ± Ù…Ø¹ÙˆØ¶)', amount: permissionsDeduction.toFixed(2) },
                    { name: 'ØªØ£Ù…ÙŠÙ† Ø§Ø¬ØªÙ…Ø§Ø¹ÙŠ', amount: 200 }
                ]),
                allowances: JSON.stringify([
                    { name: 'Ø¨Ø¯Ù„ Ø§Ù†ØªÙ‚Ø§Ù„', amount: 500 },
                    { name: 'Ø¨Ø¯Ù„ ØºÙ„Ø§Ø¡ Ù…Ø¹ÙŠØ´Ø©', amount: 300 }
                ]),
                totalAllowances: 800,
                status: 'PAID',
                paidAt: new Date(),
                notes: 'Ø±Ø§ØªØ¨ Ø´Ù‡Ø± ØªØ¬Ø±ÙŠØ¨ÙŠ Ù…Ø¹ ØªØ£Ø®ÙŠØ±Ø§Øª ÙˆØ§Ø³ØªØ¦Ø°Ø§Ù†Ø§Øª',
                attendanceDeduction: Math.round(lateDeduction + absenceDeduction),
                absentDays: absentDays
            }
        });

        console.log('âœ¨ ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¨Ù†Ø¬Ø§Ø­!');
        console.log(`   - Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…: ${user.email}`);
        console.log(`   - Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø®ØµÙˆÙ…Ø§Øª: ${totalDeductions.toFixed(2)}`);
        console.log(`   - Ø§Ù„Ø±Ø§ØªØ¨ Ø§Ù„ØµØ§ÙÙŠ: ${netSalary.toFixed(2)}`);

    } catch (error) {
        console.error('âŒ Ø­Ø¯Ø« Ø®Ø·Ø£:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedMyFakePayroll();

