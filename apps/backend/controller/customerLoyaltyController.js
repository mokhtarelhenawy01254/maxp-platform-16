/**
 * 🎁 Customer Loyalty Controller
 * وحدة التحكم في نظام ولاء العملاء
 */

const customerLoyaltyService = require('../services/hr/customerLoyaltyService');
const autoDiscountService = require('../services/autoDiscountService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

function parseJsonMaybe(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeCashbackRules(inputRules) {
  const rules = parseJsonMaybe(inputRules, {});
  const percent = Number(rules.cashbackPercent ?? rules.percent ?? 0);
  const base = rules.base === 'subtotal' ? 'subtotal' : 'total';
  const trigger = rules.trigger || 'payment_completed';
  const maxPerOrder = Number.isFinite(Number(rules.maxPerOrder)) ? Number(rules.maxPerOrder) : 0;
  const tierOverrides = typeof rules.tierOverrides === 'object' ? rules.tierOverrides : {};
  return {
    cashbackPercent: Number.isFinite(percent) ? percent : 0,
    base,
    trigger,
    maxPerOrder,
    tierOverrides
  };
}

/**
 * جلب جميع برامج الولاء
 * GET /api/v1/hr/customer-loyalty/programs
 */
async function getPrograms(req, res) {
  try {
    const { companyId } = req.user;
    const { status, type } = req.query;

    const programs = await customerLoyaltyService.getPrograms(companyId, {
      status,
      type
    });

    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    console.error('❌ Error getting loyalty programs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب برامج الولاء'
    });
  }
}

async function getCashbackSettings(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const prisma = getSharedPrismaClient();

    const program = await prisma.customerLoyaltyProgram.findFirst({
      where: { companyId, type: 'CASHBACK' },
      orderBy: { createdAt: 'asc' }
    });

    const ensured = program || await prisma.customerLoyaltyProgram.create({
      data: {
        companyId,
        name: 'Cashback',
        nameAr: 'كاش باك',
        type: 'CASHBACK',
        status: 'ACTIVE',
        pointsPerPurchase: '0.00',
        pointsPerReferral: '0.00',
        redemptionRate: '1.00',
        minimumPoints: '0.00',
        expiryMonths: 12,
        rules: JSON.stringify({ cashbackPercent: 0, base: 'total', trigger: 'payment_completed' }),
        createdBy: userId || 'system'
      }
    });

    res.json({
      success: true,
      data: {
        id: ensured.id,
        status: ensured.status,
        rules: normalizeCashbackRules(ensured.rules)
      }
    });
  } catch (error) {
    console.error('❌ Error getting cashback settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب إعدادات الكاش باك'
    });
  }
}

async function updateCashbackSettings(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const prisma = getSharedPrismaClient();

    const program = await prisma.customerLoyaltyProgram.findFirst({
      where: { companyId, type: 'CASHBACK' },
      orderBy: { createdAt: 'asc' }
    }) || await prisma.customerLoyaltyProgram.create({
      data: {
        companyId,
        name: 'Cashback',
        nameAr: 'كاش باك',
        type: 'CASHBACK',
        status: 'ACTIVE',
        pointsPerPurchase: '0.00',
        pointsPerReferral: '0.00',
        redemptionRate: '1.00',
        minimumPoints: '0.00',
        expiryMonths: 12,
        rules: JSON.stringify({ cashbackPercent: 0, base: 'total', trigger: 'payment_completed' }),
        createdBy: userId || 'system'
      }
    });

    const currentRules = normalizeCashbackRules(program.rules);

    const nextPercent = req.body.cashbackPercent ?? req.body.percent ?? currentRules.cashbackPercent;
    const nextBase = req.body.base ?? currentRules.base;
    const nextStatus = req.body.status ?? program.status;
    const nextMaxPerOrder = req.body.maxPerOrder ?? currentRules.maxPerOrder;
    const nextTierOverrides = req.body.tierOverrides ?? currentRules.tierOverrides;

    const percent = Number(nextPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      return res.status(400).json({
        success: false,
        error: 'cashbackPercent must be a number between 0 and 100'
      });
    }

    const maxPerOrder = Number(nextMaxPerOrder);
    if (!Number.isFinite(maxPerOrder) || maxPerOrder < 0) {
      return res.status(400).json({
        success: false,
        error: 'maxPerOrder must be a positive number'
      });
    }

    const base = nextBase === 'subtotal' ? 'subtotal' : 'total';

    const updated = await prisma.customerLoyaltyProgram.update({
      where: { id: program.id },
      data: {
        status: nextStatus,
        rules: JSON.stringify({
          ...currentRules,
          cashbackPercent: percent,
          base,
          maxPerOrder,
          tierOverrides: nextTierOverrides
        })
      }
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        rules: normalizeCashbackRules(updated.rules)
      },
      message: 'تم تحديث إعدادات الكاش باك بنجاح'
    });
  } catch (error) {
    console.error('❌ Error updating cashback settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحديث إعدادات الكاش باك'
    });
  }
}

/**
 * جلب برنامج ولاء محدد
 * GET /api/v1/hr/customer-loyalty/programs/:id
 */
async function getProgramById(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const program = await customerLoyaltyService.getProgramById(companyId, id);

    res.json({
      success: true,
      data: program
    });
  } catch (error) {
    console.error('❌ Error getting loyalty program:', error);
    res.status(error.message.includes('غير موجود') ? 404 : 500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب برنامج الولاء'
    });
  }
}

/**
 * إنشاء برنامج ولاء جديد
 * POST /api/v1/hr/customer-loyalty/programs
 */
async function createProgram(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const data = req.body;

    const program = await customerLoyaltyService.createProgram(companyId, data, userId);

    res.status(201).json({
      success: true,
      data: program,
      message: 'تم إنشاء برنامج الولاء بنجاح'
    });
  } catch (error) {
    console.error('❌ Error creating loyalty program:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء برنامج الولاء'
    });
  }
}

/**
 * تحديث برنامج ولاء
 * PUT /api/v1/hr/customer-loyalty/programs/:id
 */
async function updateProgram(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const data = req.body;

    const program = await customerLoyaltyService.updateProgram(companyId, id, data);

    res.json({
      success: true,
      data: program,
      message: 'تم تحديث برنامج الولاء بنجاح'
    });
  } catch (error) {
    console.error('❌ Error updating loyalty program:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحديث برنامج الولاء'
    });
  }
}

/**
 * جلب جميع المستويات
 * GET /api/v1/hr/customer-loyalty/tiers
 */
async function getTiers(req, res) {
  try {
    const { companyId } = req.user;
    const { programId } = req.query;

    const tiers = await customerLoyaltyService.getTiers(companyId, programId);

    res.json({
      success: true,
      data: tiers
    });
  } catch (error) {
    console.error('❌ Error getting loyalty tiers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب المستويات'
    });
  }
}

/**
 * إنشاء مستوى جديد
 * POST /api/v1/hr/customer-loyalty/tiers
 */
async function createTier(req, res) {
  try {
    const { companyId } = req.user;
    const data = req.body;

    const tier = await customerLoyaltyService.createTier(companyId, data);

    res.status(201).json({
      success: true,
      data: tier,
      message: 'تم إنشاء المستوى بنجاح'
    });
  } catch (error) {
    console.error('❌ Error creating loyalty tier:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء المستوى'
    });
  }
}

/**
 * تحديث مستوى
 * PUT /api/v1/hr/customer-loyalty/tiers/:id
 */
async function updateTier(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const data = req.body;

    const tier = await customerLoyaltyService.updateTier(companyId, id, data);

    res.json({
      success: true,
      data: tier,
      message: 'تم تحديث المستوى بنجاح'
    });
  } catch (error) {
    console.error('❌ Error updating loyalty tier:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحديث المستوى'
    });
  }
}

/**
 * حذف مستوى
 * DELETE /api/v1/hr/customer-loyalty/tiers/:id
 */
async function deleteTier(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const result = await customerLoyaltyService.deleteTier(companyId, id);

    res.json({
      success: true,
      message: 'تم حذف المستوى بنجاح'
    });
  } catch (error) {
    console.error('❌ Error deleting loyalty tier:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء حذف المستوى'
    });
  }
}

/**
 * جلب سجلات ولاء العملاء
 * GET /api/v1/hr/customer-loyalty/customers
 */
async function getCustomerRecords(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId, programId, status } = req.query;

    const records = await customerLoyaltyService.getCustomerRecords(companyId, {
      customerId,
      programId,
      status
    });

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('❌ Error getting customer loyalty records:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب سجلات ولاء العملاء'
    });
  }
}

/**
 * إضافة عميل إلى برنامج ولاء
 * POST /api/v1/hr/customer-loyalty/enroll
 */
async function enrollCustomer(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId, programId, initialPoints } = req.body;

    if (!customerId || !programId) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد العميل والبرنامج'
      });
    }

    const record = await customerLoyaltyService.enrollCustomer(
      companyId,
      customerId,
      programId,
      initialPoints || 0
    );

    res.status(201).json({
      success: true,
      data: record,
      message: 'تم تسجيل العميل في برنامج الولاء بنجاح'
    });
  } catch (error) {
    console.error('❌ Error enrolling customer:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تسجيل العميل'
    });
  }
}

/**
 * إضافة نقاط للعميل
 * POST /api/v1/hr/customer-loyalty/add-points
 */
async function addPoints(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId, programId, points, reason } = req.body;

    if (!customerId || !programId || !points) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد العميل والبرنامج والنقاط'
      });
    }

    if (points <= 0) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن تكون النقاط أكبر من صفر'
      });
    }

    const record = await customerLoyaltyService.addPoints(
      companyId,
      customerId,
      programId,
      points,
      reason
    );

    res.json({
      success: true,
      data: record,
      message: 'تم إضافة النقاط بنجاح'
    });
  } catch (error) {
    console.error('❌ Error adding points:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إضافة النقاط'
    });
  }
}

/**
 * استبدال النقاط
 * POST /api/v1/hr/customer-loyalty/redeem-points
 */
async function redeemPoints(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId, programId, points } = req.body;

    if (!customerId || !programId || !points) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد العميل والبرنامج والنقاط'
      });
    }

    if (points <= 0) {
      return res.status(400).json({
        success: false,
        error: 'يجب أن تكون النقاط أكبر من صفر'
      });
    }

    const record = await customerLoyaltyService.redeemPoints(
      companyId,
      customerId,
      programId,
      points
    );

    res.json({
      success: true,
      data: record,
      message: 'تم استبدال النقاط بنجاح'
    });
  } catch (error) {
    console.error('❌ Error redeeming points:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء استبدال النقاط'
    });
  }
}

/**
 * تعديل النقاط (إضافة أو خصم)
 * POST /api/v1/hr/customer-loyalty/adjust-points
 */
async function adjustPoints(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { customerId, programId, points, reason } = req.body;

    if (!customerId || !programId || points === undefined) {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد العميل والبرنامج والنقاط'
      });
    }

    const record = await customerLoyaltyService.adjustPoints(
      companyId,
      customerId,
      programId,
      points,
      reason,
      userId
    );

    res.json({
      success: true,
      data: record,
      message: 'تم تعديل النقاط بنجاح'
    });
  } catch (error) {
    console.error('❌ Error adjusting points:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تعديل النقاط'
    });
  }
}

/**
 * إعدادات المستويات (الافتراضي + الفئات)
 * GET /api/v1/hr/customer-loyalty/tier-config
 */
async function getTierConfig(req, res) {
  try {
    const { companyId } = req.user;
    const { programId } = req.query;

    if (!programId) {
      return res.status(400).json({ success: false, error: 'programId مطلوب' });
    }

    const config = await customerLoyaltyService.getTierConfig(companyId, programId);

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('❌ Error getting tier config:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء جلب إعدادات المستويات' });
  }
}

/**
 * تحديث طريقة الحساب الافتراضية
 * PUT /api/v1/hr/customer-loyalty/tier-config
 */
async function updateTierConfig(req, res) {
  try {
    const { companyId } = req.user;
    const { programId, defaultTierMethod } = req.body;

    if (!programId) {
      return res.status(400).json({ success: false, error: 'programId مطلوب' });
    }

    const program = await customerLoyaltyService.updateDefaultTierMethod(companyId, programId, defaultTierMethod);

    res.json({ success: true, data: program, message: 'تم تحديث طريقة الحساب الافتراضية بنجاح' });
  } catch (error) {
    console.error('❌ Error updating tier config:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء تحديث إعدادات المستويات' });
  }
}

/**
 * جلب تجاوز عميل (طريقة الحساب + المزايا)
 * GET /api/v1/hr/customer-loyalty/customers/:customerId/tier-override
 */
async function getCustomerTierOverride(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId } = req.params;

    const override = await customerLoyaltyService.getCustomerTierOverride(companyId, customerId);
    if (!override) {
      return res.status(404).json({ success: false, error: 'العميل غير موجود' });
    }

    res.json({ success: true, data: override });
  } catch (error) {
    console.error('❌ Error getting customer tier override:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء جلب تجاوز العميل' });
  }
}

/**
 * تحديث تجاوز عميل (طريقة الحساب + المزايا)
 * PUT /api/v1/hr/customer-loyalty/customers/:customerId/tier-override
 */
async function updateCustomerTierOverride(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId } = req.params;

    const override = await customerLoyaltyService.updateCustomerTierOverride(companyId, customerId, req.body);

    res.json({ success: true, data: override, message: 'تم تحديث تجاوز العميل بنجاح' });
  } catch (error) {
    console.error('❌ Error updating customer tier override:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء تحديث تجاوز العميل' });
  }
}

/**
 * جلب جدول إشعارات العملاء (الولاء / الكاش باك / الجودة)
 * GET /api/v1/hr/customer-loyalty/notifications/schedule
 */
async function getNotificationSchedule(req, res) {
  try {
    const { companyId } = req.user;
    const scheduleService = require('../services/hr/customerNotificationScheduleService');
    const data = await scheduleService.getSchedules(companyId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error getting notification schedule:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء جلب جدول الإشعارات' });
  }
}

/**
 * تحديث صف من جدول إشعارات العملاء
 * PUT /api/v1/hr/customer-loyalty/notifications/schedule
 */
async function updateNotificationSchedule(req, res) {
  try {
    const { companyId } = req.user;
    const { eventType, ...data } = req.body;
    if (!eventType) {
      return res.status(400).json({ success: false, error: 'eventType مطلوب' });
    }

    const scheduleService = require('../services/hr/customerNotificationScheduleService');
    const updated = await scheduleService.updateSchedule(companyId, eventType, data);

    res.json({ success: true, data: updated, message: 'تم تحديث الجدول بنجاح' });
  } catch (error) {
    console.error('❌ Error updating notification schedule:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء تحديث جدول الإشعارات' });
  }
}

/**
 * ملخص بوابة العميل (نقاط / خصومات / كاش باك / بيانات) لأي عميل
 * GET /api/v1/hr/customer-loyalty/customers/:customerId/portal-summary
 */
async function getCustomerPortalSummary(req, res) {
  try {
    const { companyId } = req.user;
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'معرف العميل مطلوب' });
    }

    const prisma = getSharedPrismaClient();

    const [customer, wallet, progress, autoSettings] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, companyId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          createdAt: true
        }
      }),
      prisma.customerWallet.findFirst({ where: { customerId, companyId, isActive: true } }),
      customerLoyaltyService.getCustomerTierProgress(companyId, customerId),
      autoDiscountService.getSettings(companyId)
    ]);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'العميل غير موجود' });
    }

    const loyaltyRecord = await prisma.customerLoyaltyRecord.findFirst({
      where: { companyId, customerId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      select: { currentPoints: true, totalEarned: true, totalRedeemed: true, joinDate: true }
    });

    let totalCashback = 0;
    if (wallet) {
      const agg = await prisma.walletTransaction.aggregate({
        where: { walletId: wallet.id, type: 'CASHBACK' },
        _sum: { amount: true }
      });
      totalCashback = parseFloat(agg._sum.amount || 0);
    }

    const loyaltySystem = autoSettings?.loyaltySystem || 'TIERS';
    const isAutoDiscount = loyaltySystem === 'AUTO_DISCOUNT' && autoSettings?.activated === true;

    // ملخص الخصم التلقائي (كوبون فعّال + حالة الخصم) — موحّد مع صفحة العميل العامة
    let autoSummary = { activeVoucher: null, status: null };
    if (isAutoDiscount) {
      autoSummary = await autoDiscountService
        .getCustomerAutoDiscountSummary({ companyId, customerId, settings: autoSettings })
        .catch(() => ({ activeVoucher: null, status: null }));
    }
    const activeVoucher = autoSummary.activeVoucher;
    const autoDiscountStatus = autoSummary.status;

    res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          avatar: customer.avatar,
          joinedAt: customer.createdAt
        },
        loyaltySystem,
        loyalty: {
          method: progress?.method || null,
          metricLabel: progress?.metricLabel || 'نقطة',
          currentMetric: progress ? Number(progress.currentMetric) : (loyaltyRecord ? parseFloat(loyaltyRecord.currentPoints) : 0),
          tier: progress?.tier || null,
          nextTier: progress?.nextTier || null,
          rewards: progress?.rewards || { freeShipping: false, discountPercent: 0 },
          points: {
            current: loyaltyRecord ? parseFloat(loyaltyRecord.currentPoints) : 0,
            totalEarned: loyaltyRecord ? parseFloat(loyaltyRecord.totalEarned) : 0,
            totalRedeemed: loyaltyRecord ? parseFloat(loyaltyRecord.totalRedeemed) : 0,
            joinedAt: loyaltyRecord?.joinDate || null
          }
        },
        autoDiscount: isAutoDiscount
          ? {
              discountPercent: Number(autoSettings.discountPercent || 0),
              validityDays: Number(autoSettings.validityDays || 3),
              status: autoDiscountStatus,
              activeVoucher
            }
          : null,
        wallet: {
          balance: wallet ? parseFloat(wallet.balance) : 0,
          totalEarned: wallet ? parseFloat(wallet.totalEarned) : 0,
          totalSpent: wallet ? parseFloat(wallet.totalSpent) : 0,
          totalCashback,
          currency: wallet?.currency || 'EGP'
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting customer portal summary:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء جلب بيانات العميل' });
  }
}

async function getSystemSettings(req, res) {
  try {
    const { companyId } = req.user;
    const settings = await autoDiscountService.getSettings(companyId);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('❌ Error getting loyalty system settings:', error);
    // 🛡️ نرجّع الإعدادات الافتراضية بدل 500 عشان منمنع رسالة "خطأ في جلب البيانات"
    res.json({
      success: true,
      data: {
        system: 'AUTO_DISCOUNT',
        loyaltySystem: 'TIERS',
        enabled: true,
        discountPercent: 10,
        validityDays: 3,
        convertExpiredToCashback: true,
        pointsPerAmount: 5,
        pointsRedemptionValue: 1,
        redeemPointsEnabled: true
      }
    });
  }
}

async function updateSystemSettings(req, res) {
  try {
    const { companyId } = req.user;
    const settings = await autoDiscountService.updateSettings(companyId, req.body);

    // 🚀 لما الضغط على "تفعيل النظام" للمستويات، نطبق المستويات على جميع العملاء فوراً
    //    من غير ما نحبس الـ request (fire-and-forget) عشان الـ backfill ياخد وقته في الخلفية
    let activationResult = null;
    if (req.body.system === 'TIERS' && settings.activated === true) {
      activationResult = { enrolled: 0, updated: 0, background: true };
      customerLoyaltyService.activateTiersForAllCustomers(companyId)
        .then((result) => {
          console.log('✅ [LOYALTY-ACTIVATE] Background tier backfill done:', result);
        })
        .catch((activateError) => {
          console.error('❌ [LOYALTY-ACTIVATE] Tier backfill failed:', activateError.message);
        });
    }

    res.json({
      success: true,
      data: settings,
      message: 'تم تحديث نظام الولاء بنجاح',
      activation: activationResult
    });
  } catch (error) {
    console.error('❌ Error updating loyalty system settings:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء تحديث إعدادات النظام' });
  }
}

/**
 * تحليلات نظام الولاء الحالي (الخصم التلقائي أو المستويات)
 * GET /api/v1/hr/customer-loyalty/system-analytics
 * يعتمد على الـ loyaltySystem المفعّل للشركة:
 *  - AUTO_DISCOUNT: عدد العملاء بالكوبونات (ACTIVE/USED/CONVERTED/EXPIRED)،
 *    وعدد الأوردرات المسلّمة، والعملاء اللي طلبوا قبل التفعيل (لهم أوردر مسلّم بس مفيش كوبون)
 *  - TIERS: عدد العملاء في كل مستوى (من CustomerLoyaltyRecord.tierId)
 */
async function getSystemAnalytics(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    const settings = await autoDiscountService.getSettings(companyId);
    const loyaltySystem = settings?.loyaltySystem || 'TIERS';
    const activatedAt = settings?.loyaltyActivatedAt
      ? new Date(settings.loyaltyActivatedAt)
      : null;

    let data;

    if (loyaltySystem === 'AUTO_DISCOUNT') {
      // ── عدّ الكوبونات حسب الحالة ──
      const [activeVouchers, usedVouchers, convertedVouchers, expiredVouchers, totalDeliveredOrders] =
        await Promise.all([
          prisma.customerLoyaltyVoucher.count({
            where: { companyId, status: 'ACTIVE' }
          }),
          prisma.customerLoyaltyVoucher.count({
            where: { companyId, status: 'USED' }
          }),
          prisma.customerLoyaltyVoucher.count({
            where: { companyId, status: 'CONVERTED' }
          }),
          prisma.customerLoyaltyVoucher.count({
            where: { companyId, status: 'EXPIRED' }
          }),
          prisma.order.count({
            where: { companyId, status: 'DELIVERED' }
          })
        ]);

      // العملاء اللي اتعملهم كوبون على الأقل (اتطبق عليهم النظام)
      const customersWithVouchers = await prisma.customerLoyaltyVoucher.findMany({
        where: { companyId },
        select: { customerId: true },
        distinct: ['customerId']
      });
      const appliedCustomers = customersWithVouchers.length;

      // الأوردرات المسلّمة اللي لسه مأخدتش كوبون خصم (في انتظار تفعيل الخصم)
      // 🐛 نفلتر sourceOrderId في الذاكرة لأن بعض نسخ Prisma بترفض `not: null`
      const ordersWithVoucher = await prisma.customerLoyaltyVoucher.findMany({
        where: { companyId },
        select: { sourceOrderId: true },
        distinct: ['sourceOrderId']
      });
      const orderIdsWithVoucher = new Set(ordersWithVoucher.map((v) => v.sourceOrderId).filter(Boolean));
      const deliveredOrders = await prisma.order.findMany({
        where: { companyId, status: 'DELIVERED' },
        select: { id: true, customerId: true, createdAt: true }
      });
      const waitingForDelivery = deliveredOrders.filter((o) => !orderIdsWithVoucher.has(o.id)).length;

      // العملاء اللي طلبوا (أوردر مسلّم) لكن قبل التفعيل — مفيش كوبون ليهم
      const deliveredCustomerIds = deliveredOrders.map((c) => c.customerId);

      let preActivationCustomers = 0;
      if (activatedAt && deliveredCustomerIds.length > 0) {
        const preActivationIds = deliveredOrders
          .filter((o) => new Date(o.createdAt) < activatedAt)
          .map((c) => c.customerId);
        const withVoucherIds = new Set(customersWithVouchers.map((c) => c.customerId));
        preActivationCustomers = preActivationIds.filter((id) => !withVoucherIds.has(id)).length;
      }

      data = {
        system: 'AUTO_DISCOUNT',
        totalDeliveredOrders,
        appliedCustomers,
        waitingForDelivery,
        activeVouchers,
        usedVouchers,
        convertedVouchers,
        expiredVouchers,
        preActivationCustomers
      };
    } else {
      // ── نظام المستويات: عدد العملاء في كل مستوى ──
      const tiers = await prisma.customerLoyaltyTier.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          nameAr: true,
          color: true,
          priority: true,
          _count: {
            select: {
              customerLoyaltyRecords: {
                where: { companyId, status: 'ACTIVE' }
              }
            }
          }
        },
        orderBy: { priority: 'asc' }
      });

      // العملاء المسجلين في برامج الولاء (بدون مستوى محدد) + إجمالي العملاء
      const enrolledCustomers = await prisma.customerLoyaltyRecord.count({
        where: { companyId, status: 'ACTIVE' }
      });

      data = {
        system: 'TIERS',
        totalEnrolled: enrolledCustomers,
        tiers: tiers.map((t) => ({
          id: t.id,
          name: t.name,
          nameAr: t.nameAr,
          color: t.color,
          priority: t.priority,
          customersCount: t._count.customerLoyaltyRecords
        }))
      };
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error getting loyalty system analytics:', error);
    // 🛡️ لو فشل جلب التحليلات (جدول ناقص في DB قديم، انقطاع اتصال، pool exhausted…)
    // نرجّع بيانات فاضية بدل 500 عشان نمنع ظهور رسالة "خطأ في جلب البيانات"
    // للمستخدم. الـ UI بيعرض "لا توجد بيانات تحليل بعد" بأمان.
    res.json({
      success: true,
      data: {
        system: loyaltySystem === 'AUTO_DISCOUNT' ? 'AUTO_DISCOUNT' : 'TIERS',
        totalDeliveredOrders: 0,
        appliedCustomers: 0,
        waitingForDelivery: 0,
        activeVouchers: 0,
        usedVouchers: 0,
        convertedVouchers: 0,
        expiredVouchers: 0,
        preActivationCustomers: 0,
        totalEnrolled: 0,
        tiers: []
      }
    });
  }
}

module.exports = {
  getPrograms,
  getProgramById,
  createProgram,
  updateProgram,
  getTiers,
  createTier,
  updateTier,
  deleteTier,
  getCustomerRecords,
  enrollCustomer,
  addPoints,
  redeemPoints,
  adjustPoints,
  getTierConfig,
  updateTierConfig,
  getCustomerTierOverride,
  updateCustomerTierOverride,
  getCustomerPortalSummary,
  getCashbackSettings,
  updateCashbackSettings,
  getNotificationSchedule,
  updateNotificationSchedule,
  getSystemSettings,
  updateSystemSettings,
  getSystemAnalytics,
  processExpiredVouchers: async (req, res) => {
    try {
      const result = await autoDiscountService.convertExpiredVouchers();
      res.json({ success: true, data: result, message: `تم تحويل ${result.converted} كوبون منتهي` });
    } catch (error) {
      console.error('❌ Error processing expired vouchers:', error);
      res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء معالجة الكوبونات' });
    }
  },
  backfillVouchers: async (req, res) => {
    try {
      const { companyId } = req.user;
      const result = await autoDiscountService.backfillMissingVouchers(companyId);
      res.json({ success: true, data: result, message: `تم إصدار ${result.issued} كوبون ناقص` });
    } catch (error) {
      console.error('❌ Error backfilling vouchers:', error);
      res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء إصدار الكوبونات الناقصة' });
    }
  }
};
