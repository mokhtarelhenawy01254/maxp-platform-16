const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const whatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

/**
 * بدء خدمة التحقق من أعياد الميلاد
 */
function startBirthdayScheduler() {
    console.log('🎂 [BIRTHDAY-CRON] Initializing Birthday Cron Service...');

    // يعمل يومياً الساعة 10 صباحاً بتوقيت السيرفر
    cron.schedule('0 10 * * *', async () => {
        console.log('🎂 [BIRTHDAY-CRON] Checking for birthdays...');
        const prisma = getSharedPrismaClient();

        try {
            const today = new Date();
            const currentMonth = today.getMonth() + 1; // 1-12
            const currentDay = today.getDate(); // 1-31

            // جلب الموظفين النشطين الذين لديهم تاريخ ميلاد
            // ملاحظة: Prisma لا تدعم استخراج التاريخ مباشرة بشكل جيد عبر كل قواعد البيانات في findMany
            // لذا سنقوم بجلب الحقول اللازمة والتحقق في الكود (عدد الموظفين عادة ليس ضخماً)
            const employees = await prisma.employee.findMany({
                where: {
                    status: 'ACTIVE',
                    dateOfBirth: { not: null }
                },
                select: {
                    id: true,
                    firstName: true,
                    firstNameEn: true,
                    lastName: true,
                    dateOfBirth: true,
                    phone: true,
                    mobile: true,
                    companyId: true
                }
            });

            let count = 0;
            for (const emp of employees) {
                if (!emp.dateOfBirth) continue;

                const bdate = new Date(emp.dateOfBirth);
                if (bdate.getMonth() + 1 === currentMonth && bdate.getDate() === currentDay) {
                    // إنه عيد ميلاد الموظف!
                    console.log(`🎂 [BIRTHDAY-CRON] Found birthday: ${emp.firstName} ${emp.lastName}`);

                    // تجهيز كائن الموظف بالشكل المطلوب
                    const employeeData = {
                        id: emp.id,
                        firstName: emp.firstName,
                        name: `${emp.firstName} ${emp.lastName}`,
                        phone: emp.phone || emp.mobile
                    };

                    await whatsAppNotificationService.sendBirthdayNotification(employeeData, emp.companyId);
                    count++;
                }
            }

            if (count > 0) {
                console.log(`✅ [BIRTHDAY-CRON] Processed birthdays. Sent: ${count} notifications`);
            } else {
                console.log('ℹ️ [BIRTHDAY-CRON] No birthdays found today.');
            }

        } catch (error) {
            console.error('❌ [BIRTHDAY-CRON] Error checking birthdays:', error);
        }
    });

    console.log('✅ [BIRTHDAY-CRON] Birthday scheduler started (runs daily at 10:00 AM)');
}

module.exports = { startBirthdayScheduler };
