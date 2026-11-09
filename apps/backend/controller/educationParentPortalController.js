const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { logEducationEvent } = require('../services/educationAuditService');
const { computePackagePrice } = require('../utils/educationPricing');

const getWallet = async (req, res) => {
  try {
    const parentId = req.parent.id;
    const prisma = getSharedPrismaClient();
    let wallet = await prisma.customerWallet.findUnique({ where: { customerId: parentId } });
    if (!wallet) {
      wallet = await prisma.customerWallet.create({
        data: { customerId: parentId, companyId: req.parent.companyId, balance: 0 }
      });
    }
    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, data: { wallet, transactions } });
  } catch (error) {
    console.error('[ParentPortal] Wallet error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب المحفظة' });
  }
};

const topupWallet = async (req, res) => {
  try {
    const parentId = req.parent.id;
    const { amount } = req.body;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return res.status(400).json({ success: false, message: 'المبلغ غير صحيح' });
    if (numAmount > 50000) return res.status(400).json({ success: false, message: 'الحد الأقصى لطلب الشحن لمرة واحدة هو 50,000 ج.م' });

    const prisma = getSharedPrismaClient();
    let wallet = await prisma.customerWallet.findUnique({ where: { customerId: parentId } });
    if (!wallet) {
      wallet = await prisma.customerWallet.create({
        data: { customerId: parentId, companyId: req.parent.companyId, balance: 0 }
      });
    }

    // حماية مالية وأمنية: تسجيل طلب الشحن كمعاملة معلقة للمراجعة والتحصيل (PENDING_RELEASE)
    // منع الزيادة الآلية الحرة للرصيد بدون دفع إلكتروني أو اعتماد إداري
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        amount: numAmount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance,
        status: 'PENDING_RELEASE',
        description: `طلب شحن محفظة بقيمة ${numAmount} ج.م (بانتظار التأكيد والتحصيل)`
      }
    });

    res.json({
      success: true,
      pending: true,
      message: `تم تسجيل طلب شحن بقيمة ${numAmount} ج.م بنجاح. سيتم تفعيل الرصيد في محفظتك فور مراجعة وتأكيد التحويل من إدارة المركز.`
    });
  } catch (error) {
    console.error('[ParentPortal] Topup error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في طلب شحن المحفظة' });
  }
};

const getSubjects = async (req, res) => {
  try {
    const companyId = req.parent.companyId;
    const data = await getSharedPrismaClient().educationSubject.findMany({
      where: { companyId, isActive: true },
      include: {
        packages: { where: { isActive: true }, orderBy: { price: 'asc' } }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[ParentPortal] Subjects error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في جلب المواد' });
  }
};

const purchasePackage = async (req, res) => {
  try {
    const parentId = req.parent.id;
    const companyId = req.parent.companyId;
    const { studentId, packageId } = req.body;
    if (!studentId || !packageId) {
      return res.status(400).json({ success: false, message: 'الطالب والباقة مطلوبان' });
    }

    const prisma = getSharedPrismaClient();

    const student = await prisma.educationStudent.findFirst({
      where: { id: studentId, customerId: parentId, companyId }
    });
    if (!student) return res.status(404).json({ success: false, message: 'الطالب غير موجود' });

    const pkg = await prisma.educationPackage.findFirst({
      where: { id: packageId, companyId, isActive: true }
    });
    if (!pkg) return res.status(404).json({ success: false, message: 'الباقة غير موجودة' });

    // 🎓 خصم الأخوات 10%: نفس ولي الأمر وعنده أكتر من طالب مسجل
    const siblingCount = await prisma.educationStudent.count({
      where: { companyId, customerId: parentId, isActive: true }
    });
    const pricing = computePackagePrice({ basePrice: pkg.price, siblingCount });
    const payable = pricing.finalPrice;

    let wallet = await prisma.customerWallet.findUnique({ where: { customerId: parentId } });
    if (!wallet) return res.status(400).json({ success: false, message: 'لا توجد محفظة. قم بشحن المحفظة أولاً' });
    if (wallet.balance < payable) {
      return res.status(400).json({ success: false, message: `الرصيد غير كافٍ. السعر: ${payable} ج.م، الرصيد: ${wallet.balance} ج.م` });
    }

    const result = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.educationEnrollment.create({
        data: {
          companyId, studentId, packageId,
          remainingHours: pkg.hoursCount, totalHours: pkg.hoursCount,
          amountPaid: payable, paymentStatus: 'COMPLETED',
          enrollmentDate: new Date()
        },
        include: {
          package: { select: { id: true, name: true, hoursCount: true, price: true, levelNumber: true } },
          student: { select: { id: true, firstName: true, lastName: true, currentLevel: true } }
        }
      });

      const updatedWallet = await tx.customerWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: payable }, totalSpent: { increment: payable } }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id, type: 'DEBIT', amount: payable,
          balanceBefore: wallet.balance, balanceAfter: updatedWallet.balance,
          description: `شراء باقة "${pkg.name}" للطالب ${student.firstName} ${student.lastName}${pricing.reason ? ` (${pricing.reason} — وفر ${pricing.discountAmount} ج.م)` : ''}`
        }
      });

      // ترقية مستوى الطالب ليطابق المستوى المشترى
      if (pkg.levelNumber && (!student.currentLevel || pkg.levelNumber > student.currentLevel)) {
        await tx.educationStudent.update({
          where: { id: student.id },
          data: { currentLevel: pkg.levelNumber }
        });
      }

      return enrollment;
    });

    const studentFullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
    logEducationEvent({
      companyId,
      action: 'PARENT_ENROLL',
      entityType: 'ENROLLMENT',
      entityId: result.id,
      entityName: `${studentFullName} - ${pkg.name}`,
      description: `قام ولي الأمر بشراء باقة "${pkg.name}" للطالب ${studentFullName} بمبلغ ${pkg.price} ج.م من رصيد المحفظة`,
      actorType: 'PARENT',
      userName: `ولي أمر الطالب ${studentFullName}`,
      userRole: 'PARENT',
      details: {
        studentId,
        packageId,
        price: payable,
        basePrice: pricing.basePrice,
        discountAmount: pricing.discountAmount,
        discountReason: pricing.reason,
        hours: pkg.hoursCount,
      },
      severity: 'MEDIUM',
      req,
    }).catch(e => console.error('[ParentPurchaseAudit]', e.message));

    res.json({ success: true, data: result, message: `تم شراء الباقة "${pkg.name}" بنجاح` });
  } catch (error) {
    console.error('[ParentPortal] Purchase error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في شراء الباقة' });
  }
};

module.exports = { getWallet, topupWallet, getSubjects, purchasePackage };
