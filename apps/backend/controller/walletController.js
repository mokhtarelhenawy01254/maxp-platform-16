const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const WalletService = require('../services/walletService');
const pendingBillingService = require('../services/pendingBillingService');

class WalletController {
  // --- Company Wallet & Billing Logic ---

  /**
   * @route GET /api/v1/wallet/balance
   * @desc Get company wallet balance
   * @access Protected
   */
  static async getBalance(req, res) {
    try {
      const companyId = req.user?.companyId;

      // Handle null, undefined, or string 'null'/'undefined'
      if (!companyId || companyId === 'null' || companyId === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد الشركة لعرض المحفظة',
          error: 'COMPANY_ID_REQUIRED'
        });
      }

      let wallet = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyWallet.findUnique({
          where: { companyId }
        });
      });

      // Create wallet if doesn't exist
      if (!wallet) {
        wallet = await executeWithRetry(async () => {
          return await getSharedPrismaClient().companyWallet.create({
            data: {
              companyId,
              balance: 0,
              currency: 'EGP'
            }
          });
        });
      }

      res.json({
        success: true,
        data: wallet
      });
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب رصيد المحفظة',
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/wallet/transactions
   * @desc Get wallet transactions
   * @access Protected
   */
  static async getTransactions(req, res) {
    try {
      const { companyId } = req.user;

      // Handle null, undefined, or string 'null'/'undefined'
      if (!companyId || companyId === 'null' || companyId === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد الشركة لعرض المحفظة'
        });
      }
      const { page = 1, limit = 20, type, startDate, endDate } = req.query;

      const wallet = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyWallet.findUnique({
          where: { companyId }
        });
      });

      if (!wallet) {
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 }
        });
      }

      const where = { walletId: wallet.id };

      if (type) {
        where.type = type;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [transactions, total] = await executeWithRetry(async () => {
        return await Promise.all([
          getSharedPrismaClient().transaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit)
          }),
          getSharedPrismaClient().transaction.count({ where })
        ]);
      });

      res.json({
        success: true,
        data: transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب حركات المحفظة',
        error: error.message
      });
    }
  }

  /**
   * @route POST /api/v1/wallet/recharge
   * @desc Recharge wallet balance
   * @access Protected
   */
  static async rechargeWallet(req, res) {
    try {
      const { companyId } = req.user;

      // Handle null, undefined, or string 'null'/'undefined'
      if (!companyId || companyId === 'null' || companyId === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد الشركة لعرض المحفظة'
        });
      }
      const { amount, paymentMethod, paymentId, reference } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'المبلغ يجب أن يكون أكبر من صفر'
        });
      }

      let wallet = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyWallet.findUnique({
          where: { companyId }
        });
      });

      if (!wallet) {
        wallet = await executeWithRetry(async () => {
          return await getSharedPrismaClient().companyWallet.create({
            data: {
              companyId,
              balance: 0,
              currency: 'EGP'
            }
          });
        });
      }

      // Apply bonus based on amount
      let bonus = 0;
      let finalAmount = parseFloat(amount);

      if (finalAmount >= 5000) {
        bonus = finalAmount * 0.30; // 30% bonus
      } else if (finalAmount >= 1000) {
        bonus = finalAmount * 0.20; // 20% bonus
      } else if (finalAmount >= 500) {
        bonus = finalAmount * 0.15; // 15% bonus
      } else if (finalAmount >= 100) {
        bonus = finalAmount * 0.10; // 10% bonus
      }

      const totalAmount = finalAmount + bonus;

      const result = await executeWithRetry(async () => {
        return await getSharedPrismaClient().$transaction(async (tx) => {
          // Update wallet
          const updatedWallet = await tx.companyWallet.update({
            where: { id: wallet.id },
            data: {
              balance: { increment: totalAmount },
              totalDeposited: { increment: totalAmount }
            }
          });

          // Create transaction
          const transaction = await tx.transaction.create({
            data: {
              walletId: wallet.id,
              type: 'DEPOSIT',
              amount: totalAmount,
              status: 'COMPLETED',
              description: bonus > 0
                ? `شحن المحفظة: ${finalAmount} جنيه + بونص ${bonus.toFixed(2)} جنيه`
                : `شحن المحفظة: ${finalAmount} جنيه`,
              referenceId: reference || paymentId
            }
          });

          // Add bonus transaction if applicable
          if (bonus > 0) {
            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                type: 'BONUS',
                amount: bonus,
                status: 'COMPLETED',
                description: `بونص شحن المحفظة (${(bonus / finalAmount * 100).toFixed(0)}%)`,
                referenceId: transaction.id
              }
            });
          }

          return { wallet: updatedWallet, transaction };
        });
      });

      // 🚀 تحصيل رسوم الاستخدام المؤجلة تلقائياً بعد شحن الرصيد
      try {
        const pendingResult = await pendingBillingService.processPendingUsageCharges(companyId);
        if (pendingResult.processed > 0) {
          console.log(`✅ [WALLET-RECHARGE] Auto-collected ${pendingResult.processed} pending charge(s), released ${pendingResult.released.length} order(s) for company ${companyId}`);
        }
      } catch (pendingError) {
        console.error('⚠️ [WALLET-RECHARGE] Error processing pending charges:', pendingError.message);
      }

      res.json({
        success: true,
        message: bonus > 0
          ? `تم شحن المحفظة بنجاح! 🎉\nحصلت على بونص ${bonus.toFixed(2)} جنيه`
          : 'تم شحن المحفظة بنجاح! 💰',
        data: {
          wallet: result.wallet,
          transaction: result.transaction,
          bonus: bonus > 0 ? {
            amount: bonus,
            percentage: (bonus / finalAmount * 100).toFixed(0)
          } : null
        }
      });
    } catch (error) {
      console.error('Error recharging wallet:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في شحن المحفظة',
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/billing/summary
   * @desc Get billing summary for current month
   * @access Protected
   */
  static async getBillingSummary(req, res) {
    try {
      const { companyId } = req.user;

      // Handle null, undefined, or string 'null'/'undefined'
      if (!companyId || companyId === 'null' || companyId === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد الشركة لعرض المحفظة'
        });
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Get active apps
      const activeApps = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyApp.findMany({
          where: {
            companyId,
            status: { in: ['TRIAL', 'ACTIVE'] }
          },
          include: {
            app: true
          }
        });
      });

      // Calculate subscription costs
      let subscriptionCost = 0;
      activeApps.forEach(ca => {
        if (ca.app.pricingModel === 'SUBSCRIPTION' || ca.app.pricingModel === 'HYBRID') {
          subscriptionCost += parseFloat(ca.app.monthlyPrice || 0);
        }
      });

      // Get usage costs for this month
      const usageCosts = await executeWithRetry(async () => {
        return await getSharedPrismaClient().appUsageLog.aggregate({
          where: {
            companyApp: { companyId },
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          _sum: {
            totalCost: true
          }
        });
      });

      const usageCost = parseFloat(usageCosts._sum.totalCost || 0);
      const totalCost = subscriptionCost + usageCost;

      // Get wallet balance
      const wallet = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyWallet.findUnique({
          where: { companyId }
        });
      });

      // 🚧 الطلبات المعلّقة بانتظار شحن الرصيد (billingHoldAmount != null)
      // أو بسبب انتهاء اشتراك الطلبات اليدوية (billingHoldAmount == null)
      const [billingHeldAgg, subscriptionHeldCount] = await executeWithRetry(async () => {
        return await Promise.all([
          getSharedPrismaClient().order.aggregate({
            where: { companyId, billingHoldAt: { not: null }, billingHoldAmount: { not: null } },
            _count: { id: true },
            _sum: { billingHoldAmount: true }
          }),
          getSharedPrismaClient().order.count({
            where: { companyId, billingHoldAt: { not: null }, billingHoldAmount: null }
          })
        ]);
      });

      // Get usage breakdown by feature
      const usageByFeature = await executeWithRetry(async () => {
        return await getSharedPrismaClient().appUsageLog.groupBy({
          by: ['feature'],
          where: {
            companyApp: { companyId },
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          _sum: {
            totalCost: true,
            quantity: true
          }
        });
      });

      res.json({
        success: true,
        data: {
          period: {
            start: startOfMonth,
            end: endOfMonth
          },
          costs: {
            subscriptions: subscriptionCost,
            usage: usageCost,
            total: totalCost
          },
          wallet: {
            balance: wallet ? parseFloat(wallet.balance) : 0,
            currency: wallet?.currency || 'EGP'
          },
          activeApps: activeApps.length,
          usageBreakdown: usageByFeature,
          heldOrders: {
            count: (billingHeldAgg._count.id || 0) + subscriptionHeldCount,
            amount: parseFloat(billingHeldAgg._sum.billingHoldAmount || 0),
            subscriptionCount: subscriptionHeldCount
          }
        }
      });
    } catch (error) {
      console.error('Error fetching billing summary:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب ملخص الفواتير',
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/billing/usage
   * @desc Get detailed usage report
   * @access Protected
   */
  static async getUsageReport(req, res) {
    try {
      const { companyId } = req.user;

      // Handle null, undefined, or string 'null'/'undefined'
      if (!companyId || companyId === 'null' || companyId === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد الشركة لعرض المحفظة'
        });
      }
      const { startDate, endDate, groupBy = 'day' } = req.query;

      const where = { companyApp: { companyId } };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      } else {
        // Default to current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        where.createdAt = { gte: startOfMonth };
      }

      const [usageLogs, summary] = await executeWithRetry(async () => {
        return await Promise.all([
          getSharedPrismaClient().appUsageLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100
          }),
          getSharedPrismaClient().appUsageLog.aggregate({
            where,
            _sum: {
              totalCost: true,
              quantity: true
            },
            _count: {
              id: true
            }
          })
        ]);
      });

      // Group by feature
      const byFeature = await executeWithRetry(async () => {
        return await getSharedPrismaClient().appUsageLog.groupBy({
          by: ['feature'],
          where,
          _sum: {
            totalCost: true,
            quantity: true
          }
        });
      });

      res.json({
        success: true,
        data: {
          usage: usageLogs,
          summary: {
            totalCost: parseFloat(summary._sum.totalCost || 0),
            totalQuantity: summary._sum.quantity || 0,
            count: summary._count.id
          },
          byFeature
        }
      });
    } catch (error) {
      console.error('Error fetching usage report:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب تقرير الاستخدام',
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/billing/invoices
   * @desc Get billing invoices
   * @access Protected
   */
  static async getInvoices(req, res) {
    try {
      const { companyId } = req.user;

      // Handle null, undefined, or string 'null'/'undefined'
      if (!companyId || companyId === 'null' || companyId === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد الشركة لعرض المحفظة'
        });
      }
      const { status, page = 1, limit = 10 } = req.query;

      const where = { companyId };
      if (status) where.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [invoices, total] = await executeWithRetry(async () => {
        return await Promise.all([
          getSharedPrismaClient().invoice.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit)
          }),
          getSharedPrismaClient().invoice.count({ where })
        ]);
      });

      res.json({
        success: true,
        data: invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الفواتير',
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/billing/invoices/:id
   * @desc Get invoice details
   * @access Protected
   */
  static async getInvoiceDetails(req, res) {
    try {
      const { companyId } = req.user;

      // Handle null, undefined, or string 'null'/'undefined'
      if (!companyId || companyId === 'null' || companyId === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد الشركة لعرض المحفظة'
        });
      }
      const { id } = req.params;

      const invoice = await executeWithRetry(async () => {
        return await getSharedPrismaClient().invoice.findFirst({
          where: { id, companyId },
          include: {
            invoiceItems: true
          }
        });
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'الفاتورة غير موجودة'
        });
      }

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب تفاصيل الفاتورة',
        error: error.message
      });
    }
  }

  // --- Customer Wallet & Loyalty Logic ---

  /**
   * @route GET /api/v1/wallet/my-wallet
   * @desc Get current user's (customer) wallet balance
   */
  static async getMyWallet(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(user.role);
      const customerId = user.role === 'CUSTOMER'
        ? (user.customerId || user.userId || user.id)
        : req.query.customerId;
      const companyId = user.companyId;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'customerId is required'
        });
      }

      if (user.role === 'CUSTOMER' && (user.customerId || user.userId || user.id) !== customerId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const wallet = await getSharedPrismaClient().customerWallet.findUnique({
        where: { customerId }
      });

      if (!wallet) {
        await WalletService.createWallet(customerId, companyId);
      }

      const currentWallet = await getSharedPrismaClient().customerWallet.findUnique({
        where: { customerId }
      });

      const cashbackStats = await getSharedPrismaClient().walletTransaction.aggregate({
        where: {
          walletId: currentWallet.id,
          type: 'CASHBACK'
        },
        _sum: {
          amount: true
        }
      });

      res.json({
        success: true,
        data: {
          ...currentWallet,
          balance: parseFloat(currentWallet.balance), // Ensure it's a number
          totalCashback: parseFloat(cashbackStats._sum.amount || 0),
          currency: 'EGP'
        }
      });
    } catch (error) {
      console.error('Error in getMyWallet:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/wallet/my-transactions
   * @desc Get current user's (customer) wallet transactions
   */
  static async getMyTransactions(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(user.role);
      const customerId = user.role === 'CUSTOMER'
        ? (user.customerId || user.userId || user.id)
        : req.query.customerId;
      const companyId = user.companyId;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'customerId is required'
        });
      }

      if (user.role === 'CUSTOMER' && (user.customerId || user.userId || user.id) !== customerId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const { page = 1, limit = 10, type } = req.query;

      const result = await WalletService.getWalletTransactions(customerId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in getMyTransactions:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * @route POST /api/v1/wallet/use-balance
   * @desc Use customer wallet balance for an order
   */
  static async useWalletBalance(req, res) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const { amount, orderId } = req.body;
      if (!amount || !orderId) {
        return res.status(400).json({ success: false, message: 'Amount and orderId are required' });
      }

      const customerId = user.customerId || user.userId || user.id;
      const result = await WalletService.useWalletBalance(
        customerId,
        parseFloat(amount),
        orderId
      );

      res.json({
        success: true,
        data: {
          newBalance: result.wallet.balance,
          transaction: result.transaction
        }
      });
    } catch (error) {
      console.error('Error in useWalletBalance:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * @route POST /api/v1/wallet/add-balance
   * @desc Add balance to customer wallet (Admin only)
   */
  static async addToWallet(req, res) {
    try {
      const user = req.user;
      if (!user || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const { customerId, amount, type, description } = req.body;
      if (!customerId || !amount || !type || !description) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const result = await WalletService.addToWallet(
        customerId,
        parseFloat(amount),
        type,
        description,
        { addedBy: user.id }
      );

      res.json({
        success: true,
        data: {
          newBalance: result.wallet.balance,
          transaction: result.transaction
        }
      });
    } catch (error) {
      console.error('Error in addToWallet:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/wallet/stats
   * @desc Get wallet statistics for admin
   */
  static async getWalletStats(req, res) {
    try {
      const user = req.user;
      if (!user || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const companyId = user.companyId;
      const prisma = getSharedPrismaClient();

      const [totalBalance, totalEarned, totalSpent, activeWallets, totalCashback] = await Promise.all([
        prisma.customerWallet.aggregate({ where: { companyId, isActive: true }, _sum: { balance: true } }),
        prisma.customerWallet.aggregate({ where: { companyId, isActive: true }, _sum: { totalEarned: true } }),
        prisma.customerWallet.aggregate({ where: { companyId, isActive: true }, _sum: { totalSpent: true } }),
        prisma.customerWallet.count({ where: { companyId, isActive: true } }),
        prisma.walletTransaction.aggregate({ where: { wallet: { companyId }, type: 'CASHBACK' }, _sum: { amount: true } })
      ]);

      res.json({
        success: true,
        data: {
          totalBalance: totalBalance._sum.balance || 0,
          totalEarned: totalEarned._sum.totalEarned || 0,
          totalSpent: totalSpent._sum.totalSpent || 0,
          activeWallets,
          totalCashback: totalCashback._sum.amount || 0
        }
      });
    } catch (error) {
      console.error('Error in getWalletStats:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async createKashierRechargeSession(req, res) {
    try {
      const { companyId } = req.user;

      if (!companyId || companyId === 'null' || companyId === 'undefined') {
        return res.status(400).json({ success: false, message: 'يجب تحديد الشركة' });
      }

      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'المبلغ يجب أن يكون أكبر من صفر' });
      }

      const baseDomain = process.env.MAIN_DOMAIN || 'maxp.online';
      const orderNumber = `WLT-${Date.now()}`;
      const redirectUrl = `https://${baseDomain}/payments`;
      const webhookUrl = `https://${baseDomain}/api/v1/payment/kashier/webhook`;

      const KashierService = require('../services/kashierService');
      const session = await KashierService.createPaymentSession(
        {
          amount: parseFloat(amount),
          currency: 'EGP',
          orderId: orderNumber,
          customer: { email: req.user.email, reference: `wallet:${companyId}:${amount}` },
          redirectUrl,
          webhookUrl,
          description: `شحن المحفظة: ${amount} جنيه`,
        },
        companyId,
      );

      if (!session.success) {
        return res.status(502).json({ success: false, message: 'فشل إنشاء جلسة الدفع' });
      }

      res.json({
        success: true,
        data: {
          sessionUrl: session.sessionUrl,
          sessionId: session.sessionId,
          orderNumber,
        },
      });
    } catch (error) {
      console.error('[KASHIER-RECHARGE] Error:', error);
      res.status(500).json({ success: false, message: 'حدث خطأ أثناء إنشاء جلسة الدفع' });
    }
  }
}

module.exports = WalletController;
