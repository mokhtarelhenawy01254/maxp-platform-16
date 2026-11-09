const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { logEducationEvent } = require('../services/educationAuditService');

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

    let wallet = await prisma.customerWallet.findUnique({ where: { customerId: parentId } });
    if (!wallet) return res.status(400).json({ success: false, message: 'لا توجد محفظة. قم بشحن المحفظة أولاً' });
    if (wallet.balance < pkg.price) {
      return res.status(400).json({ success: false, message: `الرصيد غير كافٍ. السعر: ${pkg.price} ج.م، الرصيد: ${wallet.balance} ج.م` });
    }

    const result = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.educationEnrollment.create({
        data: {
          companyId, studentId, packageId,
          remainingHours: pkg.hoursCount, totalHours: pkg.hoursCount,
          amountPaid: pkg.price, paymentStatus: 'COMPLETED',
          enrollmentDate: new Date()
        },
        include: {
          package: { select: { id: true, name: true, hoursCount: true, price: true } },
          student: { select: { id: true, firstName: true, lastName: true } }
        }
      });

      const updatedWallet = await tx.customerWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: pkg.price }, totalSpent: { increment: pkg.price } }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id, type: 'DEBIT', amount: pkg.price,
          balanceBefore: wallet.balance, balanceAfter: updatedWallet.balance,
          description: `شراء باقة "${pkg.name}" للطالب ${student.firstName} ${student.lastName}`
        }
      });

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
        price: pkg.price,
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
