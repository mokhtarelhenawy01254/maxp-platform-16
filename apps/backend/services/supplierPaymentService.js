const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { logProcurementActivity } = require('./procurementAuditService');

/**
 * Generate sequential payment number SP-XXXXXX for tenant.
 */
const generatePaymentNumber = async (companyId, prismaClient = null) => {
  const prisma = prismaClient || getSharedPrismaClient();
  const lastPayment = await safeQuery(() =>
    prisma.supplierPayment.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    })
  );

  const lastNumber = lastPayment
    ? parseInt(lastPayment.paymentNumber.split('-').pop(), 10) || 0
    : 0;
  return `SP-${String(lastNumber + 1).padStart(6, '0')}`;
};

/**
 * Core unified service for recording a supplier payment.
 * Used by both standalone supplier payment flow and inline invoice checkout payments.
 * Ensures strict idempotency, balance decrementing, invoice state synchronization,
 * financial treasury posting (OUT), and accounting auto-posting.
 *
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.supplierId
 * @param {number|string} params.amount
 * @param {string} [params.paymentMethod='CASH']
 * @param {string} [params.purchaseInvoiceId]
 * @param {string} [params.treasuryAccountId]
 * @param {string} [params.notes]
 * @param {string} [params.userId]
 * @param {Date|string} [params.paymentDate]
 * @param {string} [params.referenceNumber]
 * @param {string} [params.bankName]
 * @param {string} [params.checkNumber]
 * @param {Date|string} [params.checkDate]
 * @param {string} [params.sourceKey] - Explicit idempotency key (e.g. invoice:<id>:inline)
 * @returns {Promise<{ payment: Object, financialPosting: Object|null, alreadyExisted: boolean }>}
 */
async function recordSupplierPayment({
  companyId,
  supplierId,
  amount,
  paymentMethod = 'CASH',
  purchaseInvoiceId = null,
  treasuryAccountId = null,
  notes = '',
  userId = null,
  paymentDate = null,
  referenceNumber = null,
  bankName = null,
  checkNumber = null,
  checkDate = null,
  sourceKey = null,
}) {
  if (!companyId || !supplierId || !amount || !paymentMethod) {
    const err = new Error('المورد والمبلغ وطريقة الدفع مطلوبة');
    err.statusCode = 400;
    throw err;
  }

  const paymentAmount = parseFloat(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    const err = new Error('المبلغ المدفوع يجب أن يكون رقماً أكبر من الصفر');
    err.statusCode = 400;
    throw err;
  }

  const prisma = getSharedPrismaClient();

  // 1. Idempotency Check (A: explicit sourceKey / reference)
  const effectiveRef = referenceNumber || sourceKey || null;
  if (sourceKey) {
    const existingBySourceKey = await safeQuery(() =>
      prisma.supplierPayment.findFirst({
        where: {
          companyId,
          supplierId,
          ...(purchaseInvoiceId ? { purchaseInvoiceId } : {}),
          OR: [
            { referenceNumber: sourceKey },
            { notes: { contains: sourceKey } },
          ],
        },
        include: { supplier: true, purchaseInvoice: true },
      })
    );
    if (existingBySourceKey) {
      return {
        payment: existingBySourceKey,
        financialPosting: null,
        alreadyExisted: true,
      };
    }
  }

  // 1. Idempotency Check (B: rapid double-click guard within 4 seconds)
  if (userId) {
    const recentDuplicate = await safeQuery(() =>
      prisma.supplierPayment.findFirst({
        where: {
          companyId,
          supplierId,
          amount: paymentAmount,
          createdBy: userId,
          ...(purchaseInvoiceId ? { purchaseInvoiceId } : {}),
          createdAt: { gte: new Date(Date.now() - 4000) },
        },
        include: { supplier: true, purchaseInvoice: true },
      })
    );
    if (recentDuplicate) {
      return {
        payment: recentDuplicate,
        financialPosting: null,
        alreadyExisted: true,
      };
    }
  }

  // 2. Validate Invoice if linked
  let invoice = null;
  if (purchaseInvoiceId) {
    invoice = await safeQuery(() =>
      prisma.purchaseInvoice.findFirst({
        where: { id: purchaseInvoiceId, companyId },
      })
    );

    if (!invoice) {
      const err = new Error('فاتورة الشراء غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    const remaining = parseFloat(invoice.remainingAmount);
    if (paymentAmount > remaining + 0.001) {
      const err = new Error(
        `المبلغ المدفوع (${paymentAmount}) أكبر من المبلغ المتبقي على الفاتورة (${remaining})`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // 3. Create payment record with P2002 collision retry (up to 5 attempts)
  let payment = null;
  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const paymentNumber = await generatePaymentNumber(companyId, prisma);

      payment = await safeQuery(() =>
        prisma.supplierPayment.create({
          data: {
            companyId,
            supplierId,
            purchaseInvoiceId: purchaseInvoiceId || null,
            paymentNumber,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            amount: paymentAmount,
            paymentMethod,
            referenceNumber: effectiveRef,
            bankName,
            checkNumber,
            checkDate: checkDate ? new Date(checkDate) : null,
            notes: notes || (sourceKey ? `سداد مرتبط (${sourceKey})` : null),
            createdBy: userId || 'system',
          },
          include: {
            supplier: true,
            purchaseInvoice: true,
          },
        })
      );
      break;
    } catch (err) {
      if (err.code === 'P2002' || (err.message && err.message.includes('paymentNumber'))) {
        lastError = err;
        // Jitter backoff
        await new Promise((r) => setTimeout(r, 20 + Math.random() * 40));
        continue;
      }
      throw err;
    }
  }

  if (!payment) {
    throw lastError || new Error('فشل تسجيل الدفعة بعد عدة محاولات بسبب تعارض الترقيم');
  }

  // 4. Decrement Supplier Balance (Supplier debt decreases when paid)
  await safeQuery(() =>
    prisma.supplier.update({
      where: { id: supplierId },
      data: {
        currentBalance: {
          decrement: paymentAmount,
        },
      },
    })
  );

  // 5. Update Purchase Invoice state if payment was linked to an invoice
  if (purchaseInvoiceId) {
    const freshInvoice = await safeQuery(() =>
      prisma.purchaseInvoice.findUnique({
        where: { id: purchaseInvoiceId },
      })
    );

    if (freshInvoice) {
      const newPaidAmount = Math.round((parseFloat(freshInvoice.paidAmount) + paymentAmount) * 100) / 100;
      const totalAmount = parseFloat(freshInvoice.totalAmount);
      const newRemainingAmount = Math.max(0, Math.round((totalAmount - newPaidAmount) * 100) / 100);

      const newStatus = newRemainingAmount <= 0 ? 'PAID' : 'PENDING';

      await safeQuery(() =>
        prisma.purchaseInvoice.update({
          where: { id: purchaseInvoiceId },
          data: {
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus,
          },
        })
      );
    }
  }

  // 6. Financial Posting OUT to Treasury (Idempotent)
  let financialPosting = null;
  try {
    const { createOrGetFinancialPosting, SOURCE_TYPES } = require('./financialPostingService');
    const finResult = await createOrGetFinancialPosting({
      companyId,
      sourceType: SOURCE_TYPES.SUPPLIER_PAYMENT,
      sourceId: payment.id,
      treasuryAccountId: treasuryAccountId || null,
      direction: 'OUT',
      amount: paymentAmount,
      reference: `سداد مورد ${payment.supplier?.name || ''} - ${payment.paymentNumber}`,
      notes: notes || `سداد دفعة للمورد ${payment.supplier?.name || ''}`,
      metadata: {
        supplierId,
        supplierName: payment.supplier?.name,
        paymentNumber: payment.paymentNumber,
        purchaseInvoiceId: purchaseInvoiceId || null,
        sourceKey: sourceKey || null,
      },
      userId,
    });
    financialPosting = finResult?.posting || null;
  } catch (finErr) {
    console.warn('[SupplierPaymentService] Financial posting warning:', finErr.message);
  }

  // 7. Accounting Auto-Posting Hook (Non-blocking & Zero Blast-Radius)
  try {
    const AccountingAutoPostingService = require('./accountingAutoPostingService');
    AccountingAutoPostingService.postSupplierPayment(companyId, payment.id, {
      userId,
      paymentData: payment,
    }).catch((err) =>
      console.error('[SupplierPaymentService] Accounting auto-posting async error:', err.message)
    );
  } catch (autoErr) {
    console.error('[SupplierPaymentService] Accounting auto-posting hook error:', autoErr.message);
  }

  // 8. Log Activity in Audit Trail
  await logProcurementActivity({
    companyId,
    userId,
    action: 'CREATE_SUPPLIER_PAYMENT',
    targetType: 'SUPPLIER_PAYMENT',
    targetId: payment.id,
    targetName: payment.paymentNumber,
    description: `تسجيل دفعة مورد بمبلغ ${paymentAmount} ج.م للمورد ${payment.supplier?.name || ''}`,
    metadata: {
      amount: paymentAmount,
      paymentMethod,
      purchaseInvoiceId,
      treasuryAccountId,
      sourceKey,
    },
    severity: 'MEDIUM',
  });

  return {
    payment,
    financialPosting,
    alreadyExisted: false,
  };
}

module.exports = {
  recordSupplierPayment,
  generatePaymentNumber,
};
