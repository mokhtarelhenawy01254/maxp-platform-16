const { getSharedPrismaClient } = require('../sharedDatabase');

async function healHrAttendanceAndDeductions() {
  const prisma = getSharedPrismaClient();
  const summary = {
    clampedWorkHoursCount: 0,
    doublePunchHealedCount: 0,
    earlyLeaveDeductionsCancelledCount: 0,
    earlyLeaveDeductionsCancelledAmount: 0,
    staleLateDeductionsCancelledCount: 0,
    staleLateDeductionsCancelledAmount: 0,
    workHoursRecalculatedCount: 0,
    errors: []
  };

  console.log('🩺 [HR-HEALER] Starting HR attendance and deduction reconciliation...');

  // 1. تصفير الساعات السالبة
  try {
    const clampedResult = await prisma.attendance.updateMany({
      where: { workHours: { lt: 0 } },
      data: { workHours: 0 }
    });
    summary.clampedWorkHoursCount = clampedResult.count;
    if (clampedResult.count > 0) {
      console.log(`✅ [HR-HEALER] Clamped ${clampedResult.count} negative workHours attendance records to 0`);
    }
  } catch (err) {
    console.error('❌ [HR-HEALER] Error clamping negative workHours:', err?.code, err?.message);
    summary.errors.push(`clampWorkHours: ${err?.message}`);
  }

  // 2. إصلاح صفوف البصمة المزدوجة (< 5 دقائق):
  // تصفير earlyLeaveMinutes + ضبط workHours إلى 8.0h وتعديل checkOut ليوم العمل الطبيعي
  try {
    const doublePunchAttendances = await prisma.attendance.findMany({
      where: {
        checkIn: { not: null },
        checkOut: { not: null }
      },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        date: true,
        earlyLeaveMinutes: true,
        workHours: true,
        userId: true,
        status: true
      }
    });

    for (const att of doublePunchAttendances) {
      try {
        const checkInMs = new Date(att.checkIn).getTime();
        const checkOutMs = new Date(att.checkOut).getTime();
        if (isNaN(checkInMs) || isNaN(checkOutMs)) continue;

        const diffMs = Math.abs(checkOutMs - checkInMs);
        if (diffMs < 5 * 60 * 1000) {
          // بصمة مزدوجة سريعة
          const d = new Date(att.date || att.checkIn);
          const y = d.getUTCFullYear();
          const m = d.getUTCMonth();
          const day = d.getUTCDate();
          const targetCheckOut = new Date(Date.UTC(y, m, day, 16, 0, 0, 0)); // 18:00 Cairo time

          // إذا كان السجل لم يُعالج بعد أو earlyLeaveMinutes > 0
          if ((att.earlyLeaveMinutes || 0) > 0 || (att.workHours || 0) < 8.0) {
            await prisma.attendance.update({
              where: { id: att.id },
              data: {
                checkOut: targetCheckOut,
                workHours: 8.0,
                earlyLeaveMinutes: 0
              }
            });
            summary.doublePunchHealedCount++;
            console.log(`✅ [HR-HEALER] Healed double-punch attendance ${att.id} (date: ${d.toISOString().slice(0, 10)}, checkout: 18:00, 8.0h, 0 earlyLeave)`);
          }
        }
      } catch (rowErr) {
        console.error(`❌ [HR-HEALER] Error healing attendance row ${att.id}:`, rowErr?.code, rowErr?.message);
        summary.errors.push(`attendance-${att.id}: ${rowErr?.message}`);
      }
    }
  } catch (err) {
    console.error('❌ [HR-HEALER] Error querying doublePunchAttendances:', err?.code, err?.message);
    summary.errors.push(`queryDoublePunch: ${err?.message}`);
  }

  // 3. إلغاء خصومات الانصراف المبكر التلقائية الناتجة عن البصمات المزدوجة (< 5 دقائق)
  // ملحوظة: حالة الخصم تلغى حصراً عبر REJECTED لأن Enum الداتابيز hr_manual_deductions_status يقبل (PENDING, APPROVED, REJECTED)
  try {
    const earlyDeductions = await prisma.manualDeduction.findMany({
      where: {
        category: 'AUTO_DEDUCTION',
        type: 'EARLY_LEAVE',
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    for (const d of earlyDeductions) {
      try {
        let shouldCancel = false;
        let cancelReason = '';

        const attIdMatch = d.notes ? d.notes.match(/Attendance ID:\s*([a-zA-Z0-9_-]+)/) : null;
        if (attIdMatch) {
          const att = await prisma.attendance.findUnique({
            where: { id: attIdMatch[1] },
            select: { checkIn: true, checkOut: true, earlyLeaveMinutes: true, workHours: true }
          });
          if (att) {
            const diffMs = (att.checkIn && att.checkOut)
              ? Math.abs(new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime())
              : 0;
            if (diffMs < 5 * 60 * 1000 || (att.earlyLeaveMinutes || 0) === 0 || (att.workHours || 0) >= 8.0) {
              shouldCancel = true;
              cancelReason = 'double punch bounce / healed full attendance';
            }
          }
        } else if (Number(d.amount) > 130 && Number(d.amount) < 140) {
          shouldCancel = true;
          cancelReason = 'Habiba 16/9 double punch bounce deduction fallback';
        }

        if (shouldCancel) {
          await prisma.manualDeduction.update({
            where: { id: d.id },
            data: {
              status: 'REJECTED',
              rejectedBy: 'HR_HEALER',
              rejectedAt: new Date(),
              rejectionReason: `Auto-cancelled by HR-HEALER: ${cancelReason}`,
              notes: `${d.notes || ''}\n[HR-HEALER] Cancelled: ${cancelReason}`
            }
          });
          summary.earlyLeaveDeductionsCancelledCount++;
          summary.earlyLeaveDeductionsCancelledAmount += Number(d.amount);
          console.log(`✅ [HR-HEALER] Cancelled bogus early checkout deduction ${d.id} (${d.amount} EGP)`);
        }
      } catch (rowErr) {
        console.error(`❌ [HR-HEALER] Error cancelling early deduction ${d.id}:`, rowErr?.code, rowErr?.message);
        summary.errors.push(`earlyDeduction-${d.id}: ${rowErr?.message}`);
      }
    }
  } catch (err) {
    console.error('❌ [HR-HEALER] Error querying earlyDeductions:', err?.code, err?.message);
    summary.errors.push(`queryEarlyDeductions: ${err?.message}`);
  }

  // 4. إلغاء الخصومات التلقائية المعلقة للتأخيرات التي تم تصحيح سجل حضورها لـ 0 تأخير أو حاضر
  // تشمل علي وزيري (سجل 29/9 بقيمة 42.90 ج، وسجل 30/9 بقيمة 113.06 ج) وجميع الموظفين
  try {
    const lateDeductions = await prisma.manualDeduction.findMany({
      where: {
        category: 'AUTO_DEDUCTION',
        type: 'LATE',
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    for (const d of lateDeductions) {
      try {
        let shouldCancel = false;
        let cancelReason = '';

        const attIdMatch = d.notes ? d.notes.match(/Attendance ID:\s*([a-zA-Z0-9_-]+)/) : null;
        if (attIdMatch) {
          const att = await prisma.attendance.findUnique({
            where: { id: attIdMatch[1] },
            select: { id: true, lateMinutes: true, status: true }
          });
          if (att) {
            if ((att.lateMinutes || 0) === 0 || att.status === 'PRESENT') {
              shouldCancel = true;
              cancelReason = `attendance ${att.id} corrected to 0 late minutes / PRESENT`;
            }
          } else {
            // سجل الحضور تم حذفه أو غير موجود
            shouldCancel = true;
            cancelReason = `linked attendance ${attIdMatch[1]} was deleted or voided`;
          }
        }

        if (shouldCancel) {
          await prisma.manualDeduction.update({
            where: { id: d.id },
            data: {
              status: 'REJECTED',
              rejectedBy: 'HR_HEALER',
              rejectedAt: new Date(),
              rejectionReason: `Auto-cancelled by HR-HEALER: ${cancelReason}`,
              notes: `${d.notes || ''}\n[HR-HEALER] Cancelled: ${cancelReason}`
            }
          });
          summary.staleLateDeductionsCancelledCount++;
          summary.staleLateDeductionsCancelledAmount += Number(d.amount);
          console.log(`✅ [HR-HEALER] Cancelled stale late deduction ${d.id} (${d.amount} EGP) - Reason: ${cancelReason}`);
        }
      } catch (rowErr) {
        console.error(`❌ [HR-HEALER] Error cancelling late deduction ${d.id}:`, rowErr?.code, rowErr?.message);
        summary.errors.push(`lateDeduction-${d.id}: ${rowErr?.message}`);
      }
    }
  } catch (err) {
    console.error('❌ [HR-HEALER] Error querying lateDeductions:', err?.code, err?.message);
    summary.errors.push(`queryLateDeductions: ${err?.message}`);
  }

  // 5. إعادة احتساب workHours لجميع سجلات الحضور التي بها checkIn و checkOut
  // لعلاج خطأ خصم ساعة الراحة الوهمية القديمة (0 || 60)
  try {
    const attendanceWithPunches = await prisma.attendance.findMany({
      where: {
        checkIn: { not: null },
        checkOut: { not: null }
      },
      select: { id: true, checkIn: true, checkOut: true, workHours: true }
    });

    for (const record of attendanceWithPunches) {
      try {
        const startMs = new Date(record.checkIn).getTime();
        const endMs = new Date(record.checkOut).getTime();
        if (!isNaN(startMs) && !isNaN(endMs)) {
          const presenceMinutes = Math.max(0, (endMs - startMs) / 60000);
          if (presenceMinutes >= 5) {
            const actualGrossHours = Math.round((presenceMinutes / 60) * 100) / 100;
            if (record.workHours === null || record.workHours === undefined || Number(record.workHours) < actualGrossHours - 0.5) {
              await prisma.attendance.update({
                where: { id: record.id },
                data: { workHours: actualGrossHours }
              });
              summary.workHoursRecalculatedCount++;
            }
          }
        }
      } catch (rowErr) {
        console.error(`❌ [HR-HEALER] Error recalculating workHours for record ${record.id}:`, rowErr?.code, rowErr?.message);
        summary.errors.push(`workHours-${record.id}: ${rowErr?.message}`);
      }
    }
  } catch (err) {
    console.error('❌ [HR-HEALER] Error querying attendanceWithPunches:', err?.code, err?.message);
    summary.errors.push(`queryWorkHours: ${err?.message}`);
  }

  // 6. إلغاء جميع الخصومات التلقائية المعلّقة (AUTO_DEDUCTION) لتفادي أي خصم مزدوج
  try {
    const pendingAutoDeds = await prisma.manualDeduction.findMany({
      where: {
        category: 'AUTO_DEDUCTION',
        status: 'PENDING'
      }
    });

    for (const d of pendingAutoDeds) {
      try {
        await prisma.manualDeduction.update({
          where: { id: d.id },
          data: {
            status: 'REJECTED',
            rejectedBy: 'HR_HEALER',
            rejectedAt: new Date(),
            rejectionReason: 'Auto-cancelled by HR-HEALER to prevent double deduction with lateness engine',
            notes: `${d.notes || ''}\n[HR-HEALER] Cancelled: duplicate prevention`
          }
        });
        summary.staleLateDeductionsCancelledCount++;
        summary.staleLateDeductionsCancelledAmount += Number(d.amount);
      } catch (err) {
        console.error(`❌ [HR-HEALER] Error cancelling pending auto deduction ${d.id}:`, err?.code, err?.message);
        summary.errors.push(`cancelPendingAuto-${d.id}: ${err?.message}`);
      }
    }
    if (pendingAutoDeds.length > 0) {
      console.log(`✅ [HR-HEALER] Cancelled ${pendingAutoDeds.length} pending AUTO_DEDUCTION rows`);
    }
  } catch (err) {
    console.error('❌ [HR-HEALER] Error cancelling pending auto deductions:', err?.code, err?.message);
    summary.errors.push(`queryPendingAutoDeds: ${err?.message}`);
  }

  // 7. التأكد من وجود أعمدة hr_settings وتحديث إعدادات شركة H2M المستهدفة
  try {
    const h2mCompanyId = 'cmldvhqkx0000juj6sdbx2jw0';
    if (typeof prisma.$executeRawUnsafe === 'function') {
      await prisma.$executeRawUnsafe(`ALTER TABLE "hr_settings" ADD COLUMN IF NOT EXISTS "absencePenaltyRate" DECIMAL(5,2) DEFAULT 1.0`).catch(() => {});
      await prisma.$executeRawUnsafe(`ALTER TABLE "hr_settings" ADD COLUMN IF NOT EXISTS "paidPermissionMinutesPerMonth" INTEGER DEFAULT 0`).catch(() => {});
      await prisma.$executeRawUnsafe(`ALTER TABLE "hr_settings" ADD COLUMN IF NOT EXISTS "permissionLeadDays" INTEGER DEFAULT 2`).catch(() => {});
      await prisma.$executeRawUnsafe(`ALTER TABLE "hr_settings" ADD COLUMN IF NOT EXISTS "permissionWarningAfter" INTEGER DEFAULT 4`).catch(() => {});
      await prisma.$executeRawUnsafe(`ALTER TABLE "hr_settings" ADD COLUMN IF NOT EXISTS "permissionExtraMode" VARCHAR(30) DEFAULT 'deduct'`).catch(() => {});
    }

    const h2mExists = await prisma.company.findUnique({
      where: { id: h2mCompanyId },
      select: { id: true }
    });

    if (h2mExists) {
      const h2mSettings = await prisma.hRSettings.findUnique({
        where: { companyId: h2mCompanyId }
      });
      if (h2mSettings) {
        await prisma.hRSettings.update({
          where: { companyId: h2mCompanyId },
          data: {
            absencePenaltyRate: 2.0,
            paidPermissionMinutesPerMonth: 120,
            permissionLeadDays: 2,
            permissionWarningAfter: 4,
            permissionExtraMode: 'deduct'
          }
        });
        console.log(`✅ [HR-HEALER] Reconciled H2M settings: absencePenaltyRate=2.0, paidPermissionMinutesPerMonth=120`);
      }
    }
  } catch (err) {
    console.error('❌ [HR-HEALER] Error reconciling H2M settings:', err?.code, err?.message);
    summary.errors.push(`h2mSettings: ${err?.message}`);
  }

  // 8. تسوية سلف شركة H2M لشهر سبتمبر 2026 (تصحيح تاريخ سلفة علي 1515، وإعادة فتح سلفة شروق 1500 وعلي 1000)
  try {
    const h2mCompanyId = 'cmldvhqkx0000juj6sdbx2jw0';
    // أ) سلفة علي 1515 جم: تصحيح التاريخ لشهر سبتمبر 2026
    const aliAdvance1515 = await prisma.advanceRequest.findFirst({
      where: {
        id: 'cmupk8ps20098juxge34voswz',
        companyId: h2mCompanyId
      }
    });
    if (aliAdvance1515) {
      await prisma.advanceRequest.update({
        where: { id: aliAdvance1515.id },
        data: {
          createdAt: new Date('2026-09-25T10:00:00.000Z'),
          status: 'APPROVED',
          isPaidOff: false,
          remainingBalance: Number(aliAdvance1515.amount)
        }
      });
      console.log(`✅ [HR-HEALER] Reconciled Ali advance cmupk8ps20098juxge34voswz to September 25, 2026`);
    }

    // ب) سلفة شروق 1,500 وسلفة علي 1,000 المغلقتين قبل كشف الرواتب
    const prematureAdvances = await prisma.advanceRequest.findMany({
      where: {
        companyId: h2mCompanyId,
        status: 'COMPLETED',
        isPaidOff: true,
        createdAt: {
          gte: new Date('2026-09-01T00:00:00.000Z'),
          lte: new Date('2026-09-30T23:59:59.999Z')
        }
      }
    });

    for (const adv of prematureAdvances) {
      try {
        await prisma.advanceRequest.update({
          where: { id: adv.id },
          data: {
            status: 'APPROVED',
            isPaidOff: false,
            remainingBalance: Number(adv.amount)
          }
        });
        console.log(`✅ [HR-HEALER] Reopened prematurely completed advance ${adv.id} (${adv.amount} EGP) for September payroll deduction`);
      } catch (rowErr) {
        console.error(`❌ [HR-HEALER] Error reopening advance ${adv.id}:`, rowErr?.code, rowErr?.message);
        summary.errors.push(`reopenAdvance-${adv.id}: ${rowErr?.message}`);
      }
    }
  } catch (err) {
    console.error('❌ [HR-HEALER] Error reconciling H2M advances:', err?.code, err?.message);
    summary.errors.push(`h2mAdvances: ${err?.message}`);
  }

  console.log('🩺 [HR-HEALER] Reconciliation complete:', {
    clampedWorkHoursCount: summary.clampedWorkHoursCount,
    doublePunchHealedCount: summary.doublePunchHealedCount,
    earlyLeaveDeductionsCancelled: `${summary.earlyLeaveDeductionsCancelledCount} (${summary.earlyLeaveDeductionsCancelledAmount.toFixed(2)} EGP)`,
    staleLateDeductionsCancelled: `${summary.staleLateDeductionsCancelledCount} (${summary.staleLateDeductionsCancelledAmount.toFixed(2)} EGP)`,
    workHoursRecalculatedCount: summary.workHoursRecalculatedCount,
    errorsCount: summary.errors.length
  });

  return summary;
}

module.exports = { healHrAttendanceAndDeductions };
