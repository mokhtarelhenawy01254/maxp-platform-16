const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const { recordSupplierPayment, generatePaymentNumber } = require('../services/supplierPaymentService');
const { logProcurementActivity } = require('../services/procurementAuditService');

exports.createSupplierPayment = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const {
      supplierId,
      purchaseInvoiceId,
      paymentDate,
      amount,
      paymentMethod,
      referenceNumber,
      bankName,
      checkNumber,
      checkDate,
      notes,
      treasuryAccountId,
      sourceKey,
    } = req.body;

    const result = await recordSupplierPayment({
      companyId,
      supplierId,
      purchaseInvoiceId,
      paymentDate,
      amount,
      paymentMethod,
      referenceNumber,
      bankName,
      checkNumber,
      checkDate,
      notes,
      treasuryAccountId,
      userId,
      sourceKey,
    });

    res.status(result.alreadyExisted ? 200 : 201).json({
      success: true,
      message: result.alreadyExisted ? 'تم استرجاع الدفعة المسجلة مسبقاً' : 'تم تسجيل الدفعة بنجاح',
      payment: result.payment,
      financialPosting: result.financialPosting,
      alreadyExisted: result.alreadyExisted,
    });
  } catch (error) {
    console.error('Error creating supplier payment:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء تسجيل الدفعة',
      error: error.message,
    });
  }
};

exports.getAllSupplierPayments = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 20, supplierId, paymentMethod, search } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { companyId };

    if (supplierId) where.supplierId = supplierId;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (search) {
      where.OR = [
        { paymentNumber: { contains: search } },
        { referenceNumber: { contains: search } },
        { notes: { contains: search } }
      ];
    }

    const [payments, total] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().supplierPayment.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: { id: true, name: true, phone: true }
          },
          purchaseInvoice: {
            select: { id: true, invoiceNumber: true }
          }
        }
      })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.count({ where }))
    ]);

    res.json({
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching supplier payments:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب المدفوعات' });
  }
};

exports.getSupplierPaymentById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const payment = await safeQuery(() => getSharedPrismaClient().supplierPayment.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        purchaseInvoice: {
          include: {
            purchaseInvoiceItems: true
          }
        }
      }
    }));

    if (!payment) {
      return res.status(404).json({ message: 'الدفعة غير موجودة' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching supplier payment:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الدفعة' });
  }
};

exports.updateSupplierPayment = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id = req.params.id } = req.params;
    const {
      paymentDate,
      paymentMethod,
      referenceNumber,
      bankName,
      checkNumber,
      checkDate,
      notes
    } = req.body;

    const existingPayment = await safeQuery(() => getSharedPrismaClient().supplierPayment.findFirst({
      where: { id, companyId }
    }));

    if (!existingPayment) {
      return res.status(404).json({ message: 'الدفعة غير موجودة' });
    }

    const payment = await safeQuery(() => getSharedPrismaClient().supplierPayment.update({
      where: { id },
      data: {
        paymentDate: paymentDate ? new Date(paymentDate) : undefined,
        paymentMethod,
        referenceNumber,
        bankName,
        checkNumber,
        checkDate: checkDate ? new Date(checkDate) : undefined,
        notes
      },
      include: {
        supplier: true,
        purchaseInvoice: true
      }
    }));

    await logProcurementActivity({
      companyId,
      userId: req.user.id,
      action: 'UPDATE_SUPPLIER_PAYMENT',
      targetType: 'SUPPLIER_PAYMENT',
      targetId: payment.id,
      targetName: payment.paymentNumber,
      description: `تعديل بيانات دفعة المورد ${payment.paymentNumber}`,
      metadata: { paymentMethod, referenceNumber },
      severity: 'LOW',
    });

    res.json({
      message: 'تم تحديث الدفعة بنجاح',
      payment
    });
  } catch (error) {
    console.error('Error updating supplier payment:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء تحديث الدفعة' });
  }
};

exports.deleteSupplierPayment = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const payment = await safeQuery(() => getSharedPrismaClient().supplierPayment.findFirst({
      where: { id, companyId }
    }));

    if (!payment) {
      return res.status(404).json({ message: 'الدفعة غير موجودة' });
    }

    await safeQuery(() =>
      getSharedPrismaClient().supplier.update({
        where: { id: payment.supplierId },
        data: {
          currentBalance: {
            increment: parseFloat(payment.amount)
          }
        }
      })
    );

    if (payment.purchaseInvoiceId) {
      const invoice = await safeQuery(() => getSharedPrismaClient().purchaseInvoice.findUnique({
        where: { id: payment.purchaseInvoiceId }
      }));

      const newPaidAmount = parseFloat(invoice.paidAmount) - parseFloat(payment.amount);
      const newRemainingAmount = parseFloat(invoice.totalAmount) - newPaidAmount;

      const newStatus = newRemainingAmount <= 0 ? 'PAID' : 'PENDING';

      await safeQuery(() =>
        getSharedPrismaClient().purchaseInvoice.update({
          where: { id: payment.purchaseInvoiceId },
          data: {
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus
          }
        })
      );
    }

    await safeQuery(() => getSharedPrismaClient().supplierPayment.delete({
      where: { id }
    }));

    await logProcurementActivity({
      companyId,
      userId: req.user.id,
      action: 'DELETE_SUPPLIER_PAYMENT',
      targetType: 'SUPPLIER_PAYMENT',
      targetId: payment.id,
      targetName: payment.paymentNumber,
      description: `حذف دفعة مورد بقيمة ${payment.amount} ج.م (رقم: ${payment.paymentNumber})`,
      metadata: { amount: payment.amount, supplierId: payment.supplierId },
      severity: 'HIGH',
    });

    res.json({ message: 'تم حذف الدفعة بنجاح' });
  } catch (error) {
    console.error('Error deleting supplier payment:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الدفعة' });
  }
};

exports.getSupplierPaymentStats = async (req, res) => {
  try {
    const { companyId } = req.user;

    const [totalPayments, totalAmount, cashPayments, bankTransfers, checks] = await Promise.all([
      safeQuery(() => getSharedPrismaClient().supplierPayment.count({ where: { companyId } })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.aggregate({
        where: { companyId },
        _sum: { amount: true }
      })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.count({ where: { companyId, paymentMethod: 'CASH' } })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.count({ where: { companyId, paymentMethod: 'BANK_TRANSFER' } })),
      safeQuery(() => getSharedPrismaClient().supplierPayment.count({ where: { companyId, paymentMethod: 'CHECK' } }))
    ]);

    res.json({
      totalPayments,
      totalAmount: totalAmount._sum.amount || 0,
      cashPayments,
      bankTransfers,
      checks
    });
  } catch (error) {
    console.error('Error fetching supplier payment stats:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
};
