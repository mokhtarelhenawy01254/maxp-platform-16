const { getSharedPrismaClient } = require('../sharedDatabase');

async function healHrAttendanceAndDeductions() {
  try {
    const prisma = getSharedPrismaClient();

    // 1. تصفير الساعات السالبة الناتجة عن البصمات المزدوجة القديمة
    const clampedResult = await prisma.attendance.updateMany({
      where: {
        workHours: { lt: 0 }
      },
      data: {
        workHours: 0
      }
    });
    if (clampedResult.count > 0) {
      console.log(`✅ [HR-HEALER] Clamped ${clampedResult.count} negative workHours attendance records to 0`);
    }

    // 2. إلغاء الخصم التلقائي الوهمي لحبيبة (134.62 ج) وسجلات البصمة المزدوجة (< 5 دقائق)
    const bogusEarlyDeductions = await prisma.manualDeduction.findMany({
      where: {
        category: 'AUTO_DEDUCTION',
        type: 'EARLY_LEAVE',
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    for (const d of bogusEarlyDeductions) {
      const attIdMatch = d.notes ? d.notes.match(/Attendance ID:\s*([a-zA-Z0-9_-]+)/) : null;
      if (attIdMatch) {
        const att = await prisma.attendance.findUnique({
          where: { id: attIdMatch[1] },
          select: { checkIn: true, checkOut: true, earlyLeaveMinutes: true }
        });
        if (att && att.checkIn && att.checkOut) {
          const diffMs = Math.abs(new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime());
          if (diffMs < 5 * 60 * 1000) {
            await prisma.manualDeduction.update({
              where: { id: d.id },
              data: {
                status: 'CANCELLED',
                notes: `${d.notes || ''}\nCancelled by HR-HEALER: double punch bounce (<5 mins)`
              }
            });
            console.log(`✅ [HR-HEALER] Cancelled bogus early checkout deduction ${d.id} (${d.amount} EGP)`);
          }
        }
      }
    }

    // 3. إلغاء الخصومات التلقائية المعلقة التي تم تصحيح سجل حضورها إلى 0 تأخير (مثل علي 29/9)
    const lateDeductions = await prisma.manualDeduction.findMany({
      where: {
        category: 'AUTO_DEDUCTION',
        type: 'LATE',
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    for (const d of lateDeductions) {
      const attIdMatch = d.notes ? d.notes.match(/Attendance ID:\s*([a-zA-Z0-9_-]+)/) : null;
      if (attIdMatch) {
        const att = await prisma.attendance.findUnique({
          where: { id: attIdMatch[1] },
          select: { lateMinutes: true, status: true }
        });
        if (att && ((att.lateMinutes || 0) === 0 || att.status === 'PRESENT')) {
          await prisma.manualDeduction.update({
            where: { id: d.id },
            data: {
              status: 'CANCELLED',
              notes: `${d.notes || ''}\nCancelled by HR-HEALER: attendance corrected to 0 late minutes / PRESENT`
            }
          });
          console.log(`✅ [HR-HEALER] Cancelled stale late deduction ${d.id} (${d.amount} EGP)`);
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ [HR-HEALER] Error running data healing:', err?.message);
  }
}

module.exports = { healHrAttendanceAndDeductions };
