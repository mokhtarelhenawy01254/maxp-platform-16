const verifyToken = require("../utils/verifyToken");
const express = require('express');
const router = express.Router();
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// إعداد multer لرفع الصور
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/payment-receipts';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يجب أن يكون الملف صورة'), false);
    }
  }
});

// جلب أرقام المحافظ النشطة
router.get('/wallet-numbers', verifyToken.authenticateToken, async (req, res) => {
  try {
    const walletNumbers = await executeWithRetry(async () => {
      return await getSharedPrismaClient().walletNumber.findMany({
        where: {
          isActive: true
        },
        orderBy: { createdAt: 'asc' }
      });
    });

    res.json({
      success: true,
      data: walletNumbers
    });
  } catch (error) {
    console.error('خطأ في جلب أرقام المحافظ:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      user: req.user
    });
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب أرقام المحافظ',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// جلب تفاصيل فاتورة للدفع
router.get('/invoice/:invoiceId', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await executeWithRetry(async () => {
      return await getSharedPrismaClient().invoice.findUnique({
        where: { id: invoiceId },
        include: {
          company: {
            select: {
              name: true,
              email: true
            }
          },
          subscription: {
            select: {
              planType: true
            }
          }
        }
      });
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة'
      });
    }

    // التحقق من أن الفاتورة غير مدفوعة
    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'هذه الفاتورة مدفوعة بالفعل'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('خطأ في جلب الفاتورة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الفاتورة'
    });
  }
});

// رفع إيصال الدفع
router.post('/submit-receipt', verifyToken.authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    const { invoiceId, walletNumberId, subscriptionId, amount, purpose } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'يجب رفع صورة الإيصال'
      });
    }

    if (!walletNumberId) {
      return res.status(400).json({
        success: false,
        message: 'يجب اختيار رقم المحفظة'
      });
    }

    // التحقق من وجود رقم المحفظة
    const walletNumber = await executeWithRetry(async () => {
      return await getSharedPrismaClient().walletNumber.findUnique({
        where: { id: walletNumberId }
      });
    });

    if (!walletNumber || !walletNumber.isActive) {
      return res.status(400).json({
        success: false,
        message: 'رقم المحفظة غير صالح أو غير نشط'
      });
    }

    let finalInvoiceId = invoiceId;

    // حالة 1: شحن المحفظة المباشر (بدون فاتورة أو اشتراك)
    if (!invoiceId && purpose === 'wallet_recharge') {
      const companyId = req.user?.companyId;

      if (!companyId || companyId === 'null' || companyId === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'حسابك غير مرتبط بشركة. لا يمكن شحن المحفظة.'
        });
      }

      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد المبلغ المراد شحنه'
        });
      }

      const newInvoice = await executeWithRetry(async () => {
        return await getSharedPrismaClient().invoice.create({
          data: {
            invoiceNumber: `WLT-${Date.now()}`,
            companyId: companyId,
            totalAmount: parseFloat(amount),
            subtotal: parseFloat(amount),
            status: 'DRAFT',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            notes: `شحن المحفظة - ${parseFloat(amount)} جنيه`
          }
        });
      });

      finalInvoiceId = newInvoice.id;

      // حالة 2: تجديد اشتراك بدون فاتورة
    } else if (!invoiceId && subscriptionId && purpose === 'subscription_renewal') {
      const companyId = req.user.companyId;

      const newInvoice = await executeWithRetry(async () => {
        return await getSharedPrismaClient().invoice.create({
          data: {
            invoiceNumber: `INV-${Date.now()}`,
            companyId: companyId,
            subscriptionId: subscriptionId,
            totalAmount: parseFloat(amount) || 7500,
            subtotal: parseFloat(amount) || 7500,
            status: 'DRAFT',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            notes: 'تجديد الاشتراك'
          }
        });
      });

      finalInvoiceId = newInvoice.id;

      // حالة 3: فاتورة موجودة مسبقاً
    } else if (invoiceId) {
      const invoice = await executeWithRetry(async () => {
        return await getSharedPrismaClient().invoice.findUnique({
          where: { id: invoiceId }
        });
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'الفاتورة غير موجودة'
        });
      }

      if (invoice.status === 'PAID') {
        return res.status(400).json({
          success: false,
          message: 'هذه الفاتورة مدفوعة بالفعل'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'يجب توفير invoiceId أو subscriptionId أو تحديد purpose=wallet_recharge'
      });
    }

    // حفظ إيصال الدفع
    const paymentReceipt = await executeWithRetry(async () => {
      return await getSharedPrismaClient().paymentReceipt.create({
        data: {
          invoiceId: finalInvoiceId,
          walletNumberId,
          receiptImage: req.file.path,
          status: 'PENDING'
        }
      });
    });

    res.json({
      success: true,
      message: 'تم إرسال الإيصال بنجاح، سيتم مراجعته قريباً',
      data: paymentReceipt
    });
  } catch (error) {
    console.error('خطأ في رفع الإيصال:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الإيصال',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const { validateCreateWalletNumber, validateUpdateWalletNumber } = require('../middleware/walletPaymentValidation');

// === APIs الإدارة ===

// جلب جميع أرقام المحافظ (للإدارة)
router.get('/admin/wallet-numbers', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const walletNumbers = await executeWithRetry(async () => {
      return await getSharedPrismaClient().walletNumber.findMany({
        orderBy: { createdAt: 'desc' }
      });
    });

    res.json({
      success: true,
      data: walletNumbers
    });
  } catch (error) {
    console.error('خطأ في جلب أرقام المحافظ:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب أرقام المحافظ'
    });
  }
});

// إضافة رقم محفظة جديد
router.post('/admin/wallet-numbers', authenticateToken, requireSuperAdmin, validateCreateWalletNumber, async (req, res) => {
  try {
    const { name, number, icon, color } = req.body;

    const walletNumber = await executeWithRetry(async () => {
      return await getSharedPrismaClient().walletNumber.create({
        data: {
          name,
          number,
          icon,
          color,
          isActive: true
        }
      });
    });

    res.json({
      success: true,
      message: 'تم إضافة رقم المحفظة بنجاح',
      data: walletNumber
    });
  } catch (error) {
    console.error('خطأ في إضافة رقم المحفظة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة رقم المحفظة'
    });
  }
});

// تحديث رقم محفظة
router.put('/admin/wallet-numbers/:id', authenticateToken, requireSuperAdmin, validateUpdateWalletNumber, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, number, icon, color, isActive } = req.body;

    const walletNumber = await executeWithRetry(async () => {
      return await getSharedPrismaClient().walletNumber.update({
        where: { id },
        data: {
          name,
          number,
          icon,
          color,
          isActive
        }
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث رقم المحفظة بنجاح',
      data: walletNumber
    });
  } catch (error) {
    console.error('خطأ في تحديث رقم المحفظة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث رقم المحفظة'
    });
  }
});

// حذف رقم محفظة
router.delete('/admin/wallet-numbers/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await executeWithRetry(async () => {
      return await getSharedPrismaClient().walletNumber.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'تم حذف رقم المحفظة بنجاح'
    });
  } catch (error) {
    console.error('خطأ في حذف رقم المحفظة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف رقم المحفظة'
    });
  }
});

// جلب الإيصالات في الانتظار
router.get('/admin/pending-receipts', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get receipts with correct schema relations
    const [receipts, total] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().paymentReceipt.findMany({
          where: { status: 'PENDING' },
          include: {
            invoice: { // FIXED: Corrected singular relation name
              include: {
                company: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            },
            walletNumber: true // FIXED: Corrected relation name
          },
          orderBy: { submittedAt: 'desc' },
          skip: parseInt(skip),
          take: parseInt(limit)
        }),
        getSharedPrismaClient().paymentReceipt.count({
          where: { status: 'PENDING' }
        })
      ]);
    });

    // Map relations back to frontend expected structure
    const mappedReceipts = receipts.map(receipt => ({
      ...receipt,
      invoice: receipt.invoice,
      walletNumber: receipt.walletNumber
    }));

    res.json({
      success: true,
      data: mappedReceipts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('خطأ في جلب الإيصالات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإيصالات'
    });
  }
});

// مراجعة إيصال الدفع
router.post('/admin/review-receipt/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, status, notes } = req.body; // support both action: 'approve'/'reject' and status: 'APPROVED'/'REJECTED'

    // Normalize action from either field
    const resolvedAction = action || (status === 'APPROVED' ? 'approve' : status === 'REJECTED' ? 'reject' : null);

    if (!resolvedAction) {
      return res.status(400).json({ success: false, message: 'يجب تحديد الإجراء (approve/reject أو status: APPROVED/REJECTED)' });
    }

    const receipt = await executeWithRetry(async () => {
      return await getSharedPrismaClient().paymentReceipt.findUnique({
        where: { id },
        include: { invoice: true }
      });
    });

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'الإيصال غير موجود' });
    }

    if (receipt.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'تمت مراجعة هذا الإيصال مسبقاً' });
    }

    const newStatus = resolvedAction === 'approve' ? 'APPROVED' : 'REJECTED';

    let billingHistoryId = null;

    await executeWithRetry(async () => {
      await getSharedPrismaClient().$transaction(async (tx) => {
        // 1. تحديث حالة الإيصال
        await tx.paymentReceipt.update({
          where: { id },
          data: {
            status: newStatus,
            reviewedAt: new Date(),
            reviewedBy: req.user?.id || req.user?.email || 'admin',
            notes
          }
        });

        // إذا تم الموافقة، تحديث حالة الفاتورة وإنشاء سجلات الدفع وإضافة رصيد المحفظة
        if (resolvedAction === 'approve') {
          const approvedAmount = Number(receipt.invoice.totalAmount);
          const companyId = receipt.invoice.companyId;

          // 2. تحديث حالة الفاتورة
          await tx.invoice.update({
            where: { id: receipt.invoiceId },
            data: { status: 'PAID', paidDate: new Date() }
          });

          // 3. إنشاء سجل الدفع
          const payment = await tx.payment.create({
            data: {
              paymentNumber: `PAY-WLT-${Date.now()}`,
              invoiceId: receipt.invoiceId,
              companyId,
              amount: approvedAmount,
              status: 'COMPLETED',
              method: 'WALLET',
              paidAt: new Date()
            }
          });

          // 4. 💰 إضافة رصيد المحفظة للشركة وتحديث إجمالي الإيداع
          const updatedWallet = await tx.companyWallet.upsert({
            where: { companyId },
            update: {
              balance: { increment: approvedAmount },
              totalDeposited: { increment: approvedAmount },
              updatedAt: new Date()
            },
            create: {
              companyId,
              balance: approvedAmount,
              totalDeposited: approvedAmount,
              currency: receipt.invoice.currency || 'EGP'
            }
          });

          // 5. 🚀 إنشاء سجل BillingHistory لتفعيل نظام عمولات الشركاء
          const billing = await tx.billingHistory.create({
            data: {
              companyId,
              type: 'PLATFORM_FEE',
              amount: approvedAmount,
              description: 'دفع عبر المحفظة الإلكترونية - موافق عليه',
              status: 'SUCCESS'
            }
          });
          billingHistoryId = billing.id;
        }
      });
    });

    // 🚀 توزيع العمولات على شركاء الإحالة بشكل غير متزامن
    if (billingHistoryId) {
      const platformPartnerService = require('../services/platformPartner.service');
      platformPartnerService.distributeCommissions(billingHistoryId).catch(err => {
        console.error('❌ [WALLET-REVIEW] Error distributing commissions:', err.message);
      });

      // 🚀 تحصيل رسوم الاستخدام المؤجلة تلقائياً بعد إيداع الرصيد
      try {
        const pendingBillingService = require('../services/pendingBillingService');
        const pendingResult = await pendingBillingService.processPendingUsageCharges(receipt.invoice.companyId);
        if (pendingResult.processed > 0) {
          console.log(`✅ [WALLET-REVIEW] Auto-collected ${pendingResult.processed} pending charge(s), released ${pendingResult.released.length} order(s)`);
        }
      } catch (pendingError) {
        console.error('⚠️ [WALLET-REVIEW] Error processing pending charges:', pendingError.message);
      }
    }

    res.json({
      success: true,
      message: resolvedAction === 'approve' ? 'تم تأكيد الدفع وإيداع الرصيد بنجاح' : 'تم رفض الإيصال'
    });
  } catch (error) {
    console.error('خطأ في مراجعة الإيصال:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مراجعة الإيصال'
    });
  }
});

module.exports = router;
