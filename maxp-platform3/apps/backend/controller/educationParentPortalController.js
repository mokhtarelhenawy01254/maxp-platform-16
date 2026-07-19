const { getSharedPrismaClient } = require('../services/sharedDatabase');

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
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'المبلغ غير صحيح' });

    const prisma = getSharedPrismaClient();
    let wallet = await prisma.customerWallet.findUnique({ where: { customerId: parentId } });
    if (!wallet) {
      wallet = await prisma.customerWallet.create({
        data: { customerId: parentId, companyId: req.parent.companyId, balance: 0 }
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.customerWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount }, totalEarned: { increment: amount } }
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id, type: 'CREDIT', amount,
          balanceBefore: wallet.balance, balanceAfter: updated.balance,
          description: `شحن المحفظة بمبلغ ${amount} ج.م`
        }
      });
      return updated;
    });

    res.json({ success: true, data: result, message: `تم شحن المحفظة بمبلغ ${amount} ج.م` });
  } catch (error) {
    console.error('[ParentPortal] Topup error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في شحن المحفظة' });
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

    res.json({ success: true, data: result, message: `تم شراء الباقة "${pkg.name}" بنجاح` });
  } catch (error) {
    console.error('[ParentPortal] Purchase error:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في شراء الباقة' });
  }
};

module.exports = { getWallet, topupWallet, getSubjects, purchasePackage };
